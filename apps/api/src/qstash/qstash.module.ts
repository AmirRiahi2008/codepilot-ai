import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Client, Receiver } from '@upstash/qstash';

import { QStashService } from './qstash.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: Client,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const token = config.get<string>('QSTASH_TOKEN');

        if (!token) {
          throw new Error('QSTASH_TOKEN is not configured');
        }

        return new Client({
          token,
        });
      },
    },
    {
      provide: Receiver,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const currentSigningKey =
          config.get<string>(
            'QSTASH_CURRENT_SIGNING_KEY',
          );

        const nextSigningKey =
          config.get<string>(
            'QSTASH_NEXT_SIGNING_KEY',
          );

        if (
          !currentSigningKey ||
          !nextSigningKey
        ) {
          throw new Error(
            'QStash signing keys are not configured',
          );
        }

        return new Receiver({
          currentSigningKey,
          nextSigningKey,
        });
      },
    },

    QStashService,
  ],
  exports: [
    Client,
    Receiver,
    QStashService,
  ],
})
export class QStashModule {}