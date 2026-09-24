
async function callApi(path: string, body?: unknown) {
  const apiUrl = process.env.API_URL ?? 'http://localhost:4000';
  const secret = process.env.WORKER_SECRET ?? '';

  console.log('WORKER SECRET DEBUG:', {
    loaded: Boolean(secret),
    length: secret.length,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-worker-secret': secret,
  };

  const response = await fetch(`${apiUrl}/api/v1/internal${path}`, {
    method: 'POST',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `API internal call failed: ${response.status} ${path}`,
    );
  }

  return response.json();
}

async function updateProgress(
  auditId: string,
  status: 'RUNNING' | 'DOWNLOADING' | 'SCANNING' | 'AI_ANALYSIS',
) {
  await callApi(`/audits/${auditId}/progress`, {
    status,
  });
}

export async function runAudit(auditId: string) {
  await callApi(`/audits/${auditId}/start`);

  let extracted: string | undefined;

  try {
    const context = (await callApi(`/audits/${auditId}/context`)) as {
      repository: {
        fullName: string;
        defaultBranch: string;
      };
      githubToken: string;
    };

    console.log('AUDIT CONTEXT RECEIVED:', {
      auditId,
      repository: context.repository.fullName,
    });

    const { analyzeRepository } =
      await import('./analyzers/static-analyzer');

    const {
      downloadAndExtractRepo: downloadRepo,
      cleanupRepo,
    } = await import('./github/download');

    const { enrichWithAi } =
      await import('./ai/enrich');

    // 1. Download repository
    await updateProgress(auditId, 'DOWNLOADING');

    extracted = await downloadRepo(
      context.repository.fullName,
      context.repository.defaultBranch,
      context.githubToken,
    );

    // 2. Static analysis
    await updateProgress(auditId, 'SCANNING');

    const result = await analyzeRepository(extracted);

    // 3. AI analysis
    await updateProgress(auditId, 'AI_ANALYSIS');

    const ai = await enrichWithAi(result.issues);

    const issues = result.issues.map((issue, index) => ({
      ...issue,
      aiExplanation: ai.explanations.get(String(index))?.explanation,
      suggestedFix: ai.explanations.get(String(index))?.fix,
    }));

    // 4. Complete audit
    await callApi(`/audits/${auditId}/complete`, {
      overallScore: result.overallScore,
      metrics: result.metrics,
      issues,
    });
  } catch (error) {
    await callApi(`/audits/${auditId}/fail`, {
      reason:
        error instanceof Error
          ? error.message
          : 'Unknown worker failure',
    }).catch(() => undefined);

    throw error;
  } finally {
    if (extracted) {
      const { cleanupRepo } =
        await import('./github/download');

      await cleanupRepo(extracted);
    }
  }
}

