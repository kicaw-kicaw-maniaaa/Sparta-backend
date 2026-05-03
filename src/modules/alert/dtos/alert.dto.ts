import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEmail,
  IsEnum,
  IsArray,
  IsBoolean,
} from 'class-validator';

export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  DANGER = 'danger',
  CRITICAL = 'critical',
}

export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

export enum AlertType {
  RISK_LEVEL_CHANGE = 'risk_level_change',
  THRESHOLD_EXCEEDED = 'threshold_exceeded',
  REPORT_VALIDATION = 'report_validation',
  MAINTENANCE = 'maintenance',
  SYSTEM = 'system',
}

export class CreateAlertDto {
  @IsNotEmpty()
  @IsString()
  gridId: number;

  @IsNotEmpty()
  @IsEnum(AlertType)
  type: AlertType;

  @IsNotEmpty()
  @IsEnum(AlertLevel)
  level: AlertLevel;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  details?: string;

  @IsOptional()
  @IsString()
  previousStatus?: string;

  @IsOptional()
  @IsString()
  currentStatus?: string;

  @IsOptional()
  @IsArray()
  affectedUsers?: string[]; // User IDs to notify
}

export class AlertResponseDto {
  id: number;
  gridId: number;
  type: AlertType;
  level: AlertLevel;
  status: AlertStatus;
  title: string;
  message: string;
  details?: string;
  previousStatus?: string;
  currentStatus?: string;
  createdAt: Date;
  updatedAt: Date;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  dismissedBy?: string;
  dismissedAt?: Date;
}

export class AlertListDto {
  id: number;
  gridId: number;
  type: AlertType;
  level: AlertLevel;
  status: AlertStatus;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export class UpdateAlertStatusDto {
  @IsNotEmpty()
  @IsEnum(AlertStatus)
  status: AlertStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class AlertAcknowledgeDto {
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  acknowledgedBy: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AlertDismissDto {
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  dismissedBy: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class NotificationPreferenceDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsOptional()
  @IsBoolean()
  emailNotifications: boolean = true;

  @IsOptional()
  @IsBoolean()
  smsNotifications: boolean = false;

  @IsOptional()
  @IsBoolean()
  pushNotifications: boolean = true;

  @IsOptional()
  @IsBoolean()
  websocketNotifications: boolean = true;

  @IsOptional()
  @IsArray()
  @IsEnum(AlertLevel, { each: true })
  notificationLevels: AlertLevel[] = ['warning', 'danger', 'critical'];

  @IsOptional()
  @IsArray()
  favoriteGrids?: number[];

  @IsOptional()
  @IsBoolean()
  notifyAllGrids: boolean = false;
}

export class WebSocketMessageDto {
  type: string; // 'alert', 'status_update', 'heartbeat'
  data: any;
  timestamp: Date;
}

export class AlertHistoryDto {
  id: number;
  alertId: number;
  action: string; // 'created', 'acknowledged', 'dismissed', 'resolved'
  performedBy: string;
  notes?: string;
  createdAt: Date;
}

export class AlertStatsDto {
  totalAlerts: number;
  activeAlerts: number;
  acknowledgedAlerts: number;
  resolvedAlerts: number;
  dismissedAlerts: number;
  byLevel: {
    info: number;
    warning: number;
    danger: number;
    critical: number;
  };
  byType: {
    [key: string]: number;
  };
  avgResolutionTime: number; // per minutes
}

export class AlertQueryDto {
  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus;

  @IsOptional()
  @IsEnum(AlertLevel)
  level?: AlertLevel;

  @IsOptional()
  @IsEnum(AlertType)
  type?: AlertType;

  @IsOptional()
  gridId?: number;

  @IsOptional()
  limit: number = 20;

  @IsOptional()
  offset: number = 0;

  @IsOptional()
  sortBy: 'createdAt' | 'level' = 'createdAt';

  @IsOptional()
  sortOrder: 'asc' | 'desc' = 'desc';
}

export class BulkAlertActionDto {
  @IsNotEmpty()
  @IsArray()
  alertIds: number[];

  @IsNotEmpty()
  @IsEnum(AlertStatus)
  status: AlertStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
