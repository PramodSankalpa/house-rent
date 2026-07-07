import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class PropertyService {
  private uploadsDir = path.join(process.cwd(), 'uploads');

  constructor(private prisma: PrismaService) {
    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async getAll() {
    return this.prisma.property.findMany({
      include: {
        images: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
  }

  async getById(id: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  async getBySlug(slug: string) {
    const property = await this.prisma.property.findUnique({
      where: { slug },
      include: {
        images: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  async create(data: any) {
    const { amenities, rules, ...rest } = data;
    return this.prisma.property.create({
      data: {
        ...rest,
        amenities: amenities || [],
        rules: rules || [],
      },
    });
  }

  async update(id: string, data: any) {
    await this.getById(id);
    const { amenities, rules, ...rest } = data;
    return this.prisma.property.update({
      where: { id },
      data: {
        ...rest,
        amenities: amenities || undefined,
        rules: rules || undefined,
      },
    });
  }

  async delete(id: string) {
    await this.getById(id);
    return this.prisma.property.delete({
      where: { id },
    });
  }

  async uploadImage(propertyId: string, base64Data: string, alt: string) {
    await this.getById(propertyId);
    
    // Extract base64 file data and type
    const matches = base64Data.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 image data');
    }
    
    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const imageBuffer = Buffer.from(matches[2], 'base64');
    const filename = `${crypto.randomUUID()}.${ext}`;
    const filePath = path.join(this.uploadsDir, filename);
    
    // Write buffer to local folder
    fs.writeFileSync(filePath, imageBuffer);
    
    // Save image path to database
    const relativeUrl = `/uploads/${filename}`;
    
    // Check if this is the first image to make it main by default
    const imageCount = await this.prisma.image.count({
      where: { propertyId },
    });

    return this.prisma.image.create({
      data: {
        propertyId,
        url: relativeUrl,
        alt: alt || 'Property Image',
        isMain: imageCount === 0,
        displayOrder: imageCount,
      },
    });
  }

  async deleteImage(imageId: string) {
    const image = await this.prisma.image.findUnique({
      where: { id: imageId },
    });
    if (!image) throw new NotFoundException('Image not found');

    // Delete physical file
    const filename = path.basename(image.url);
    const filePath = path.join(this.uploadsDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete record from DB
    await this.prisma.image.delete({
      where: { id: imageId },
    });

    // If deleted image was the main one, set another as main
    if (image.isMain) {
      const remainingImage = await this.prisma.image.findFirst({
        where: { propertyId: image.propertyId },
        orderBy: { displayOrder: 'asc' },
      });
      if (remainingImage) {
        await this.prisma.image.update({
          where: { id: remainingImage.id },
          data: { isMain: true },
        });
      }
    }

    return { success: true };
  }

  async setMainImage(propertyId: string, imageId: string) {
    // Reset all property images to false
    await this.prisma.image.updateMany({
      where: { propertyId },
      data: { isMain: false },
    });

    // Set selected image as main
    return this.prisma.image.update({
      where: { id: imageId },
      data: { isMain: true },
    });
  }
}
