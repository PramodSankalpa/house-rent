import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable validation globally
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // Setup prefix
  app.setGlobalPrefix('api');

  // Configure CORS for web client access
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // Serve static uploaded files
  app.use('/uploads', express.static(require('path').join(process.cwd(), 'uploads')));

  // Enable body parsing limits for images
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Ahungalla Beach House Backend running on port ${port}`);
}
bootstrap();
