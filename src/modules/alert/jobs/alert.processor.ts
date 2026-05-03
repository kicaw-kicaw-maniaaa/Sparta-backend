import {
  Processor,
  Process,
  OnWorkerEvent,
} from '@nestjs/bull';
import { Job } from 'bull';
import { Logger, Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/database/prisma.service';
import { AlertGateway } from '../gateways/alert.gateway';
import { AlertType, AlertLevel } from '../dtos/alert.dto';

@Processor('alerts')
@Injectable()
export class AlertProcessor {
  private readonly logger = new Logger('AlertProcessor');

  constructor(
    private prisma: PrismaService,
    private alertGateway: AlertGateway,
  ) {}

  /**
   * Process risk status change and create alert
   */
  @Process('risk_status_change')
  async handleRiskStatusChange(job: Job<any>) {
    this.logger.log(`Processing risk status change alert: ${job.id}`);

    try {
      const { gridId, previousCategory, currentCategory, previousScore, currentScore } = job.data;

      // Get grid information
      const grid = await this.prisma.riskGrid.findUnique({
        where: { id: gridId },
      });

      if (!grid) {
        throw new Error(`Grid ${gridId} not found`);
      }

      // Determine alert level based on risk category
      let alertLevel: AlertLevel;
      if (currentCategory === 'Bahaya') alertLevel = AlertLevel.CRITICAL;
      else if (currentCategory === 'Siaga') alertLevel = AlertLevel.DANGER;
      else if (currentCategory === 'Waspada') alertLevel = AlertLevel.WARNING;
      else alertLevel = AlertLevel.INFO;

      // Create alert
      const alert = await this.prisma.alert.create({
        data: {
          gridId,
          type: AlertType.RISK_LEVEL_CHANGE,
          level: alertLevel,
          title: `Risk Level Change: ${previousCategory} → ${currentCategory}`,
          message: `Grid risk level changed to ${currentCategory} (Score: ${currentScore}/100)`,
          details: `Previous Score: ${previousScore}, Current Score: ${currentScore}`,
          previousStatus: previousCategory,
          currentStatus: currentCategory,
          status: 'active',
        },
      });

      this.logger.log(`Alert created #${alert.id} for grid ${gridId}: ${previousCategory} → ${currentCategory}`);

      // Broadcast : WebSocket
      this.alertGateway.broadcastAlert(alert, [gridId]);

      // Create alert history
      await this.prisma.alertHistory.create({
        data: {
          alertId: alert.id,
          action: 'created',
          performedBy: 'system',
          notes: 'Alert created from risk status change',
        },
      });

      // Notify users
      await this.notifyAffectedUsers(gridId, alert, alertLevel);

      return {
        success: true,
        alertId: alert.id,
        gridId,
        riskChange: `${previousCategory} → ${currentCategory}`,
      };
    } catch (error) {
      this.logger.error(`Failed to process risk status change: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process threshold exceeded alert
   */
  @Process('threshold_exceeded')
  async handleThresholdExceeded(job: Job<any>) {
    this.logger.log(`Processing threshold exceeded alert: ${job.id}`);

    try {
      const { gridId, metric, value, threshold } = job.data;

      const alert = await this.prisma.alert.create({
        data: {
          gridId,
          type: AlertType.THRESHOLD_EXCEEDED,
          level: AlertLevel.WARNING,
          title: `${metric} Threshold Exceeded`,
          message: `${metric} exceeded threshold: ${value} > ${threshold}`,
          details: `Metric: ${metric}, Value: ${value}, Threshold: ${threshold}`,
          status: 'active',
        },
      });

      this.logger.log(`Alert created #${alert.id}: ${metric} threshold exceeded`);

      // Broadcast via WebSocket
      this.alertGateway.broadcastAlert(alert, [gridId]);

      return {
        success: true,
        alertId: alert.id,
      };
    } catch (error) {
      this.logger.error(`Failed to process threshold exceeded: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process report validation alert
   */
  @Process('report_validated')
  async handleReportValidated(job: Job<any>) {
    this.logger.log(`Processing report validation alert: ${job.id}`);

    try {
      const { reportId, gridId, status, validCount } = job.data;

      // Only create alert if report valid
      if (status !== 'valid') {
        return { skipped: true, reason: 'Report not valid' };
      }

      const alert = await this.prisma.alert.create({
        data: {
          gridId,
          type: AlertType.REPORT_VALIDATION,
          level: AlertLevel.INFO,
          title: `Report Validated`,
          message: `Report #${reportId} has been validated (${validCount} confirmations)`,
          details: `Multiple validators have confirmed this report as accurate`,
          status: 'active',
        },
      });

      this.logger.log(`Alert created #${alert.id}: Report #${reportId} validated`);

      // Broadcast : WebSocket
      this.alertGateway.broadcastAlert(alert, [gridId]);

      return {
        success: true,
        alertId: alert.id,
      };
    } catch (error) {
      this.logger.error(`Failed to process report validation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process maintenance notification
   */
  @Process('maintenance')
  async handleMaintenance(job: Job<any>) {
    this.logger.log(`Processing maintenance alert: ${job.id}`);

    try {
      const { title, message, affectedGrids, severity = 'info' } = job.data;

      const alerts = [];

      for (const gridId of affectedGrids) {
        const alert = await this.prisma.alert.create({
          data: {
            gridId,
            type: AlertType.MAINTENANCE,
            level: severity as AlertLevel,
            title,
            message,
            status: 'active',
          },
        });

        alerts.push(alert);
      }

      this.logger.log(`Created ${alerts.length} maintenance alerts`);

      for (const alert of alerts) {
        this.alertGateway.broadcastAlert(alert, [alert.gridId]);
      }

      return {
        success: true,
        alertsCreated: alerts.length,
      };
    } catch (error) {
      this.logger.error(`Failed to process maintenance alert: ${error.message}`);
      throw error;
    }
  }

  /**
   * Notify affected users
   */
  private async notifyAffectedUsers(gridId: number, alert: any, level: AlertLevel) {
    try {
      const preferences = await this.prisma.userNotificationPreference.findMany({
        where: {
          notificationLevels: {
            hasSome: [level],
          },
        },
      });

      for (const pref of preferences) {
        if (
          pref.notifyAllGrids ||
          (pref.favoriteGrids && pref.favoriteGrids.includes(gridId))
        ) {
          // Queue notifications
          if (pref.emailNotifications) {
            this.logger.debug(`Queuing email for user ${pref.userId}`);
            // TODO: Queue email job dengan user email dan alert details
          }
          if (pref.smsNotifications) {
            this.logger.debug(`Queuing SMS for user ${pref.userId}`);
            // TODO: Queue SMS job dengan user phone dan alert details
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to notify users: ${error.message}`);
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Alert job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`Alert job ${job.id} failed: ${err.message}`);
  }

  @OnWorkerEvent('error')
  onError(err: Error) {
    this.logger.error(`Alert processor error: ${err.message}`);
  }
}
