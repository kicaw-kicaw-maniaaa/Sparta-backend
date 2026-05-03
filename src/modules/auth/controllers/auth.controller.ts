import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dtos/login.dto';
import { RegisterDto } from '../dtos/register.dto';
import { AuthGuard } from '@common/guards/auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: {
      example: {
        access_token: 'eyJhbGc...',
        refresh_token: 'eyJhbGc...',
        expires_in: 86400,
        user: {
          id: 'uuid',
          email: 'user@example.com',
          name: 'John Doe',
          role: 'warga',
        },
      },
    },
  })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
  })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved',
  })
  async getProfile(@Req() req: any) {
    return this.authService.getProfile(req.user.id);
  }
}
