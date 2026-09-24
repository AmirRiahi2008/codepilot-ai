import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import path from 'node:path';

import { DashboardModule } from './dashboard/dashboard.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { GitHubModule } from './github/github.module';
import { RepositoriesModule } from './repositories/repositories.module';
import { AuditsModule } from './audits/audits.module';
import { IssuesModule } from './issues/issues.module';
import { InternalModule } from './internal/internal.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.resolve(__dirname, '../../../../.env'),
      cache: true,
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url:
            configService.get<string>('REDIS_URL') ??
            'redis://localhost:6379',
        },
      }),
    }),

    PrismaModule,
    AuthModule,
    GitHubModule,
    RepositoriesModule,
    DashboardModule,
    AuditsModule,
    IssuesModule,
    InternalModule,
  ],

  controllers: [HealthController],
})
export class AppModule {}