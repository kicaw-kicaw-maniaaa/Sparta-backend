export class RiskFactorsDto {
  rainfall: number; // 0-1.0
  slope: number; // 0-1.0
  riverDistance: number; // 0-1.0
  historicalFrequency: number; // 0-1.0
  reportFactor: number; // 0-1.0
}

export class RiskCalculationResponseDto {
  gridId: number;
  score: number; // 0-100
  category: 'Aman' | 'Waspada' | 'Siaga' | 'Bahaya';
  factors: RiskFactorsDto;
  topFactors: Array<{
    name: string;
    value: number;
    contribution: number; // percentage
  }>;
  timestamp: Date;
  statusChanged: boolean;
  previousScore?: number;
  previousCategory?: string;
}
