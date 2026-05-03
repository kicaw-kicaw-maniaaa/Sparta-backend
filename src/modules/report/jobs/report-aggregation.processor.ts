import {
  Processor,
  Process,
  OnWorkerEvent,
} from '@nestjs/bull';
import { Job } from 'bull';
import { Logger, Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/database/prisma.service';

@Processor('report-aggregation')
@Injectable()
export class ReportAggregationProcessor {
  private readonly logger = new Logger('ReportAggregationProcessor');

  constructor(private prisma: PrismaService) {}

  @Process('aggregate')
  async handleAggregation(job: Job<{ gridIds?: number[] }>) {
    this.logger.log('Starting report aggregation job...');

    try {
      const gridIds = job.data?.gridIds;
    // Grids processing
      let grids;
      if (gridIds && gridIds.length > 0) {
        grids = await this.prisma.riskGrid.findMany({
          where: { id: { in: gridIds } },
          select: { id: true },
        });
      } else {
        grids = await this.prisma.riskGrid.findMany({
          select: { id: true },
        });
      }

      this.logger.log(`Processing ${grids.length} grids for report aggregation`);

      let successCount = 0;
      let errorCount = 0;

      for (const grid of grids) {
        try {
          await this.aggregateReportsForGrid(grid.id);
          successCount++;

          job.progress((successCount / grids.length) * 100);
        } catch (error) {
          this.logger.error(
            `Failed to aggregate reports for grid ${grid.id}: ${error.message}`,
          );
          errorCount++;
        }
      }

      this.logger.log(
        `Report aggregation completed: ${successCount} successful, ${errorCount} failed`,
      );

      return {
        success: true,
        processed: grids.length,
        successCount,
        errorCount,
      };
    } catch (error) {
      this.logger.error(`Report aggregation job failed: ${error.message}`);
      throw error;
    }
  }


  private async aggregateReportsForGrid(gridId: number) {
    const windowEnd = new Date();
    const windowStart = new Date(windowEnd.getTime() - 30 * 24 * 60 * 60 * 1000);

    const reports = await this.prisma.report.findMany({
      where: {
        status: 'valid',
        createdAt: {
          gte: windowStart,
          lte: windowEnd,
        },
        location: {
          OR: [
            {
              riskGrids: {
                some: {
                  gridId,
                },
              },
            },
            {
              latitude: {
                gte: undefined,
                lte: undefined,
              },
              longitude: {
                gte: undefined,
                lte: undefined,
              },
            },
          ],
        },
      },
      include: {
        location: true,
      },
    });

    const grid = await this.prisma.riskGrid.findUnique({
      where: { id: gridId },
    });

    const filteredReports = reports.filter((report) => {
      const distance = this.calculateDistance(
        grid.latitude,
        grid.longitude,
        report.location.latitude,
        report.location.longitude,
      );
      return distance <= 11;
    });

    const totalReports = filteredReports.length;
    const validReports = filteredReports.filter(
      (r) => r.status === 'valid',
    ).length;
    const invalidReports = filteredReports.filter(
      (r) => r.status === 'invalid',
    ).length;
    // calculation of factor
    const reportFactor = Math.min(Math.log(validReports + 1) / Math.log(11), 1.0);

    // Count by type
    const topReportTypes = filteredReports.reduce(
      (acc, report) => {
        acc[report.type] = (acc[report.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Find most common report type
    const mostCommonType = Object.keys(topReportTypes).reduce((a, b) =>
      topReportTypes[a] > topReportTypes[b] ? a : b,
    );

    const aggregation = await this.prisma.reportAggregation.upsert({
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
        mostCommonReportType: mostCommonType,
        lastUpdated: new Date(),
      },
      update: {
        totalReports,
        validReports,
        invalidReports,
        reportFactor,
        topReportTypes,
        mostCommonReportType: mostCommonType,
        lastUpdated: new Date(),
      },
    });

    this.logger.debug(
      `Grid ${gridId}: ${totalReports} reports, factor=${reportFactor.toFixed(2)}`,
    );

    return aggregation;
  }

  /**
   * Calculate distance between two coordinates in kilometers
   * Using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`Job ${job.id} failed: ${err.message}`);
  }

  @OnWorkerEvent('error')
  onError(err: Error) {
    this.logger.error(`Job processor error: ${err.message}`);
  }
}
