# SpartaGuardia Backend

Disaster Risk Management System - Geospatial Analysis Backend built with NestJS, PostgreSQL + PostGIS, Redis, and WebSocket.
A modular NestJS application for real-time disaster risk assessment using geospatial data, community reports, and environmental factors. The system calculates risk scores, detects spatial violations, sends real-time alerts, and provides interactive dashboards.

### Module Structure
```
src/
├── modules/           # (Auth, Risk, Report, Alert, etc.)
├── shared/            # (Database, Redis, WebSocket, Jobs)
├── common/            # (Guards, Interceptors, DTOs, etc.)
└── main.ts           # Application entry point
```

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Git

### 1. Setup Environment
```bash
cd ..\spartaguardia\backend
cp .env.example .env
```

### 2. Start Database & Redis
```bash
docker-compose up -d
docker-compose ps
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Setup Database
```bash
npm run db:migrate
npm run db:seed
```

### 5. Start Application
```bash
npm run start:dev
npm run build
npm run start:prod
```

Application available at:
- **API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/health

## Development

### Running Tests
```bash

npm test

npm test:watch

npm test:cov

npm run test:e2e
```

### Database Management
```bash
npm run db:migrate -- --name <migration_name>

npm run db:seed

npm run db:reset

npx prisma studio
```

## Docker

### Run with Docker Compose
```bash
docker-compose up -d

docker-compose logs -f postgres redis

docker-compose down

docker-compose down -v
```

### Build & Run Container
```bash
docker build -t spartaguardia-backend .

docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e REDIS_HOST="localhost" \
  spartaguardia-backend
```

## ENV
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRATION=24h

# Risk Calculation Weights
RISK_RAINFALL_WEIGHT=0.2
RISK_SLOPE_WEIGHT=0.2
RISK_RIVER_DISTANCE_WEIGHT=0.15
RISK_HISTORY_WEIGHT=0.15
RISK_REPORT_WEIGHT=0.3
```

## Additional Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [PostGIS Documentation](https://postgis.net/documentation)
- [Socket.IO Documentation](https://socket.io/docs)

## License

MIT License - see LICENSE file for details