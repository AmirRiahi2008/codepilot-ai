import { proxyApi } from '../../../../lib/api-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function handler(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyApi(request, path);
}

export { handler as GET, handler as POST, handler as HEAD };
