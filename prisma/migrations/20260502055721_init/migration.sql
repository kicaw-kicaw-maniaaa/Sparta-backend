-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "roleId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNotificationPreference" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "notifyOnStatusChange" BOOLEAN NOT NULL DEFAULT true,
    "notifyThreshold" TEXT NOT NULL DEFAULT 'siaga',
    "notifyFrequency" TEXT NOT NULL DEFAULT 'instant',
    "enablePushNotification" BOOLEAN NOT NULL DEFAULT true,
    "enableInAppNotification" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" SERIAL NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "geom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpatialLayer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpatialLayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpatialFeature" (
    "id" SERIAL NOT NULL,
    "layerId" INTEGER NOT NULL,
    "properties" JSONB NOT NULL,
    "geom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpatialFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RTRWZone" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zoneType" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "geom" TEXT,
    "description" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RTRWZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskGridRTRWZone" (
    "id" SERIAL NOT NULL,
    "gridId" INTEGER NOT NULL,
    "zoneId" INTEGER NOT NULL,
    "overlapArea" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskGridRTRWZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeatherData" (
    "id" SERIAL NOT NULL,
    "locationId" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "rainfallMm" DOUBLE PRECISION,
    "humidity" DOUBLE PRECISION,
    "windSpeed" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeatherData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisasterEvent" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "locationId" INTEGER NOT NULL,
    "severity" INTEGER,
    "description" TEXT,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisasterEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "photoUrl" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportValidation" (
    "id" SERIAL NOT NULL,
    "reportId" INTEGER NOT NULL,
    "validatorId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportValidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportAggregation" (
    "id" SERIAL NOT NULL,
    "gridId" INTEGER NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "totalReports" INTEGER NOT NULL DEFAULT 0,
    "validReports" INTEGER NOT NULL DEFAULT 0,
    "invalidReports" INTEGER NOT NULL DEFAULT 0,
    "reportFactor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "topReportTypes" JSONB,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportAggregation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskGrid" (
    "id" SERIAL NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "geom" TEXT,
    "region" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskGrid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskStatusChange" (
    "id" SERIAL NOT NULL,
    "gridId" INTEGER NOT NULL,
    "previousCategory" TEXT NOT NULL,
    "currentCategory" TEXT NOT NULL,
    "previousScore" DOUBLE PRECISION NOT NULL,
    "currentScore" DOUBLE PRECISION NOT NULL,
    "triggerFactor" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskStatusChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskScoreLog" (
    "id" SERIAL NOT NULL,
    "gridId" INTEGER NOT NULL,
    "locationId" INTEGER,
    "score" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL,
    "rainfall" DOUBLE PRECISION,
    "slope" DOUBLE PRECISION,
    "riverDist" DOUBLE PRECISION,
    "historyFreq" DOUBLE PRECISION,
    "reportFactor" DOUBLE PRECISION,
    "statusChanged" BOOLEAN NOT NULL DEFAULT false,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskScoreLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFavoriteLocation" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "gridId" INTEGER NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFavoriteLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "gridId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "previousScore" DOUBLE PRECISION,
    "currentScore" DOUBLE PRECISION,
    "previousCategory" TEXT,
    "currentCategory" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpaceViolation" (
    "id" SERIAL NOT NULL,
    "gridId" INTEGER NOT NULL,
    "zoneId" INTEGER NOT NULL,
    "violationType" TEXT NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "reportCount30d" INTEGER NOT NULL,
    "flaggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "notes" TEXT,

    CONSTRAINT "SpaceViolation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalDataLog" (
    "id" SERIAL NOT NULL,
    "source" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "recordsError" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalDataLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchedulerLog" (
    "id" SERIAL NOT NULL,
    "jobName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "durationMs" INTEGER,
    "error" TEXT,
    "gridsCovered" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchedulerLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserNotificationPreference_userId_key" ON "UserNotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RTRWZone_code_key" ON "RTRWZone"("code");

-- CreateIndex
CREATE INDEX "RTRWZone_region_idx" ON "RTRWZone"("region");

-- CreateIndex
CREATE INDEX "RTRWZone_zoneType_idx" ON "RTRWZone"("zoneType");

-- CreateIndex
CREATE INDEX "RiskGridRTRWZone_gridId_idx" ON "RiskGridRTRWZone"("gridId");

-- CreateIndex
CREATE INDEX "RiskGridRTRWZone_zoneId_idx" ON "RiskGridRTRWZone"("zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "RiskGridRTRWZone_gridId_zoneId_key" ON "RiskGridRTRWZone"("gridId", "zoneId");

-- CreateIndex
CREATE INDEX "WeatherData_locationId_idx" ON "WeatherData"("locationId");

-- CreateIndex
CREATE INDEX "WeatherData_timestamp_idx" ON "WeatherData"("timestamp");

-- CreateIndex
CREATE INDEX "DisasterEvent_locationId_idx" ON "DisasterEvent"("locationId");

-- CreateIndex
CREATE INDEX "DisasterEvent_date_idx" ON "DisasterEvent"("date");

-- CreateIndex
CREATE INDEX "Report_userId_idx" ON "Report"("userId");

-- CreateIndex
CREATE INDEX "Report_locationId_idx" ON "Report"("locationId");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "ReportValidation_reportId_idx" ON "ReportValidation"("reportId");

-- CreateIndex
CREATE INDEX "ReportValidation_validatorId_idx" ON "ReportValidation"("validatorId");

-- CreateIndex
CREATE INDEX "ReportAggregation_gridId_idx" ON "ReportAggregation"("gridId");

-- CreateIndex
CREATE INDEX "ReportAggregation_lastUpdated_idx" ON "ReportAggregation"("lastUpdated");

-- CreateIndex
CREATE UNIQUE INDEX "ReportAggregation_gridId_windowStart_windowEnd_key" ON "ReportAggregation"("gridId", "windowStart", "windowEnd");

-- CreateIndex
CREATE INDEX "RiskGrid_region_idx" ON "RiskGrid"("region");

-- CreateIndex
CREATE INDEX "RiskGrid_latitude_longitude_idx" ON "RiskGrid"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "RiskStatusChange_gridId_idx" ON "RiskStatusChange"("gridId");

-- CreateIndex
CREATE INDEX "RiskStatusChange_detectedAt_idx" ON "RiskStatusChange"("detectedAt");

-- CreateIndex
CREATE INDEX "RiskScoreLog_gridId_idx" ON "RiskScoreLog"("gridId");

-- CreateIndex
CREATE INDEX "RiskScoreLog_calculatedAt_idx" ON "RiskScoreLog"("calculatedAt");

-- CreateIndex
CREATE INDEX "RiskScoreLog_score_idx" ON "RiskScoreLog"("score");

-- CreateIndex
CREATE INDEX "UserFavoriteLocation_userId_idx" ON "UserFavoriteLocation"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserFavoriteLocation_userId_gridId_key" ON "UserFavoriteLocation"("userId", "gridId");

-- CreateIndex
CREATE INDEX "Alert_userId_idx" ON "Alert"("userId");

-- CreateIndex
CREATE INDEX "Alert_gridId_idx" ON "Alert"("gridId");

-- CreateIndex
CREATE INDEX "Alert_isRead_idx" ON "Alert"("isRead");

-- CreateIndex
CREATE INDEX "Alert_createdAt_idx" ON "Alert"("createdAt");

-- CreateIndex
CREATE INDEX "SpaceViolation_gridId_idx" ON "SpaceViolation"("gridId");

-- CreateIndex
CREATE INDEX "SpaceViolation_zoneId_idx" ON "SpaceViolation"("zoneId");

-- CreateIndex
CREATE INDEX "SpaceViolation_flaggedAt_idx" ON "SpaceViolation"("flaggedAt");

-- CreateIndex
CREATE INDEX "ExternalDataLog_source_idx" ON "ExternalDataLog"("source");

-- CreateIndex
CREATE INDEX "ExternalDataLog_dataType_idx" ON "ExternalDataLog"("dataType");

-- CreateIndex
CREATE INDEX "ExternalDataLog_processedAt_idx" ON "ExternalDataLog"("processedAt");

-- CreateIndex
CREATE INDEX "SchedulerLog_jobName_idx" ON "SchedulerLog"("jobName");

-- CreateIndex
CREATE INDEX "SchedulerLog_status_idx" ON "SchedulerLog"("status");

-- CreateIndex
CREATE INDEX "SchedulerLog_createdAt_idx" ON "SchedulerLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotificationPreference" ADD CONSTRAINT "UserNotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpatialFeature" ADD CONSTRAINT "SpatialFeature_layerId_fkey" FOREIGN KEY ("layerId") REFERENCES "SpatialLayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskGridRTRWZone" ADD CONSTRAINT "RiskGridRTRWZone_gridId_fkey" FOREIGN KEY ("gridId") REFERENCES "RiskGrid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskGridRTRWZone" ADD CONSTRAINT "RiskGridRTRWZone_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "RTRWZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeatherData" ADD CONSTRAINT "WeatherData_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisasterEvent" ADD CONSTRAINT "DisasterEvent_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportValidation" ADD CONSTRAINT "ReportValidation_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportValidation" ADD CONSTRAINT "ReportValidation_validatorId_fkey" FOREIGN KEY ("validatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportAggregation" ADD CONSTRAINT "ReportAggregation_gridId_fkey" FOREIGN KEY ("gridId") REFERENCES "RiskGrid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskStatusChange" ADD CONSTRAINT "RiskStatusChange_gridId_fkey" FOREIGN KEY ("gridId") REFERENCES "RiskGrid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskScoreLog" ADD CONSTRAINT "RiskScoreLog_gridId_fkey" FOREIGN KEY ("gridId") REFERENCES "RiskGrid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskScoreLog" ADD CONSTRAINT "RiskScoreLog_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavoriteLocation" ADD CONSTRAINT "UserFavoriteLocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavoriteLocation" ADD CONSTRAINT "UserFavoriteLocation_gridId_fkey" FOREIGN KEY ("gridId") REFERENCES "RiskGrid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_gridId_fkey" FOREIGN KEY ("gridId") REFERENCES "RiskGrid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpaceViolation" ADD CONSTRAINT "SpaceViolation_gridId_fkey" FOREIGN KEY ("gridId") REFERENCES "RiskGrid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpaceViolation" ADD CONSTRAINT "SpaceViolation_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "RTRWZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
