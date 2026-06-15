export const RISK_SCORE_THRESHOLDS = {
  critical: 16,
  high: 10,
  moderate: 5,
} as const;

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export function getRiskScore(probability: number, impact: number): number {
  return probability * impact;
}

export function getRiskLevel(score: number): RiskLevel {
  if (score >= RISK_SCORE_THRESHOLDS.critical) return 'critical';
  if (score >= RISK_SCORE_THRESHOLDS.high) return 'high';
  if (score >= RISK_SCORE_THRESHOLDS.moderate) return 'moderate';
  return 'low';
}

export function scoreColor(score: number): string {
  if (score >= RISK_SCORE_THRESHOLDS.critical) return 'bg-rose-500 text-white';
  if (score >= RISK_SCORE_THRESHOLDS.high) return 'bg-orange-500 text-white';
  if (score >= RISK_SCORE_THRESHOLDS.moderate) return 'bg-amber-400 text-black';
  return 'bg-emerald-500 text-white';
}

export function matrixCellColor(probability: number, impact: number): string {
  const score = getRiskScore(probability, impact);
  if (score >= RISK_SCORE_THRESHOLDS.critical) return 'bg-rose-500/80';
  if (score >= RISK_SCORE_THRESHOLDS.high) return 'bg-orange-500/70';
  if (score >= RISK_SCORE_THRESHOLDS.moderate) return 'bg-amber-400/60';
  return 'bg-emerald-500/50';
}

export function clampRiskRating(value: unknown, fallback = 3): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(5, Math.max(1, Math.round(num)));
}

export function parseTaskIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw.split(',').map((id) => id.trim()).filter(Boolean);
}

export function serializeTaskIds(taskIds: unknown): string {
  if (!Array.isArray(taskIds)) return '';
  const unique = [...new Set(taskIds.filter((id): id is string => typeof id === 'string' && id.length > 0))];
  return unique.join(',');
}

export function isActiveRiskStatus(status: string): boolean {
  return status === 'open' || status === 'mitigating';
}

export function isAlertRisk(risk: { status: string; probability: number; impact: number }, minScore = RISK_SCORE_THRESHOLDS.high): boolean {
  return isActiveRiskStatus(risk.status) && getRiskScore(risk.probability, risk.impact) >= minScore;
}
