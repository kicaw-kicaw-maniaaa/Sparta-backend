import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

@Injectable()
export class ReportAggregationQueueService {
  private readonly logger = new Logger('ReportAggregationQueueService');

  constructor(
    @InjectQueue('report-aggregation')
    private reportAggregationQueue: Queue,
  ) {}

  async triggerAggregation(gridIds?: number[]) {
    try {
      const job = await this.reportAggregationQueue.add(
        'aggregate',
        { gridIds },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      this.logger.log(`Aggregation job queued: ${job.id}`);
      return job;
    } catch (error) {
      this.logger.error(`Failed to queue aggregation job: ${error.message}`);
      throw error;
    }
  }

  /**
   * Scheduled job
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduledAggregation() {
    this.logger.log('Starting scheduled report aggregation (2 AM)...');
    await this.triggerAggregation();
  }

  /**
   * Scheduled job - hourly
   */
  @Cron(CronExpression.EVERY_HOUR)
  async hourlyAggregation() {
    this.logger.debug('Running hourly report aggregation check...');
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: number) {
    const job = await this.reportAggregationQueue.getJob(jobId);
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      state: await job.getState(),
      progress: job.progress(),
      attempts: job.attemptsMade,
      failedReason: job.failedReason,
      data: job.data,
    };
  }

  async getQueueStats() {
    const counts = await this.reportAggregationQueue.getJobCounts();
    return {
      active: counts.active,
      waiting: counts.waiting,
      completed: counts.completed,
      failed: counts.failed,
      delayed: counts.delayed,
    };
  }

  async clearFailedJobs() {
    const failed = await this.reportAggregationQueue.getFailed();
    for (const job of failed) {
      await job.remove();
    }
    this.logger.log(`Cleared ${failed.length} failed jobs`);
    return failed.length;
  }
}
