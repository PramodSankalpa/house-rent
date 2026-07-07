import { Controller, Post, Body, Get, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AdminGuard } from './admin.guard';
import { CurrentUser } from './user.decorator';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.authService.login(loginDto, ip);
  }

  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @Get('audit')
  @UseGuards(AdminGuard)
  async getAuditLogs(@CurrentUser() user: any) {
    return this.authService.getAuditLogs(user.sub);
  }

  @Get('me')
  @UseGuards(AdminGuard)
  async getMe(@CurrentUser() user: any) {
    return user;
  }

  @Post('change-password')
  @UseGuards(AdminGuard)
  async changePassword(
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    return this.authService.changePassword(user.sub, body);
  }
}
