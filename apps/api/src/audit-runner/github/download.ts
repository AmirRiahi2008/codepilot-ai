import fs from 'node:fs/promises';
import path from 'node:path';
import AdmZip from 'adm-zip';

const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };

export async function downloadAndExtractRepo(fullName: string, branch: string, token: string): Promise<string> {
  const safe = fullName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const base = path.resolve(process.cwd(), 'worker-tmp', `${Date.now()}-${safe}`);
  const zipPath = `${base}.zip`;
  await fs.mkdir(path.dirname(base), { recursive: true });
  const response = await fetch(`https://api.github.com/repos/${fullName}/zipball/${encodeURIComponent(branch)}`, { headers: { ...headers, Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`GitHub archive download failed: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(zipPath, Buffer.from(arrayBuffer));
  new AdmZip(zipPath).extractAllTo(base, true);
  await fs.unlink(zipPath).catch(() => undefined);
  return base;
}

export async function cleanupRepo(dir: string) {
  await fs.rm(dir, { recursive: true, force: true });
}
