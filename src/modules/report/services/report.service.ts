import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@shared/database/prisma.service';
import { CreateReportDto, ValidateReportDto } from '../dtos/create-report.dto';

@Injectable()
export class ReportService {
  private readonly logger = new Logger('ReportService');

  constructor(private prisma: PrismaService) {}
  
  async submitReport(userId: string, dto: CreateReportDto) {
    try {
      let location = await this.prisma.location.findFirst({
        where: {
          latitude: dto.latitude,
          longitude: dto.longitude,
        },
      });

      if (!location) {
        location = await this.prisma.location.create({
          data: {
            latitude: dto.latitude,
            longitude: dto.longitude,
            geom: JSON.stringify({
              type: 'Point',
              coordinates: [dto.longitude, dto.latitude],
            }),
          },
        });
      }

      const report = await this.prisma.report.create({
        data: {
          userId,
          locationId: location.id,
          type: dto.type,
          description: dto.description,
          photoUrl: dto.photoUrl,
          status: 'pending', // Default status
        },
        include: {
          user: {
            select: { name: true, email: true },
          },
          location: true,
        },
      });

      this.logger.log(`Report submitted by ${userId}: #${report.id}`);
      await this.triggerRiskRecalculation(location.latitude, location.longitude);

      return {
        id: report.id,
        userId: report.userId,
        locationId: report.locationId,
        type: report.type,
        description: report.description,
        photoUrl: report.photoUrl,
        status: report.status,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to submit report: ${error.message}`);
      throw error;
    }
  }

  async getReports(filters?: {
    status?: string;
    type?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = filters?.limit || 20;
    const offset = filters?.offset || 0;

    const where: any = {};

    if (filters?.status) where.status = filters.status;
    if (filters?.type) where.type = filters.type;
    if (filters?.userId) where.userId = filters.userId;

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        include: {
          user: { select: { name: true, email: true } },
          location: true,
          validations: {
            include: {
              validator: { select: { name: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.report.count({ where }),
    ]);

    return {
      data: reports,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getReportById(reportId: number) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        user: { select: { name: true, email: true } },
        location: true,
        validations: {
          include: {
            validator: { select: { name: true, email: true } },
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException(`Report #${reportId} not found`);
    }

    return report;
  }
  async validateReport(
    reportId: number,
    validatorId: string,
    dto: ValidateReportDto,
  ) {
    const report = await this.getReportById(reportId);

    const existingValidation = await this.prisma.reportValidation.findFirst({
      where: {
        reportId,
        validatorId,
      },
    });

    if (existingValidation) {
      throw new BadRequestException(
        'You have already validated this report',
      );
    }

    const validation = await this.prisma.reportValidation.create({
      data: {
        reportId,
        validatorId,
        status: dto.status,
        notes: dto.notes,
      },
    });

    const validations = await this.prisma.reportValidation.findMany({
      where: { reportId },
    });

    const validCount = validations.filter(
      (v) => v.status === 'sesuai',
    ).length;
    const invalidCount = validations.filter(
      (v) => v.status === 'tidak_sesuai',
    ).length;

    let newStatus = 'pending';
    if (validCount >= 2) newStatus = 'valid';
    else if (invalidCount >= 1) newStatus = 'invalid';

    if (newStatus !== report.status) {
      await this.prisma.report.update({
        where: { id: reportId },
        data: { status: newStatus },
      });

      this.logger.log(`Report #${reportId} status updated to: ${newStatus}`);

      if (newStatus === 'valid') {
        await this.triggerRiskRecalculation(
          report.location.latitude,
          report.location.longitude,
        );
      }
    }

    return validation;
  }

  async getReportAggregation(gridId: number) {
    const windowEnd = new Date();
    const windowStart = new Date(windowEnd.getTime() - 30 * 24 * 60 * 60 * 1000);

    let aggregation = await this.prisma.reportAggregation.findFirst({
      where: {
        gridId,
        windowStart: { lte: windowStart },
        windowEnd: { gte: windowEnd },
      },
    });

    if (!aggregation) {
      const reports = await this.prisma.report.findMany({
        where: {
          status: 'valid',
          createdAt: {
            gte: windowStart,
            lte: windowEnd,
          },
        },
      });

      const totalReports = reports.length;
      const validReports = reports.filter((r) => r.status === 'valid').length;
      const invalidReports = reports.filter(
        (r) => r.status === 'invalid',
      ).length;

      const reportFactor = Math.min(totalReports / 10, 1.0);

      const topReportTypes = reports.reduce(
        (acc, report) => {
          acc[report.type] = (acc[report.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      aggregation = await this.prisma.reportAggregation.upsert({
        where: {
          gridId_windowStart_windowEnd: {
            gridId,
            windowStart,
            windowEnd,
          },
        },
        create: {
          gridId,
          windowStart,
          windowEnd,
          totalReports,
          validReports,
          invalidReports,
          reportFactor,
          topReportTypes,
        },
        update: {
          totalReports,
          validReports,
          invalidReports,
          reportFactor,
          topReportTypes,
          lastUpdated: new Date(),
        },
      });
    }

    return aggregation;
  }

  async getReportStats() {
    const [total, byStatus, pending, valid, invalid] = await Promise.all([
      this.prisma.report.count(),
      this.prisma.report.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.report.count({ where: { status: 'pending' } }),
      this.prisma.report.count({ where: { status: 'valid' } }),
      this.prisma.report.count({ where: { status: 'invalid' } }),
    ]);

    const byTypeData = await this.prisma.report.groupBy({
      by: ['type'],
      _count: true,
    });

    const byType = byTypeData.reduce(
      (acc, item) => {
        acc[item.type] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    const statusMap = byStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalReports: total,
      validReports: valid,
      invalidReports: invalid,
      pendingReports: pending,
      byType,
      byStatus: statusMap,
    };
  }

  private async triggerRiskRecalculation(latitude: number, longitude: number) {
    try {
      const nearbyGrids = await this.prisma.riskGrid.findMany({
        where: {
          latitude: {
            gte: latitude - 0.1,
            lte: latitude + 0.1,
          },
          longitude: {
            gte: longitude - 0.1,
            lte: longitude + 0.1,
          },
        },
        select: { id: true },
      });

      this.logger.log(
        `Triggering risk recalculation for ${nearbyGrids.length} nearby grids`,
      );
      for (const grid of nearbyGrids) {
        this.logger.debug(`Grid ${grid.id} marked for recalculation`);
      }
    } catch (error) {
      this.logger.error(`Failed to trigger risk recalculation: ${error.message}`);
    }
  }

  async deleteReport(reportId: number, userId: string) {
    const report = await this.getReportById(reportId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (
      report.userId !== userId &&
      !['superadmin', 'admin_daerah'].includes(user.role.name)
    ) {
      throw new ForbiddenException('You cannot delete this report');
    }

    await this.prisma.report.delete({
      where: { id: reportId },
    });

    this.logger.log(`Report #${reportId} deleted by ${userId}`);

    return { message: 'Report deleted successfully' };
  }
}
