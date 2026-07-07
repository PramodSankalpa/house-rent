import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { PropertyService } from './property.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('properties')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Get()
  async getAll() {
    return this.propertyService.getAll();
  }

  @Get('slug/:slug')
  async getBySlug(@Param('slug') slug: string) {
    return this.propertyService.getBySlug(slug);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.propertyService.getById(id);
  }

  @Post()
  @UseGuards(AdminGuard)
  async create(@Body() data: any) {
    return this.propertyService.create(data);
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  async update(@Param('id') id: string, @Body() data: any) {
    return this.propertyService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async delete(@Param('id') id: string) {
    return this.propertyService.delete(id);
  }

  @Post(':id/images')
  @UseGuards(AdminGuard)
  async uploadImage(
    @Param('id') id: string,
    @Body('base64Data') base64Data: string,
    @Body('alt') alt: string,
  ) {
    return this.propertyService.uploadImage(id, base64Data, alt);
  }

  @Delete('images/:imageId')
  @UseGuards(AdminGuard)
  async deleteImage(@Param('imageId') imageId: string) {
    return this.propertyService.deleteImage(imageId);
  }

  @Post(':id/images/:imageId/set-main')
  @UseGuards(AdminGuard)
  async setMainImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    return this.propertyService.setMainImage(id, imageId);
  }
}
