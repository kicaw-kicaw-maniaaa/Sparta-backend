import { IsString, IsOptional, IsNotEmpty, IsEmail } from 'class-validator';

export class CreateReportDto {
  @IsNotEmpty()
  @IsString()
  type: string; // (genangan, longsor_kecil, retakan, saluran_mampet, dll)

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  latitude: number;

  @IsNotEmpty()
  longitude: number;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}

export class ReportResponseDto {
  id: number;
  userId: string;
  locationId: number;
  type: string;
  description: string;
  photoUrl?: string;
  status: string; // (pending, valid, invalid)
  createdAt: Date;
  updatedAt: Date;
}

export class ReportListDto {
  id: number;
  userId: string;
  type: string;
  status: string;
  description: string;
  createdAt: Date;
}

export class ValidateReportDto {
  @IsNotEmpty()
  @IsString()
  status: string; // (sesuai, tidak_sesuai)

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReportValidationResponseDto {
  id: number;
  reportId: number;
  validatorId: string;
  status: string;
  notes?: string;
  createdAt: Date;
}

export class ReportStatsDto {
  totalReports: number;
  validReports: number;
  invalidReports: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
}
