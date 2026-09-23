import fs from 'node:fs/promises';
import path from 'node:path';

type Issue = {
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: 'SECURITY' | 'ARCHITECTURE' | 'PERFORMANCE' | 'QUALITY' | 'TESTING';
  filePath?: string;
  lineNumber?: number;
  evidence?: string;
  description: string;
  recommendation: string;
};

const allowed = new Set(['.ts','.tsx','.js','.jsx','.mjs','.cjs','.php','.py','.java','.go','.rs','.cs','.rb','.kt','.swift','.json','.yml','.yaml','.md']);
const ignored = new Set(['node_modules','.git','.next','dist','build','coverage','vendor']);

export async function analyzeRepository(root: string) {
  const files: Array<{ path: string; content: string }> = [];
  const maxBytes = Number(process.env.MAX_REPOSITORY_FILE_BYTES ?? 300000);
  const maxFiles = Number(process.env.MAX_REPOSITORY_FILES ?? 1500);

  async function walk(dir: string) {
    if (files.length >= maxFiles) return;
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (allowed.has(path.extname(entry.name).toLowerCase())) {
        const stat = await fs.stat(full);
        if (stat.size > maxBytes) continue;
        try {
          const content = await fs.readFile(full, 'utf8');
          if (!content.includes('\0')) files.push({ path: path.relative(root, full), content });
        } catch {}
      }
      if (files.length >= maxFiles) break;
    }
  }

  await walk(root);
  const issues: Issue[] = [];

  for (const file of files) {
    const lines = file.content.split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (/(['\"])(AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9_]{20,})\1/.test(line) || /(api[_-]?key|secret|password)\s*[:=]\s*['\"][^'\"]{12,}/i.test(line)) {
        issues.push({ title: 'Potential hardcoded secret', severity: 'CRITICAL', category: 'SECURITY', filePath: file.path, lineNumber: idx + 1, evidence: line.trim().slice(0, 240), description: 'A credential-like value appears directly in source code.', recommendation: 'Move the secret to a managed environment variable or secret store and rotate it if it is real.' });
      }
      if (/\beval\s*\(|new Function\s*\(/.test(line)) {
        issues.push({ title: 'Dynamic code execution', severity: 'HIGH', category: 'SECURITY', filePath: file.path, lineNumber: idx + 1, evidence: line.trim().slice(0, 240), description: 'Dynamic evaluation can turn untrusted input into executable code.', recommendation: 'Remove dynamic execution or constrain it to a safe parser/allow-list.' });
      }
      if (/(child_process|execSync\s*\(|spawn\s*\()/.test(line) && /execSync|exec\s*\(|spawn\s*\(/.test(line)) {
        issues.push({ title: 'Shell/process execution deserves review', severity: 'HIGH', category: 'SECURITY', filePath: file.path, lineNumber: idx + 1, evidence: line.trim().slice(0, 240), description: 'The source launches an operating-system process. Safety depends on how arguments are constructed.', recommendation: 'Avoid shell interpolation, prefer argument arrays, validate inputs, and apply a strict allow-list.' });
      }
    });

    if (file.content.split('\n').length > 700) {
      issues.push({ title: 'Very large source file', severity: 'MEDIUM', category: 'QUALITY', filePath: file.path, description: 'Very large files tend to concentrate responsibilities and become harder to test and maintain.', recommendation: 'Split the file by responsibility and extract reusable services or modules.' });
    }

    if (/for\s*\([^)]*\)\s*\{[\s\S]{0,1500}?\.(find|findOne|findById|query)\s*\(/m.test(file.content)) {
      issues.push({ title: 'Potential repeated database lookup', severity: 'HIGH', category: 'PERFORMANCE', filePath: file.path, description: 'A lookup-like call appears inside a loop-shaped construct.', recommendation: 'Check for N+1 behavior and consider batching, eager loading, joins, or a single query.' });
    }
  }

  const hasTests = files.some((f) => /(^|[._-])(test|spec)\./i.test(path.basename(f.path)) || /(^|\/)__tests__\//i.test(f.path));
  if (!hasTests) {
    issues.push({ title: 'No obvious automated tests detected', severity: 'MEDIUM', category: 'TESTING', description: 'No common test/spec files were detected in the scanned source set.', recommendation: 'Add a small test suite around critical business logic and API boundaries.' });
  }

  const count = (category: Issue['category']) => issues.filter((i) => i.category === category).length;
  const score = (base: number, category: Issue['category'], weight: number) => Math.max(0, Math.min(100, base - count(category) * weight));
  const metrics = {
    securityScore: score(100, 'SECURITY', 18),
    architectureScore: score(90, 'ARCHITECTURE', 12),
    performanceScore: score(100, 'PERFORMANCE', 14),
    qualityScore: score(100, 'QUALITY', 8),
    testingScore: score(100, 'TESTING', 18),
  };
  const overallScore = Math.round(Object.values(metrics).reduce((a, b) => a + b, 0) / 5);

  return { filesScanned: files.length, issues, metrics, overallScore };
}
