import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@common/guards/auth.guard';
import { ReportService } from '../services/report.service';
import { CreateReportDto, ValidateReportDto } from '../dtos/create-report.dto';

@ApiTags('Reports')
@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  /**
   * Submit a new report
   */
  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Submit a new report',
    description: 'Community members can submit new disaster reports with location and details',
  })
  async submitReport(@Req() req: any, @Body() dto: CreateReportDto) {
    const userId = req.user.sub; // JWT subject (userId)
    return this.reportService.submitReport(userId, dto);
  }

  /**
   * Get all reports (filters)
   */
  @Get()
  @ApiOperation({
    summary: 'List all reports',
    description: 'Get paginated list of reports with optional filters',
  })
  async getReports(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    return this.reportService.getReports({
      status,
      type,
      limit,
      offset,
    });
  }

  /**
   * Get single report
   */
  @Get(':reportId')
  @ApiOperation({
    summary: 'Get report details',
    description: 'Retrieve a specific report with validation history',
  })
  async getReport(@Param('reportId', ParseIntPipe) reportId: number) {
    return this.reportService.getReportById(reportId);
  }

  /**
   * Validate a report (admin/validator only)
   */
  @Post(':reportId/validate')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Validate a report',
    description: 'Admin or validator marks whether report is accurate',
  })
  async validateReport(
    @Param('reportId', ParseIntPipe) reportId: number,
    @Body() dto: ValidateReportDto,
    @Req() req: any,
  ) {
    const validatorId = req.user.sub;
    return this.reportService.validateReport(reportId, validatorId, dto);
  }

  /**
   * Get report aggregation for a grid
   */
  @Get('aggregation/:gridId')
  @ApiOperation({
    summary: 'Get report aggregation for grid',
    description: 'Get 30-day rolling report statistics for a risk grid',
  })
  async getReportAggregation(
    @Param('gridId', ParseIntPipe) gridId: number,
  ) {
    return this.reportService.getReportAggregation(gridId);
  }

  /**
   * Get overall report statistics
   */
  @Get('stats/overview')
  @ApiOperation({
    summary: 'Get report statistics',
    description: 'Get overall statistics on reports (total, by status, by type)',
  })
  async getReportStats() {
    return this.reportService.getReportStats();
  }

  /**
   * Delete a report (admin or owner only)
   */
  @Delete(':reportId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a report',
    description: 'Remove a report from the system (admin or report owner only)',
  })
  async deleteReport(
    @Param('reportId', ParseIntPipe) reportId: number,
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    return this.reportService.deleteReport(reportId, userId);
  }
}
