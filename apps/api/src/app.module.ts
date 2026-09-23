import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
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
      envFilePath: `${process.cwd()}/.env`,
    }),

    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL ?? 'redis://localhost:6379',
      },
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