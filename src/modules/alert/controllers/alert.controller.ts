import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Req,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@common/guards/auth.guard';
import { AlertService } from '../services/alert.service';
import {
  CreateAlertDto,
  UpdateAlertStatusDto,
  AlertAcknowledgeDto,
  AlertDismissDto,
  AlertQueryDto,
  BulkAlertActionDto,
} from '../dtos/alert.dto';

@ApiTags('Alerts')
@Controller('alerts')
export class AlertController {
  constructor(private readonly alertService: AlertService) {}

  /**
   * Create a new alert
   */
  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create alert',
    description: 'Create new alert (typically via automated triggers)',
  })
  async createAlert(@Body() dto: CreateAlertDto) {
    return this.alertService.createAlert(dto);
  }

  /**
   * Get all alerts with filters
   */
  @Get()
  @ApiOperation({
    summary: 'List alerts',
    description: 'Get paginated list of alerts with optional filters',
  })
  async getAlerts(
    @Query() query: AlertQueryDto,
  ) {
    return this.alertService.getAlerts(query);
  }

  /**
   * Get single alert
   */
  @Get(':alertId')
  @ApiOperation({
    summary: 'Get alert details',
    description: 'Retrieve specific alert with full history',
  })
  async getAlert(@Param('alertId', ParseIntPipe) alertId: number) {
    return this.alertService.getAlertById(alertId);
  }

  /**
   * Acknowledge alert
   */
  @Post(':alertId/acknowledge')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Acknowledge alert',
    description: 'Mark alert as acknowledged by user',
  })
  async acknowledgeAlert(
    @Param('alertId', ParseIntPipe) alertId: number,
    @Body() dto: AlertAcknowledgeDto,
  ) {
    return this.alertService.acknowledgeAlert(alertId, dto);
  }

  /**
   * Dismiss alert
   */
  @Post(':alertId/dismiss')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Dismiss alert',
    description: 'Mark alert as dismissed by user',
  })
  async dismissAlert(
    @Param('alertId', ParseIntPipe) alertId: number,
    @Body() dto: AlertDismissDto,
  ) {
    return this.alertService.dismissAlert(alertId, dto);
  }

  /**
   * Resolve alert
   */
  @Post(':alertId/resolve')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Resolve alert',
    description: 'Mark alert as resolved',
  })
  async resolveAlert(
    @Param('alertId', ParseIntPipe) alertId: number,
    @Body() dto: { notes?: string },
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    return this.alertService.resolveAlert(alertId, userId, dto.notes);
  }

  /**
   * Bulk update alert status
   */
  @Patch('/bulk/status')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Bulk update alerts',
    description: 'Update status for multiple alerts at once',
  })
  async bulkUpdateStatus(
    @Body() dto: BulkAlertActionDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    return this.alertService.bulkUpdateStatus(dto, userId);
  }

  /**
   * Get alert statistics
   */
  @Get('stats/overview')
  @ApiOperation({
    summary: 'Get alert statistics',
    description: 'Get overall alert statistics (counts, averages, trends)',
  })
  async getAlertStats() {
    return this.alertService.getAlertStats();
  }

  /**
   * Get alerts by region
   */
  @Get('region/nearby')
  @ApiOperation({
    summary: 'Get nearby alerts',
    description: 'Get alerts in a geographic region',
  })
  async getAlertsByRegion(
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
    @Query('radius') radius?: number,
  ) {
    return this.alertService.getAlertsByRegion(latitude, longitude, radius);
  }

  /**
   * Get alerts for authenticated user
   */
  @Get('user/my-alerts')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get my alerts',
    description: 'Get alerts based on user preferences',
  })
  async getMyAlerts(@Req() req: any) {
    const userId = req.user.sub;
    return this.alertService.getAlertsForUser(userId);
  }
}
