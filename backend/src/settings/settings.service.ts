import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getAll() {
    const settings = await this.prisma.siteSettings.findMany();
    // Return key-value pair mapping for simpler API usage
    return settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);
  }

  async getRawSettings() {
    return this.prisma.siteSettings.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async update(key: string, value: string, category = 'general', description?: string) {
    return this.prisma.siteSettings.upsert({
      where: { key },
      update: { value, updatedAt: new Date() },
      create: { key, value, category, description },
    });
  }

  async updateMany(settings: Record<string, string>) {
    const operations = Object.entries(settings).map(([key, value]) =>
      this.prisma.siteSettings.upsert({
        where: { key },
        update: { value, updatedAt: new Date() },
        create: { key, value, category: 'general' },
      })
    );
    await this.prisma.$transaction(operations);
    return this.getAll();
  }
}
