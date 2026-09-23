import dotenv from 'dotenv';
import path from 'node:path';
import bodyParser from 'body-parser';
dotenv.config({
  path: path.resolve('/Users/amirriahi/Projects/codepilot-ai/.env'),
});
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
console.log(
  'GITHUB ENV:',
  process.env.GITHUB_CLIENT_ID ? 'FOUND' : 'NOT FOUND',
);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.WEB_URL ?? 'http://localhost:3000',
    credentials: true,
  });
  app.use(bodyParser.json({ limit: '2mb' }));
app.use(bodyParser.urlencoded({ limit: '2mb', extended: true }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(Number(process.env.API_PORT ?? 4000));
}

bootstrap();
