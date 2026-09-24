import 'reflect-metadata';
import bodyParser from 'body-parser';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.use(cookieParser());

  const allowedOrigins = [
  process.env.WEB_URL,
  'http://localhost:3000',
].filter(Boolean);

app.enableCors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

  app.use(
    bodyParser.json({
      limit: '2mb',
      verify: (req: any, _res, buffer) => {
        req.rawBody = buffer.toString('utf8');
      },
    }),
  );

  app.use(
    bodyParser.urlencoded({
      limit: '2mb',
      extended: true,
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(
    Number(process.env.API_PORT ?? 4000),
  );
}

bootstrap();
