import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { ReportService } from './services/report.service';
import { ReportAggregationQueueService } from './services/report-aggregation-queue.service';
import { ReportController } from './controllers/report.controller';
import { ReportAggregationProcessor } from './jobs/report-aggregation.processor';
import { PrismaService } from '@shared/database/prisma.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.registerQueue({
      name: 'report-aggregation',
    }),
  ],
  providers: [
    ReportService,
    ReportAggregationQueueService,
    ReportAggregationProcessor,
    PrismaService,
  ],
  controllers: [ReportController],
  exports: [ReportService, ReportAggregationQueueService],
})
export class ReportModule {}
