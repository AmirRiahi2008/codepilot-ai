import fs from 'node:fs/promises';
import path from 'node:path';

type Issue = {
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category:
    | 'SECURITY'
    | 'ARCHITECTURE'
    | 'PERFORMANCE'
    | 'QUALITY'
    | 'TESTING';
  filePath?: string;
  lineNumber?: number;
  evidence?: string;
  description: string;
  recommendation: string;
};

const allowed = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.html',
  '.css',
  '.php',
  '.py',
  '.java',
  '.go',
  '.rs',
  '.cs',
  '.rb',
  '.kt',
  '.swift',
  '.json',
  '.yml',
  '.yaml',
  '.md',
]);
const ignored = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  'vendor',
]);

const severityPenalty = {
  CRITICAL: 30,
  HIGH: 15,
  MEDIUM: 7,
  LOW: 2,
  INFO: 0,
} as const;

export async function analyzeRepository(root: string) {
  const files: Array<{ path: string; content: string }> = [];

  const maxBytes = Number(
    process.env.MAX_REPOSITORY_FILE_BYTES ?? 300000,
  );

  const maxFiles = Number(
    process.env.MAX_REPOSITORY_FILES ?? 1500,
  );

  async function walk(dir: string) {
    if (files.length >= maxFiles) return;

    for (const entry of await fs.readdir(dir, {
      withFileTypes: true,
    })) {
      if (ignored.has(entry.name)) continue;

      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await walk(full);
      } else if (
        allowed.has(path.extname(entry.name).toLowerCase())
      ) {
        try {
          const stat = await fs.stat(full);

          if (stat.size > maxBytes) continue;

          const content = await fs.readFile(full, 'utf8');

          if (!content.includes('\0')) {
            files.push({
              path: path.relative(root, full),
              content,
            });
          }
        } catch {}
      }

      if (files.length >= maxFiles) break;
    }
  }

  await walk(root);
console.log(
  `STATIC ANALYZER: root=${root} files=${files.length}`,
);

console.log(
  'STATIC ANALYZER FILES:',
  files.slice(0, 20).map((file) => file.path),
);
  const issues: Issue[] = [];

  const addIssue = (issue: Issue) => {
    issues.push(issue);
  };

 const sourceFiles = files.filter((file) =>
  /\.(ts|tsx|js|jsx|mjs|cjs|html|css|php|py|java|go|rs|cs|rb|kt|swift)$/.test(
    file.path,
  ),
);

  const testFiles = files.filter((file) =>
    /(^|[._-])(test|spec)\./i.test(path.basename(file.path)) ||
    /(^|\/)__tests__\//i.test(file.path) ||
    /(^|\/)tests?\//i.test(file.path),
  );

  /*
   * Project detection
   */

  const packageJson = files.find(
    (file) => path.basename(file.path) === 'package.json',
  );

  let packageData: any = null;

  if (packageJson) {
    try {
      packageData = JSON.parse(packageJson.content);
    } catch {}
  }

  const dependencies = {
    ...(packageData?.dependencies ?? {}),
    ...(packageData?.devDependencies ?? {}),
  };

  const isNodeProject =
    Boolean(packageJson) ||
    files.some((file) =>
      /\.(js|jsx|ts|tsx|mjs|cjs)$/.test(file.path),
    );

  const isReactProject =
    Boolean(dependencies.react) ||
    sourceFiles.some((file) =>
      /\.(tsx|jsx)$/.test(file.path),
    );

  const isNextProject =
    Boolean(dependencies.next) ||
    files.some((file) =>
      /(^|\/)(next\.config\.(js|mjs|ts)|app\/|pages\/)/.test(
        file.path,
      ),
    );

  const isLaravelProject = files.some(
    (file) =>
      file.path === 'artisan' ||
      file.path === 'composer.json',
  );

  /*
   * Line based analysis
   */

  for (const file of sourceFiles) {
    const lines = file.content.split(/\r?\n/);

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      /*
       * SECURITY
       */

      if (
        /(['"])(AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9_]{20,})\1/.test(
          line,
        ) ||
        /(api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{12,}/i.test(
          line,
        )
      ) {
        addIssue({
          title: 'Potential hardcoded secret',
          severity: 'CRITICAL',
          category: 'SECURITY',
          filePath: file.path,
          lineNumber: index + 1,
          evidence: trimmed.slice(0, 240),
          description:
            'A credential-like value appears directly in source code.',
          recommendation:
            'Move secrets to environment variables or a managed secret store and rotate them if real.',
        });
      }

      if (/\beval\s*\(|new Function\s*\(/.test(line)) {
        addIssue({
          title: 'Dynamic code execution',
          severity: 'HIGH',
          category: 'SECURITY',
          filePath: file.path,
          lineNumber: index + 1,
          evidence: trimmed.slice(0, 240),
          description:
            'Dynamic evaluation can execute code constructed at runtime.',
          recommendation:
            'Remove dynamic execution or replace it with a safe parser.',
        });
      }

      if (
        /\b(innerHTML|outerHTML|insertAdjacentHTML)\s*=/.test(line)
      ) {
        addIssue({
          title: 'Potential unsafe HTML injection',
          severity: 'HIGH',
          category: 'SECURITY',
          filePath: file.path,
          lineNumber: index + 1,
          evidence: trimmed.slice(0, 240),
          description:
            'Direct HTML injection can become an XSS risk when content is not trusted.',
          recommendation:
            'Prefer safe DOM APIs or sanitize untrusted HTML before rendering.',
        });
      }

      if (
        /(child_process|execSync\s*\(|spawn\s*\(|exec\s*\()/.test(
          line,
        )
      ) {
        addIssue({
          title: 'Operating system process execution',
          severity: 'HIGH',
          category: 'SECURITY',
          filePath: file.path,
          lineNumber: index + 1,
          evidence: trimmed.slice(0, 240),
          description:
            'The source launches an operating-system process.',
          recommendation:
            'Validate arguments, avoid shell interpolation, and use an allow-list.',
        });
      }

      if (
        /https?:\/\/(?!localhost|127\.0\.0\.1)/i.test(line) &&
        /(api|auth|login|token|password|secret)/i.test(line)
      ) {
        addIssue({
          title: 'Potential insecure external endpoint',
          severity: 'MEDIUM',
          category: 'SECURITY',
          filePath: file.path,
          lineNumber: index + 1,
          evidence: trimmed.slice(0, 240),
          description:
            'A non-local HTTP endpoint appears near security-sensitive data.',
          recommendation:
            'Use HTTPS for production authentication and sensitive API communication.',
        });
      }

      /*
       * QUALITY
       */

      if (
        /\bconsole\.(log|debug|info|warn)\s*\(/.test(line)
      ) {
        addIssue({
          title: 'Console logging in application code',
          severity: 'LOW',
          category: 'QUALITY',
          filePath: file.path,
          lineNumber: index + 1,
          evidence: trimmed.slice(0, 240),
          description:
            'Direct console logging can make production observability harder to manage.',
          recommendation:
            'Use a structured logger with configurable log levels.',
        });
      }

      if (/\b(TODO|FIXME|HACK)\b/.test(line)) {
        addIssue({
          title: 'Unresolved development marker',
          severity: 'LOW',
          category: 'QUALITY',
          filePath: file.path,
          lineNumber: index + 1,
          evidence: trimmed.slice(0, 240),
          description:
            'The source contains an unresolved development marker.',
          recommendation:
            'Resolve it or track it explicitly in the project issue tracker.',
        });
      }

      if (
        /\.(ts|tsx)$/.test(file.path) &&
        (/:\s*any\b/.test(line) ||
          /\bas any\b/.test(line))
      ) {
        addIssue({
          title: 'Explicit any usage',
          severity: 'LOW',
          category: 'QUALITY',
          filePath: file.path,
          lineNumber: index + 1,
          evidence: trimmed.slice(0, 240),
          description:
            'Explicit any weakens TypeScript type safety.',
          recommendation:
            'Replace any with a precise type, unknown, generic, or domain model.',
        });
      }

      /*
       * PERFORMANCE
       */

      if (
        /\b(fs\.(readFileSync|writeFileSync|existsSync)|execSync)\s*\(/.test(
          line,
        )
      ) {
        addIssue({
          title: 'Synchronous operation on application path',
          severity: 'MEDIUM',
          category: 'PERFORMANCE',
          filePath: file.path,
          lineNumber: index + 1,
          evidence: trimmed.slice(0, 240),
          description:
            'A synchronous operation may block the event loop in Node.js.',
          recommendation:
            'Prefer asynchronous APIs on request or worker execution paths.',
        });
      }

      /*
       * ARCHITECTURE
       */

      if (
        /import\s+.*from\s+['"](?:\.\.\/){4,}/.test(line)
      ) {
        addIssue({
          title: 'Deep relative import',
          severity: 'LOW',
          category: 'ARCHITECTURE',
          filePath: file.path,
          lineNumber: index + 1,
          evidence: trimmed.slice(0, 240),
          description:
            'Deep relative imports can indicate weak module boundaries.',
          recommendation:
            'Consider aliases or clearer module boundaries.',
        });
      }
    });

    const lineCount = lines.length;

    if (lineCount > 1200) {
      addIssue({
        title: 'Extremely large source file',
        severity: 'HIGH',
        category: 'ARCHITECTURE',
        filePath: file.path,
        description:
          'An extremely large file is likely carrying too many responsibilities.',
        recommendation:
          'Split the file into smaller modules with clear responsibilities.',
      });
    } else if (lineCount > 700) {
      addIssue({
        title: 'Very large source file',
        severity: 'MEDIUM',
        category: 'ARCHITECTURE',
        filePath: file.path,
        description:
          'Large files can concentrate multiple responsibilities.',
        recommendation:
          'Split the file by responsibility and extract reusable modules.',
      });
    }

    /*
     * Repeated database lookups inside loops
     */

    if (
      /for\s*\([^)]*\)\s*\{[\s\S]{0,1500}?\.(find|findOne|findById|query)\s*\(/m.test(
        file.content,
      )
    ) {
      addIssue({
        title: 'Potential repeated database lookup',
        severity: 'HIGH',
        category: 'PERFORMANCE',
        filePath: file.path,
        description:
          'A database lookup appears inside a loop-shaped construct.',
        recommendation:
          'Check for N+1 behavior and consider batching or eager loading.',
      });
    }
  }

  /*
   * Testing analysis
   */

  if (sourceFiles.length > 0 && testFiles.length === 0) {
    addIssue({
      title: 'No automated tests detected',
      severity: 'MEDIUM',
      category: 'TESTING',
      description:
        'No common test files were detected in the scanned source set.',
      recommendation:
        'Add tests around critical business logic and API boundaries.',
    });
  } else if (
    sourceFiles.length >= 10 &&
    testFiles.length / sourceFiles.length < 0.1
  ) {
    addIssue({
      title: 'Low test-to-source ratio',
      severity: 'LOW',
      category: 'TESTING',
      description:
        'The repository contains relatively few test files compared with source files.',
      recommendation:
        'Increase automated test coverage for important business paths.',
    });
  }

  /*
   * Project-specific architecture checks
   */

  if (isNodeProject && !packageData?.scripts?.test) {
    addIssue({
      title: 'Node project has no test script',
      severity: 'LOW',
      category: 'TESTING',
      description:
        'package.json does not expose a conventional test script.',
      recommendation:
        'Add a test command such as Vitest, Jest, or another suitable framework.',
    });
  }

  if (isReactProject) {
    const componentFiles = sourceFiles.filter((file) =>
      /\.(tsx|jsx)$/.test(file.path),
    );

    if (componentFiles.length > 20 && testFiles.length === 0) {
      addIssue({
        title: 'React project without component tests',
        severity: 'MEDIUM',
        category: 'TESTING',
        description:
          'The repository contains many React components but no detected tests.',
        recommendation:
          'Add component and integration tests for important UI flows.',
      });
    }
  }

  if (isNextProject) {
    const hasAppOrPages = files.some((file) =>
      /(^|\/)(app|pages)\//.test(file.path),
    );

    if (!hasAppOrPages) {
      addIssue({
        title: 'Next.js routing structure not detected',
        severity: 'LOW',
        category: 'ARCHITECTURE',
        description:
          'Next.js appears to be installed but no app or pages directory was detected.',
        recommendation:
          'Verify the application routing structure and project configuration.',
      });
    }
  }

  if (isLaravelProject) {
    const hasTestsDirectory = files.some((file) =>
      /(^|\/)tests\//i.test(file.path),
    );

    if (!hasTestsDirectory) {
      addIssue({
        title: 'Laravel tests directory not detected',
        severity: 'MEDIUM',
        category: 'TESTING',
        description:
          'A Laravel project was detected without a conventional tests directory.',
        recommendation:
          'Add feature and unit tests for important application behavior.',
      });
    }
  }

  /*
   * Repository-level quality signals
   */

  const totalLines = sourceFiles.reduce(
    (total, file) =>
      total + file.content.split(/\r?\n/).length,
    0,
  );

  if (sourceFiles.length > 50 && testFiles.length === 0) {
    addIssue({
      title: 'Large codebase without detected tests',
      severity: 'MEDIUM',
      category: 'TESTING',
      description:
        'A relatively large source tree contains no detected automated tests.',
      recommendation:
        'Prioritize tests for authentication, business logic, and critical API paths.',
    });
  }

  if (totalLines > 10000 && sourceFiles.length < 10) {
    addIssue({
      title: 'High code concentration',
      severity: 'MEDIUM',
      category: 'ARCHITECTURE',
      description:
        'A large amount of source code is concentrated into a small number of files.',
      recommendation:
        'Review module boundaries and split large responsibilities.',
    });
  }

  /*
   * Remove duplicate findings generated by overlapping rules.
   */

  const uniqueIssues = Array.from(
    new Map(
      issues.map((issue) => {
        const key = [
          issue.title,
          issue.category,
          issue.filePath ?? '',
          issue.lineNumber ?? 0,
        ].join('|');

        return [key, issue];
      }),
    ).values(),
  );

  /*
   * Score calculation
   */

  const calculateCategoryScore = (
    category: Issue['category'],
  ) => {
    const categoryIssues = uniqueIssues.filter(
      (issue) => issue.category === category,
    );

    const penalty = categoryIssues.reduce(
      (total, issue) =>
        total + severityPenalty[issue.severity],
      0,
    );

    return Math.max(0, Math.min(100, 100 - penalty));
  };

  const metrics = {
    securityScore: calculateCategoryScore('SECURITY'),
    architectureScore:
      calculateCategoryScore('ARCHITECTURE'),
    performanceScore:
      calculateCategoryScore('PERFORMANCE'),
    qualityScore: calculateCategoryScore('QUALITY'),
    testingScore: calculateCategoryScore('TESTING'),
  };

  const overallScore = Math.round(
    metrics.securityScore * 0.25 +
      metrics.architectureScore * 0.2 +
      metrics.performanceScore * 0.2 +
      metrics.qualityScore * 0.2 +
      metrics.testingScore * 0.15,
  );

  return {
    filesScanned: files.length,
    issues: uniqueIssues,
    metrics,
    overallScore,
  };
}