import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Application is healthy' })
  getHealth() {
    return this.appService.getHealth();
  }

  @Get()
  @ApiOperation({ summary: 'Get API information' })
  @ApiResponse({ status: 200, description: 'API information' })
  getInfo() {
    return this.appService.getInfo();
  }
}
