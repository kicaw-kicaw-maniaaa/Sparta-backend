import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean up existing data (for development only)
  // await prisma.role.deleteMany({});

  // ========================================
  // 1. Seed Roles
  // ========================================
  console.log('📍 Seeding roles...');
  const roles = await prisma.role.createMany({
    data: [
      { name: 'warga' },
      { name: 'komunitas' },
      { name: 'admin_daerah' },
      { name: 'bpbd' },
      { name: 'superadmin' },
    ],
    skipDuplicates: true,
  });
  console.log(`✅ Roles seeded: ${roles.count} records`);

  // ========================================
  // 2. Seed Locations (Sample Centers)
  // ========================================
  console.log('📍 Seeding locations...');
  const locations = [];
  const baseLatitude = -6.2088;
  const baseLongitude = 106.8456;

  for (let i = 0; i < 5; i++) {
    const location = await prisma.location.create({
      data: {
        latitude: baseLatitude + i * 0.01,
        longitude: baseLongitude + i * 0.01,
      },
    });
    locations.push(location);
  }
  console.log(`✅ Locations seeded: ${locations.length} records`);

  // ========================================
  // 3. Seed Risk Grids (10x10 Grid)
  // ========================================
  console.log('📍 Seeding risk grids...');
  const grids = [];
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      const grid = await prisma.riskGrid.create({
        data: {
          latitude: baseLatitude + i * 0.01,
          longitude: baseLongitude + j * 0.01,
          region: 'Sample Region',
        },
      });
      grids.push(grid);
    }
  }
  console.log(`✅ Risk grids seeded: ${grids.length} records`);

  // ========================================
  // 4. Seed Weather Data (Recent 7 Days)
  // ========================================
  console.log('📍 Seeding weather data...');
  let weatherCount = 0;
  for (const location of locations) {
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date();
      date.setDate(date.getDate() - dayOffset);
      date.setHours(Math.random() * 24, 0, 0, 0);

      await prisma.weatherData.create({
        data: {
          locationId: location.id,
          timestamp: date,
          rainfallMm: Math.random() * 100,
          humidity: 40 + Math.random() * 60,
          windSpeed: Math.random() * 25,
          source: 'BMKG_MOCK',
        },
      });
      weatherCount++;
    }
  }
  console.log(`✅ Weather data seeded: ${weatherCount} records`);

  // ========================================
  // 5. Seed Risk Scores for Grids
  // ========================================
  console.log('📍 Seeding initial risk scores...');
  let scoreCount = 0;
  for (const grid of grids) {
    const score = Math.random() * 100;
    const category =
      score < 25 ? 'Aman' : score < 50 ? 'Waspada' : score < 75 ? 'Siaga' : 'Bahaya';

    await prisma.riskScoreLog.create({
      data: {
        gridId: grid.id,
        locationId: locations[0]?.id,
        score,
        category,
        rainfall: Math.random() * 100,
        slope: Math.random() * 45,
        riverDist: Math.random() * 5000,
        historyFreq: Math.random() * 5,
        reportFactor: Math.random(),
      },
    });
    scoreCount++;
  }
  console.log(`✅ Risk scores seeded: ${scoreCount} records`);

  // ========================================
  // 6. Seed RTRW Zones
  // ========================================
  console.log('📍 Seeding RTRW zones...');
  const zones = await prisma.rTRWZone.createMany({
    data: [
      {
        code: 'RTRW_001',
        name: 'Protected Forest Area',
        zoneType: 'lindung',
        region: 'Sample Region',
        description: 'Protected forest zone for biodiversity',
        source: 'Bappeda',
      },
      {
        code: 'RTRW_002',
        name: 'Cultivation Area',
        zoneType: 'budidaya',
        region: 'Sample Region',
        description: 'Cultivation and development zone',
        source: 'Bappeda',
      },
    ],
    skipDuplicates: true,
  });
  console.log(`✅ RTRW zones seeded: ${zones.count} records`);

  // ========================================
  // 7. Seed Report Aggregations
  // ========================================
  console.log('📍 Seeding report aggregations...');
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  let aggCount = 0;
  for (const grid of grids.slice(0, 5)) {
    await prisma.reportAggregation.create({
      data: {
        gridId: grid.id,
        windowStart: thirtyDaysAgo,
        windowEnd: now,
        totalReports: Math.floor(Math.random() * 10),
        validReports: Math.floor(Math.random() * 8),
        invalidReports: Math.floor(Math.random() * 2),
        reportFactor: Math.random() * 0.5,
      },
    });
    aggCount++;
  }
  console.log(`✅ Report aggregations seeded: ${aggCount} records`);

  // ========================================
  // 8. Seed Disaster Events
  // ========================================
  console.log('📍 Seeding disaster events...');
  const eventTypes = ['banjir', 'longsor'];
  let eventCount = 0;
  for (const location of locations) {
    for (let i = 0; i < 2; i++) {
      const date = new Date();
      date.setFullYear(date.getFullYear() - Math.floor(Math.random() * 5));

      await prisma.disasterEvent.create({
        data: {
          type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
          date,
          locationId: location.id,
          severity: Math.floor(Math.random() * 5) + 1,
          description: `Historical disaster event #${i + 1}`,
          source: 'BNPB',
        },
      });
      eventCount++;
    }
  }
  console.log(`✅ Disaster events seeded: ${eventCount} records`);

  console.log('\n✨ Database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - Roles: 5`);
  console.log(`   - Locations: ${locations.length}`);
  console.log(`   - Risk Grids: ${grids.length}`);
  console.log(`   - Weather Data: ${weatherCount}`);
  console.log(`   - Risk Scores: ${scoreCount}`);
  console.log(`   - RTRW Zones: ${zones.count}`);
  console.log(`   - Report Aggregations: ${aggCount}`);
  console.log(`   - Disaster Events: ${eventCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
