import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production',
      });
      request.user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Token is invalid or expired');
    }
  }
}
