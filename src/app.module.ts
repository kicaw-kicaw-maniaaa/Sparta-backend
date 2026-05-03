import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './shared/database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { RiskModule } from './modules/risk/risk.module';
import { ReportModule } from './modules/report/report.module';
import { AlertModule } from './modules/alert/alert.module';

@Module({
  imports: [
    // buat global
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    DatabaseModule,

    // Redisnya
    CacheModule.register({
      isGlobal: true,
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),

    // Bull Queue for job processing
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),

    // Feature 
    AuthModule,
    RiskModule,
    ReportModule,
    AlertModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
