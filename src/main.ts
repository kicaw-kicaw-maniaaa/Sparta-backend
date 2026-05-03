import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  });

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('SpartaGuardia API')
    .setDescription('Disaster Risk Management Backend - Geospatial Analysis')
    .setVersion('0.1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Risk', 'Risk calculation and analysis')
    .addTag('Reports', 'Community report management')
    .addTag('Alerts', 'Alert and notification system')
    .addTag('Dashboard', 'Analytics and dashboard endpoints')
    .addTag('Spatial', 'Spatial data and GIS operations')
    .addTag('Admin', 'Administrative endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`http://localhost:${port}`);
  console.log(`http://localhost:${port}/api`);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
