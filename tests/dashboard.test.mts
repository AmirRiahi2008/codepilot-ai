import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { isProcessing, auditStatusStyles } from '../apps/web/lib/audit-status';

const require = createRequire(import.meta.url);
const {
  DashboardService,
} = require('../apps/api/dist/src/dashboard/dashboard.service.js');

test('dashboard counts every processing phase and keeps queries scoped to the current user', async () => {
  const scoped = (args: any) =>
    assert.deepEqual(args.where, { repository: { userId: 'user-1' } });
  const prisma = {
    repository: {
      count: async (args: any) => {
        assert.deepEqual(args.where, { userId: 'user-1' });
        return 2;
      },
    },
    audit: {
      groupBy: async (args: any) => {
        scoped(args);
        return [
          'PENDING',
          'RUNNING',
          'DOWNLOADING',
          'SCANNING',
          'AI_ANALYSIS',
          'COMPLETED',
          'FAILED',
        ].map((status) => ({ status, _count: { _all: 1 } }));
      },
      findMany: async (args: any) => {
        scoped(args);
        assert.equal(args.take, 5);
        return [];
      },
    },
    issue: {
      groupBy: async (args: any) => {
        assert.deepEqual(args.where, {
          audit: { repository: { userId: 'user-1' } },
        });
        return [{ severity: 'HIGH', _count: { _all: 3 } }];
      },
    },
  };
  const result = await new DashboardService(prisma).getOverview('user-1');
  assert.deepEqual(result.audits, {
    total: 7,
    completed: 1,
    running: 4,
    pending: 1,
    failed: 1,
  });
  assert.equal(result.issues.total, 3);
  assert.equal(result.issues.high, 3);
});

test('every nonterminal audit phase is recognized and has a display style', () => {
  for (const status of [
    'PENDING',
    'RUNNING',
    'DOWNLOADING',
    'SCANNING',
    'AI_ANALYSIS',
  ] as const) {
    assert.equal(isProcessing(status), true);
    assert.ok(auditStatusStyles[status]);
  }
  assert.equal(isProcessing('FAILED'), false);
  assert.equal(isProcessing('COMPLETED'), false);
});
