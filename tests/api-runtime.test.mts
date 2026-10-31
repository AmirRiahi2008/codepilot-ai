import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
require('reflect-metadata');
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const { Receiver } = require('@upstash/qstash');
const {
  PrismaService,
} = require('../apps/api/dist/src/prisma/prisma.service.js');
const {
  AuditRunnerController,
} = require('../apps/api/dist/src/audit-runner/audit-runner.controller.js');
const {
  AuditRunnerService,
} = require('../apps/api/dist/src/audit-runner/audit-runner.service.js');

test('API starts without QStash, serves health and protects private routes', async () => {
  process.env.JWT_SECRET =
    'local-test-secret-with-at-least-thirty-two-characters';
  delete process.env.QSTASH_TOKEN;
  delete process.env.QSTASH_CURRENT_SIGNING_KEY;
  delete process.env.QSTASH_NEXT_SIGNING_KEY;
  const { AppModule } = require('../apps/api/dist/src/app.module.js');
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue({})
    .compile();
  const app = module.createNestApplication({ rawBody: true, logger: false });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(0, '127.0.0.1');
  try {
    const origin = await app.getUrl();
    const health = await fetch(`${origin}/api/v1/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).ok, true);
    assert.equal((await fetch(`${origin}/api/v1/auth/me`)).status, 401);
    assert.equal(
      (
        await fetch(`${origin}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await fetch(`${origin}/api/v1/internal/audits/test/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        })
      ).status,
      503,
    );
  } finally {
    await app.close();
  }
});

test('signed QStash callbacks verify the original JSON bytes and reject invalid signatures', async () => {
  const key = 'local-test-signing-key-with-at-least-32-characters';
  const receiver = new Receiver({
    currentSigningKey: key,
    nextSigningKey: key,
  });
  let runs = 0;
  const module = await Test.createTestingModule({
    controllers: [AuditRunnerController],
    providers: [
      { provide: Receiver, useValue: receiver },
      {
        provide: AuditRunnerService,
        useValue: {
          run: async () => {
            runs++;
            return { ok: true };
          },
        },
      },
    ],
  }).compile();
  const app = module.createNestApplication({ rawBody: true, logger: false });
  app.setGlobalPrefix('api/v1');
  app.useBodyParser('json', { limit: '2mb' });
  await app.listen(0, '127.0.0.1');
  const previousUrl = process.env.API_URL;
  try {
    const origin = await app.getUrl();
    process.env.API_URL = `${origin}/`;
    const url = `${origin}/api/v1/internal/audits/test/run`;
    const body = '{ "auditId": "test", "label": "تست" }';
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    ).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        iss: 'Upstash',
        sub: url,
        nbf: now - 10,
        exp: now + 60,
        body: createHash('sha256').update(body).digest('base64url'),
      }),
    ).toString('base64url');
    const unsigned = `${header}.${payload}`;
    const signature = `${unsigned}.${createHmac('sha256', key).update(unsigned).digest('base64url')}`;
    const send = (sig: string, content = body) =>
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'upstash-signature': sig,
        },
        body: content,
      });
    assert.equal((await send(signature)).status, 201);
    assert.equal(runs, 1);
    assert.equal((await send('invalid-signature')).status, 401);
    assert.equal((await send(signature, '{"auditId":"tampered"}')).status, 401);
    assert.equal(runs, 1);
  } finally {
    if (previousUrl === undefined) delete process.env.API_URL;
    else process.env.API_URL = previousUrl;
    await app.close();
  }
});
