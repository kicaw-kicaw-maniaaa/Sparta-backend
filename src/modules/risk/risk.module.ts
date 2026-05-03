import { Module } from '@nestjs/common';
import { RiskController } from './controllers/risk.controller';
import { RiskEngineService } from './services/risk-engine.service';

@Module({
  controllers: [RiskController],
  providers: [RiskEngineService],
  exports: [RiskEngineService],
})
export class RiskModule {}
