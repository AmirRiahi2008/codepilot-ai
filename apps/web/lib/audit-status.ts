export type AuditStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'DOWNLOADING'
  | 'SCANNING'
  | 'AI_ANALYSIS'
  | 'COMPLETED'
  | 'FAILED';

export const auditStatusStyles: Record<AuditStatus, string> = {
  PENDING: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
  RUNNING: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200',
  DOWNLOADING: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200',
  SCANNING: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200',
  AI_ANALYSIS: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200',
  COMPLETED: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
  FAILED: 'border-rose-400/20 bg-rose-400/10 text-rose-200',
};

export function isProcessing(status: AuditStatus) {
  return status !== 'COMPLETED' && status !== 'FAILED';
}
