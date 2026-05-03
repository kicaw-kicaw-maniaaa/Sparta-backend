import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { PrismaService } from '@shared/database/prisma.service';
import { RiskCalculationResponseDto, RiskFactorsDto } from '../dtos/risk-calculation.dto';

@Injectable()
export class RiskEngineService {
  private readonly logger = new Logger('RiskEngineService');

  // Default weights (can be overridden via environment variables)
  private readonly weights = {
    rainfall: parseFloat(process.env.RISK_RAINFALL_WEIGHT || '0.2'),
    slope: parseFloat(process.env.RISK_SLOPE_WEIGHT || '0.2'),
    riverDistance: parseFloat(process.env.RISK_RIVER_DISTANCE_WEIGHT || '0.15'),
    history: parseFloat(process.env.RISK_HISTORY_WEIGHT || '0.15'),
    report: parseFloat(process.env.RISK_REPORT_WEIGHT || '0.3'),
  };

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    @InjectQueue('alerts') private alertQueue: Queue,
  ) {
    this.logger.log(`Risk weights loaded: ${JSON.stringify(this.weights)}`);
  }

  /**
   * Calculate risk score for a grid based on multiple factors
   */
  async calculateRiskScore(gridId: number): Promise<RiskCalculationResponseDto> {
    try {
      const grid = await this.prisma.riskGrid.findUnique({
        where: { id: gridId },
        include: {
          riskLogs: {
            orderBy: { calculatedAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!grid) {
        throw new Error(`Grid not found: ${gridId}`);
      }

      // Fetch all factors
      const factors = await this.gatherRiskFactors(gridId);

      // Calculate score using weighted sum
      const score = this.calculateWeightedScore(factors);
      const category = this.categorizeRisk(score);

      // Get previous score to detect status change
      const previousLog = grid.riskLogs?.[0];
      const previousScore = previousLog?.score || 0;
      const previousCategory = previousLog?.category || 'Aman';
      const statusChanged = category !== previousCategory;

      // Store the result in RiskScoreLog
      const riskLog = await this.prisma.riskScoreLog.create({
        data: {
          gridId,
          score,
          category,
          rainfall: factors.rainfall,
          slope: factors.slope,
          riverDist: factors.riverDistance,
          historyFreq: factors.historicalFrequency,
          reportFactor: factors.reportFactor,
          statusChanged,
        },
      });

      // If status changed, create RiskStatusChange record and trigger alerts
      if (statusChanged) {
        await this.createStatusChangeEvent(
          gridId,
          previousCategory,
          category,
          previousScore,
          score,
        );
      }

      // Calculate top contributing factors
      const topFactors = this.getTopContributingFactors(factors);

      return {
        gridId,
        score: Math.round(score),
        category,
        factors,
        topFactors,
        timestamp: riskLog.calculatedAt,
        statusChanged,
        previousScore: previousScore > 0 ? previousScore : undefined,
        previousCategory: previousCategory !== 'Aman' ? previousCategory : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to calculate risk for grid ${gridId}:`, error);
      throw error;
    }
  }

  /**
   * Gather all risk factors from various sources
   */
  private async gatherRiskFactors(gridId: number): Promise<RiskFactorsDto> {
    const [
      rainfallFactor,
      slopeFactor,
      riverDistanceFactor,
      historicalFactor,
      reportFactor,
    ] = await Promise.all([
      this.getRainfallFactor(gridId),
      this.getSlopeFactor(gridId),
      this.getRiverDistanceFactor(gridId),
      this.getHistoricalFrequencyFactor(gridId),
      this.getReportFactor(gridId),
    ]);

    return {
      rainfall: rainfallFactor,
      slope: slopeFactor,
      riverDistance: riverDistanceFactor,
      historicalFrequency: historicalFactor,
      reportFactor,
    };
  }

  /**
   * Get rainfall factor from most recent weather data
   * Scale: 0-1.0 where 1.0 = 100mm rainfall
   */
  private async getRainfallFactor(gridId: number): Promise<number> {
    try {
      const grid = await this.prisma.riskGrid.findUnique({
        where: { id: gridId },
      });

      if (!grid) return 0;

      const recentWeather = await this.prisma.weatherData.findFirst({
        where: {
          location: {
            latitude: {
              gte: grid.latitude - 0.01,
              lte: grid.latitude + 0.01,
            },
            longitude: {
              gte: grid.longitude - 0.01,
              lte: grid.longitude + 0.01,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 1,
      });

      if (!recentWeather || !recentWeather.rainfallMm) {
        return 0;
      }

      // Scale: cap at 100mm = 1.0
      return Math.min(recentWeather.rainfallMm / 100, 1.0);
    } catch (error) {
      this.logger.warn(`Error fetching rainfall factor for grid ${gridId}:`, error);
      return 0;
    }
  }

  /**
   * Get slope factor (mock implementation)
   * In production, fetch from DEM/slope layer
   * Scale: 0-1.0 where 1.0 = 45+ degrees
   */
  private async getSlopeFactor(gridId: number): Promise<number> {
    // Mock: Return random slope factor between 0-1.0
    // In production, query slope layer from spatial data
    return Math.random() * 1.0;
  }

  /**
   * Get river distance factor (mock implementation)
   * Scale: 0-1.0 where 1.0 = very close to river (< 100m), 0 = > 5000m
   */
  private async getRiverDistanceFactor(gridId: number): Promise<number> {
    // Mock: Return random distance factor
    // In production, calculate distance to nearest river from spatial layer
    const randomDistance = Math.random() * 5000; // meters
    return Math.max(0, 1 - randomDistance / 5000);
  }

  /**
   * Get historical disaster frequency factor
   * Scale: 0-1.0 where 1.0 = 5+ disasters in past 5 years
   */
  private async getHistoricalFrequencyFactor(gridId: number): Promise<number> {
    try {
      const grid = await this.prisma.riskGrid.findUnique({
        where: { id: gridId },
      });

      if (!grid) return 0;

      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

      const eventCount = await this.prisma.disasterEvent.count({
        where: {
          location: {
            latitude: {
              gte: grid.latitude - 0.01,
              lte: grid.latitude + 0.01,
            },
            longitude: {
              gte: grid.longitude - 0.01,
              lte: grid.longitude + 0.01,
            },
          },
          date: {
            gte: fiveYearsAgo,
          },
        },
      });

      return Math.min(eventCount / 5, 1.0);
    } catch (error) {
      this.logger.warn(`Error fetching historical factor for grid ${gridId}:`, error);
      return 0;
    }
  }

  /**
   * Get report aggregation factor
   * Scale: 0-1.0 based on recent valid reports
   */
  private async getReportFactor(gridId: number): Promise<number> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const aggregation = await this.prisma.reportAggregation.findFirst({
        where: {
          gridId,
          windowStart: {
            lte: thirtyDaysAgo,
          },
          windowEnd: {
            gte: now,
          },
        },
      });

      return aggregation?.reportFactor || 0;
    } catch (error) {
      this.logger.warn(`Error fetching report factor for grid ${gridId}:`, error);
      return 0;
    }
  }

  /**
   * Calculate weighted risk score (0-100)
   */
  private calculateWeightedScore(factors: RiskFactorsDto): number {
    const score =
      (factors.rainfall * this.weights.rainfall +
        factors.slope * this.weights.slope +
        factors.riverDistance * this.weights.riverDistance +
        factors.historicalFrequency * this.weights.history +
        factors.reportFactor * this.weights.report) *
      100;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Categorize risk score into 4 categories
   */
  private categorizeRisk(score: number): 'Aman' | 'Waspada' | 'Siaga' | 'Bahaya' {
    if (score < 25) return 'Aman';
    if (score < 50) return 'Waspada';
    if (score < 75) return 'Siaga';
    return 'Bahaya';
  }

  /**
   * Get top 3 contributing factors with their contributions
   */
  private getTopContributingFactors(
    factors: RiskFactorsDto,
  ): Array<{ name: string; value: number; contribution: number }> {
    const contributions = [
      {
        name: 'rainfall',
        value: factors.rainfall,
        contribution: factors.rainfall * this.weights.rainfall * 100,
      },
      {
        name: 'slope',
        value: factors.slope,
        contribution: factors.slope * this.weights.slope * 100,
      },
      {
        name: 'riverDistance',
        value: factors.riverDistance,
        contribution: factors.riverDistance * this.weights.riverDistance * 100,
      },
      {
        name: 'historicalFrequency',
        value: factors.historicalFrequency,
        contribution: factors.historicalFrequency * this.weights.history * 100,
      },
      {
        name: 'reports',
        value: factors.reportFactor,
        contribution: factors.reportFactor * this.weights.report * 100,
      },
    ];

    return contributions
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 3)
      .map((c) => ({
        ...c,
        contribution: Math.round(c.contribution),
      }));
  }

  /**
   * Create a RiskStatusChange record when category changes
   */
  private async createStatusChangeEvent(
    gridId: number,
    previousCategory: string,
    currentCategory: string,
    previousScore: number,
    currentScore: number,
  ): Promise<void> {
    try {
      await this.prisma.riskStatusChange.create({
        data: {
          gridId,
          previousCategory,
          currentCategory,
          previousScore,
          currentScore,
          triggerFactor: 'risk_recalculation',
        },
      });

      this.logger.log(
        `Status change detected for grid ${gridId}: ${previousCategory} → ${currentCategory}`,
      );

      // Queue alert job
      try {
        await this.alertQueue.add(
          'risk_status_change',
          {
            gridId,
            previousCategory,
            currentCategory,
            previousScore,
            currentScore,
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
            removeOnComplete: true,
          },
        );
        this.logger.log(`Alert job queued for grid ${gridId}`);
      } catch (queueError) {
        this.logger.error(`Failed to queue alert job: ${queueError.message}`);
      }
    } catch (error) {
      this.logger.error(`Failed to create status change event:`, error);
    }
  }

  /**
   * Get all grids with current risk scores
   */
  async getAllGridsWithRisks() {
    return this.prisma.riskGrid.findMany({
      include: {
        riskLogs: {
          orderBy: { calculatedAt: 'desc' },
          take: 1,
        },
      },
    });
  }
}
