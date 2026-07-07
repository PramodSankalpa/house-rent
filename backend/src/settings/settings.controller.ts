import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getSettings() {
    return this.settingsService.getAll();
  }

  @Get('raw')
  @UseGuards(AdminGuard)
  async getRawSettings() {
    return this.settingsService.getRawSettings();
  }

  @Post()
  @UseGuards(AdminGuard)
  async updateSettings(@Body() settings: Record<string, string>) {
    return this.settingsService.updateMany(settings);
  }
}
