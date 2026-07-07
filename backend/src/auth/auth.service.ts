import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto, ipAddress: string) {
    const user = await this.prisma.adminUser.findUnique({
      where: { email: loginDto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = { sub: user.id, email: user.email, name: user.name, role: user.role };
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production',
      expiresIn: '1d',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-jwt-key',
      expiresIn: '7d',
    });

    // Create Audit Log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'admin.login',
        ipAddress,
        details: { email: user.email },
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-jwt-key',
      });

      const user = await this.prisma.adminUser.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const newPayload = { sub: user.id, email: user.email, name: user.name, role: user.role };
      const accessToken = this.jwtService.sign(newPayload, {
        secret: process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production',
        expiresIn: '1d',
      });

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async getAuditLogs(userId: string) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async changePassword(userId: string, data: any) {
    const { oldPassword, newPassword } = data;
    const user = await this.prisma.adminUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('Incorrect current password');
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.adminUser.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { success: true };
  }
}
