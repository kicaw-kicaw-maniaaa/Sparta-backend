import { Controller, Post, Get, Param, Query, UseGuards, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RiskEngineService } from '../services/risk-engine.service';
import { AuthGuard } from '@common/guards/auth.guard';

@ApiTags('Risk')
@Controller('risk')
export class RiskController {
  constructor(private riskEngineService: RiskEngineService) {}

  @Post('calculate/:gridId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Calculate risk score for a grid' })
  @ApiResponse({
    status: 200,
    description: 'Risk calculation completed',
    schema: {
      example: {
        gridId: 1,
        score: 68,
        category: 'Siaga',
        factors: {
          rainfall: 0.45,
          slope: 0.32,
          riverDistance: 0.68,
          historicalFrequency: 0.2,
          reportFactor: 0.15,
        },
        topFactors: [
          { name: 'riverDistance', value: 0.68, contribution: 10 },
          { name: 'rainfall', value: 0.45, contribution: 9 },
          { name: 'slope', value: 0.32, contribution: 6 },
        ],
        timestamp: '2026-05-02T13:30:00Z',
        statusChanged: true,
        previousScore: 45,
        previousCategory: 'Waspada',
      },
    },
  })
  async calculateRisk(@Param('gridId') gridId: string) {
    return this.riskEngineService.calculateRiskScore(parseInt(gridId));
  }

  @Get('grid')
  @ApiOperation({ summary: 'Get all grids with current risk scores' })
  @ApiResponse({
    status: 200,
    description: 'List of grids with risk data',
  })
  async getGrids(
    @Query('bbox') bbox?: string,
    @Query('region') region?: string,
    @Query('category') category?: string,
  ) {
    let filters: any = {};

    if (region) {
      filters.region = region;
    }

    if (category) {
      filters.riskLogs = {
        some: {
          category,
        },
      };
    }

    const grids = await this.riskEngineService.getAllGridsWithRisks();

    // Format as GeoJSON
    return {
      type: 'FeatureCollection',
      features: grids.map((grid) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [grid.longitude, grid.latitude],
        },
        properties: {
          gridId: grid.id,
          region: grid.region,
          score: grid.riskLogs?.[0]?.score || 0,
          category: grid.riskLogs?.[0]?.category || 'Aman',
          lastUpdate: grid.riskLogs?.[0]?.calculatedAt,
        },
      })),
    };
  }

  @Get('grid/:gridId')
  @ApiOperation({ summary: 'Get detailed risk information for a specific grid' })
  @ApiResponse({
    status: 200,
    description: 'Grid detail with full risk breakdown',
  })
  async getGridDetail(@Param('gridId') gridId: string) {
    const riskData = await this.riskEngineService.calculateRiskScore(parseInt(gridId));
    return riskData;
  }
}
