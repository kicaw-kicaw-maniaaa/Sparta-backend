import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AlertService } from './services/alert.service';
import { AlertController } from './controllers/alert.controller';
import { AlertGateway } from './gateways/alert.gateway';
import { AlertProcessor } from './jobs/alert.processor';
import { PrismaService } from '@shared/database/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
    }),
    BullModule.registerQueue({
      name: 'alerts',
    }),
  ],
  providers: [
    AlertService,
    AlertGateway,
    AlertProcessor,
    PrismaService,
  ],
  controllers: [AlertController],
  exports: [AlertService, AlertGateway],
})
export class AlertModule {}
