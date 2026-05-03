import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  getInfo() {
    return {
      name: 'SpartaGuardia Backend',
      version: '0.1.0',
      description: 'Disaster Risk Management System - Geospatial Analysis',
      environment: process.env.NODE_ENV || 'development',
      apiDocs: '/api',
    };
  }
}
