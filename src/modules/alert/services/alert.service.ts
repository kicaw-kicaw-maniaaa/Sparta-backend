import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@shared/database/prisma.service';
import {
  CreateAlertDto,
  UpdateAlertStatusDto,
  AlertLevel,
  AlertStatus,
  AlertType,
  AlertAcknowledgeDto,
  AlertDismissDto,
  AlertQueryDto,
  BulkAlertActionDto,
} from '../dtos/alert.dto';

@Injectable()
export class AlertService {
  private readonly logger = new Logger('AlertService');

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new alert
   */
  async createAlert(dto: CreateAlertDto) {
    try {
      // Verify grid exists
      const grid = await this.prisma.riskGrid.findUnique({
        where: { id: dto.gridId },
      });

      if (!grid) {
        throw new BadRequestException(`Grid ${dto.gridId} not found`);
      }

      // Create alert
      const alert = await this.prisma.alert.create({
        data: {
          gridId: dto.gridId,
          type: dto.type,
          level: dto.level,
          title: dto.title,
          message: dto.message,
          details: dto.details,
          previousStatus: dto.previousStatus,
          currentStatus: dto.currentStatus,
          status: 'active',
        },
        include: {
          grid: true,
        },
      });

      this.logger.log(`Alert created: #${alert.id} for grid ${grid.id}`);

      // Create alert history record
      await this.createAlertHistory(alert.id, 'created', 'system', 'Alert created automatically');

      // Send notifications to affected users
      if (dto.affectedUsers && dto.affectedUsers.length > 0) {
        await this.notifyUsers(alert.id, dto.affectedUsers, alert);
      } else {
        // Notify based on user preferences
        await this.notifyByPreference(alert);
      }

      return alert;
    } catch (error) {
      this.logger.error(`Failed to create alert: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all alerts with filters
   */
  async getAlerts(query: AlertQueryDto) {
    const where: any = {};

    if (query.status) where.status = query.status;
    if (query.level) where.level = query.level;
    if (query.type) where.type = query.type;
    if (query.gridId) where.gridId = query.gridId;

    const [alerts, total] = await Promise.all([
      this.prisma.alert.findMany({
        where,
        include: {
          grid: {
            select: {
              id: true,
              latitude: true,
              longitude: true,
            },
          },
          history: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
        orderBy: {
          [query.sortBy]: query.sortOrder,
        },
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.alert.count({ where }),
    ]);

    return {
      data: alerts,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        pages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * Get single alert
   */
  async getAlertById(alertId: number) {
    const alert = await this.prisma.alert.findUnique({
      where: { id: alertId },
      include: {
        grid: true,
        history: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!alert) {
      throw new NotFoundException(`Alert #${alertId} not found`);
    }

    return alert;
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: number, dto: AlertAcknowledgeDto) {
    const alert = await this.getAlertById(alertId);

    if (alert.status === 'acknowledged') {
      throw new BadRequestException('Alert is already acknowledged');
    }

    const updated = await this.prisma.alert.update({
      where: { id: alertId },
      data: {
        status: 'acknowledged',
        acknowledgedBy: dto.acknowledgedBy,
        acknowledgedAt: new Date(),
      },
    });

    await this.createAlertHistory(
      alertId,
      'acknowledged',
      dto.acknowledgedBy,
      dto.notes || 'Alert acknowledged',
    );

    this.logger.log(`Alert #${alertId} acknowledged by ${dto.acknowledgedBy}`);

    return updated;
  }

  /**
   * Dismiss an alert
   */
  async dismissAlert(alertId: number, dto: AlertDismissDto) {
    const alert = await this.getAlertById(alertId);

    if (alert.status === 'dismissed') {
      throw new BadRequestException('Alert is already dismissed');
    }

    const updated = await this.prisma.alert.update({
      where: { id: alertId },
      data: {
        status: 'dismissed',
        dismissedBy: dto.dismissedBy,
        dismissedAt: new Date(),
      },
    });

    await this.createAlertHistory(
      alertId,
      'dismissed',
      dto.dismissedBy,
      dto.reason || 'Alert dismissed',
    );

    this.logger.log(`Alert #${alertId} dismissed by ${dto.dismissedBy}`);

    return updated;
  }

  /**
   * Resolve an alert (status change from acknowledged to resolved)
   */
  async resolveAlert(alertId: number, resolvedBy: string, notes?: string) {
    const alert = await this.getAlertById(alertId);

    const updated = await this.prisma.alert.update({
      where: { id: alertId },
      data: {
        status: 'resolved',
      },
    });

    await this.createAlertHistory(
      alertId,
      'resolved',
      resolvedBy,
      notes || 'Alert resolved',
    );

    this.logger.log(`Alert #${alertId} resolved by ${resolvedBy}`);

    return updated;
  }

  /**
   * Update alert status (bulk operation)
   */
  async bulkUpdateStatus(dto: BulkAlertActionDto, userId: string) {
    const { alertIds, status, notes } = dto;

    const updated = await this.prisma.alert.updateMany({
      where: {
        id: {
          in: alertIds,
        },
      },
      data: {
        status: status as any,
      },
    });

    // Create history for each alert
    for (const alertId of alertIds) {
      await this.createAlertHistory(
        alertId,
        status.toString(),
        userId,
        notes || `Status updated to ${status}`,
      );
    }

    this.logger.log(`Updated ${updated.count} alerts to status: ${status}`);

    return {
      updated: updated.count,
      message: `Successfully updated ${updated.count} alerts`,
    };
  }

  /**
   * Get alert statistics
   */
  async getAlertStats() {
    const [total, active, acknowledged, resolved, dismissed] = await Promise.all([
      this.prisma.alert.count(),
      this.prisma.alert.count({ where: { status: 'active' } }),
      this.prisma.alert.count({ where: { status: 'acknowledged' } }),
      this.prisma.alert.count({ where: { status: 'resolved' } }),
      this.prisma.alert.count({ where: { status: 'dismissed' } }),
    ]);

    const byLevelData = await this.prisma.alert.groupBy({
      by: ['level'],
      _count: true,
    });

    const byTypeData = await this.prisma.alert.groupBy({
      by: ['type'],
      _count: true,
    });

    const byLevel = byLevelData.reduce(
      (acc, item) => {
        acc[item.level] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    const byType = byTypeData.reduce(
      (acc, item) => {
        acc[item.type] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Calculate average resolution time (for resolved alerts)
    const resolvedAlerts = await this.prisma.alert.findMany({
      where: { status: 'resolved' },
      select: { createdAt: true, updatedAt: true },
    });

    const avgResolutionTime =
      resolvedAlerts.length > 0
        ? resolvedAlerts.reduce((sum, alert) => {
            return (
              sum +
              (alert.updatedAt.getTime() - alert.createdAt.getTime()) / (1000 * 60)
            );
          }, 0) / resolvedAlerts.length
        : 0;

    return {
      totalAlerts: total,
      activeAlerts: active,
      acknowledgedAlerts: acknowledged,
      resolvedAlerts: resolved,
      dismissedAlerts: dismissed,
      byLevel: {
        info: byLevel['info'] || 0,
        warning: byLevel['warning'] || 0,
        danger: byLevel['danger'] || 0,
        critical: byLevel['critical'] || 0,
      },
      byType,
      avgResolutionTime: Math.round(avgResolutionTime * 100) / 100,
    };
  }

  /**
   * Get alerts by location/region
   */
  async getAlertsByRegion(latitude: number, longitude: number, radiusKm: number = 50) {
    const grids = await this.prisma.riskGrid.findMany({
      where: {
        latitude: {
          gte: latitude - radiusKm / 110,
          lte: latitude + radiusKm / 110,
        },
        longitude: {
          gte: longitude - radiusKm / 110,
          lte: longitude + radiusKm / 110,
        },
      },
      select: { id: true },
    });

    const gridIds = grids.map((g) => g.id);

    if (gridIds.length === 0) {
      return { data: [], count: 0 };
    }

    const alerts = await this.prisma.alert.findMany({
      where: {
        gridId: { in: gridIds },
        status: { in: ['active', 'acknowledged'] },
      },
      include: {
        grid: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: alerts,
      count: alerts.length,
      affectedGrids: gridIds.length,
    };
  }

  /**
   * Get active alerts for a user based on preferences
   */
  async getAlertsForUser(userId: string) {
    const preference = await this.prisma.userNotificationPreference.findUnique({
      where: { userId },
    });

    if (!preference) {
      return { data: [], message: 'No preferences found' };
    }

    const where: any = {
      status: { in: ['active', 'acknowledged'] },
      level: { in: preference.notificationLevels || ['warning', 'danger', 'critical'] },
    };

    if (!preference.notifyAllGrids && preference.favoriteGrids && preference.favoriteGrids.length > 0) {
      where.gridId = { in: preference.favoriteGrids };
    }

    const alerts = await this.prisma.alert.findMany({
      where,
      include: {
        grid: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: alerts,
      count: alerts.length,
    };
  }

  /**
   * Create alert history record
   */
  private async createAlertHistory(
    alertId: number,
    action: string,
    performedBy: string,
    notes?: string,
  ) {
    try {
      await this.prisma.alertHistory.create({
        data: {
          alertId,
          action,
          performedBy,
          notes,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create alert history: ${error.message}`);
    }
  }

  /**
   * Notify users based on their preferences
   */
  private async notifyByPreference(alert: any) {
    try {
      // Find users with applicable preferences
      const preferences = await this.prisma.userNotificationPreference.findMany({
        where: {
          notificationLevels: {
            hasSome: [alert.level],
          },
        },
      });

      for (const pref of preferences) {
        // Check if user wants notifications for this grid
        if (
          pref.notifyAllGrids ||
          (pref.favoriteGrids && pref.favoriteGrids.includes(alert.gridId))
        ) {
          // Send notifications via configured channels
          if (pref.emailNotifications) {
            await this.sendEmailNotification(pref.userId, alert);
          }
          if (pref.smsNotifications) {
            await this.sendSmsNotification(pref.userId, alert);
          }
          if (pref.pushNotifications) {
            await this.sendPushNotification(pref.userId, alert);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to notify by preference: ${error.message}`);
    }
  }

  /**
   * Notify specific users
   */
  private async notifyUsers(alertId: number, userIds: string[], alert: any) {
    for (const userId of userIds) {
      const pref = await this.prisma.userNotificationPreference.findUnique({
        where: { userId },
      });

      if (pref && pref.notificationLevels.includes(alert.level)) {
        if (pref.emailNotifications) {
          await this.sendEmailNotification(userId, alert);
        }
        if (pref.smsNotifications) {
          await this.sendSmsNotification(userId, alert);
        }
        if (pref.pushNotifications) {
          await this.sendPushNotification(userId, alert);
        }
      }
    }
  }

  /**
   * Send email notification (placeholder)
   */
  private async sendEmailNotification(userId: string, alert: any) {
    this.logger.debug(`Sending email notification to ${userId} for alert #${alert.id}`);
    // TODO: Implement email service integration
  }

  /**
   * Send SMS notification (placeholder)
   */
  private async sendSmsNotification(userId: string, alert: any) {
    this.logger.debug(`Sending SMS notification to ${userId} for alert #${alert.id}`);
    // TODO: Implement SMS service integration
  }

  /**
   * Send push notification (placeholder)
   */
  private async sendPushNotification(userId: string, alert: any) {
    this.logger.debug(`Sending push notification to ${userId} for alert #${alert.id}`);
    // TODO: Implement push service integration
  }
}
