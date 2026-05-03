import { Injectable, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@shared/database/prisma.service';
import { LoginDto } from '../dtos/login.dto';
import { RegisterDto } from '../dtos/register.dto';
import { AuthResponseDto } from '../dtos/auth-response.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');
  private readonly saltRounds = 10;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Register new user
   */
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    try {
      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingUser) {
        throw new BadRequestException('Email already registered');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);

      // Get 'warga' role (default for new users)
      const wargaRole = await this.prisma.role.findUnique({
        where: { name: 'warga' },
      });

      if (!wargaRole) {
        throw new Error('Default role (warga) not found');
      }

      // Create user
      const user = await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          passwordHash,
          roleId: wargaRole.id,
        },
        include: {
          role: true,
        },
      });

      // Create notification preferences
      await this.prisma.userNotificationPreference.create({
        data: {
          userId: user.id,
        },
      });

      this.logger.log(`User registered: ${user.email}`);

      // Generate tokens
      return this.generateAuthResponse(user);
    } catch (error) {
      this.logger.error(`Registration failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    try {
      // Find user by email
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
        include: { role: true },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid email or password');
      }

      this.logger.log(`User logged in: ${user.email}`);

      // Generate tokens
      return this.generateAuthResponse(user);
    } catch (error) {
      this.logger.error(`Login failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate JWT token and return user
   */
  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        notificationPrefs: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      notificationPreferences: user.notificationPrefs,
      createdAt: user.createdAt,
    };
  }

  /**
   * Generate JWT tokens
   */
  private generateAuthResponse(user: any): AuthResponseDto {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
    };

    const access_token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRATION') || '24h',
    });

    const refresh_token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION') || '7d',
    });

    return {
      access_token,
      refresh_token,
      expires_in: 24 * 60 * 60, // 24 hours in seconds
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
      },
    };
  }
}
