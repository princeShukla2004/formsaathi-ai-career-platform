import type { ResumeAnalysisRecord } from '../types';

export type StandardCheckStatus = 'pass' | 'warn' | 'fail';

export interface ResumeStandardCheck {
  id: string;
  label: string;
  status: StandardCheckStatus;
  detail: string;
  points: number;
  maxPoints: number;
}

export interface ResumeHealthResult {
  score: number;
  tierLabel: 'Strong' | 'Good' | 'Needs Work' | 'Low';
  tone: 'verified' | 'info' | 'warning' | 'danger';
  atsComponent: number;
  atsMax: number;
  standardsComponent: number;
  standardsMax: number;
  passedChecksCount: number;
  checks: ResumeStandardCheck[];
}

const clampScore = (val: number): number => {
  if (!Number.isFinite(val)) return 0;
  return Math.max(0, Math.min(100, val));
};

export function computeResumeHealthScore(
  analysis: ResumeAnalysisRecord,
  submittedText?: string
): ResumeHealthResult {
  const atsScore = clampScore(analysis.atsScore);
  const keywordScore = clampScore(analysis.keywordMatchScore);

  // 1. ATS Compatibility Metrics (55 points max: 30 ATS readability + 25 keyword alignment)
  const atsReadabilityPts = Math.round(atsScore * 0.3);
  const keywordAlignPts = Math.round(keywordScore * 0.25);
  const atsComponent = Math.min(55, atsReadabilityPts + keywordAlignPts);

  // 2. Common Resume Standard Checks (45 points max across 5 standard checks)
  const sections = analysis.sectionSuggestions || [];
  const strongSections = sections.filter((s) => s.status === 'strong').length;
  const missingSections = sections.filter((s) => s.status === 'missing').length;

  // Check A: Core Sections Coverage (12 pts)
  let sectionsCheck: ResumeStandardCheck;
  if (sections.length === 0) {
    const fallbackPass = atsScore >= 75;
    sectionsCheck = {
      id: 'core_sections',
      label: 'Core Sections Structure',
      status: fallbackPass ? 'pass' : 'warn',
      detail: fallbackPass
        ? 'Standard resume sections detected cleanly.'
        : 'Ensure Summary, Skills, Education, and Experience are clearly titled.',
      points: fallbackPass ? 10 : 6,
      maxPoints: 12,
    };
  } else if (missingSections === 0 && strongSections >= Math.ceil(sections.length * 0.5)) {
    sectionsCheck = {
      id: 'core_sections',
      label: 'Core Sections Structure',
      status: 'pass',
      detail: `${strongSections}/${sections.length} evaluated sections rated strong with no missing sections.`,
      points: 12,
      maxPoints: 12,
    };
  } else if (missingSections <= 1 && strongSections >= 1) {
    sectionsCheck = {
      id: 'core_sections',
      label: 'Core Sections Structure',
      status: 'warn',
      detail:
        missingSections === 1
          ? '1 standard section is missing; complete all core sections for ATS parsing.'
          : 'Core sections present, though several need stronger formatting or depth.',
      points: 7,
      maxPoints: 12,
    };
  } else {
    sectionsCheck = {
      id: 'core_sections',
      label: 'Core Sections Structure',
      status: 'fail',
      detail: `${missingSections} key section(s) missing; add clearly labeled headings.`,
      points: 2,
      maxPoints: 12,
    };
  }

  // Check B: ATS File & Format Readiness (8 pts)
  const isPdf = analysis.fileName.toLowerCase().endsWith('.pdf');
  const trimmedText = (submittedText || '').trim();
  const hasHealthyTextLength = trimmedText.length >= 300;
  let formatCheck: ResumeStandardCheck;
  if ((isPdf && atsScore >= 65) || (hasHealthyTextLength && atsScore >= 70)) {
    formatCheck = {
      id: 'format_readiness',
      label: 'ATS File & Format Readiness',
      status: 'pass',
      detail: isPdf
        ? 'PDF source parsed cleanly for ATS compatibility.'
        : 'Clean plain-text layout ready for ATS parsing.',
      points: 8,
      maxPoints: 8,
    };
  } else if (atsScore >= 45) {
    formatCheck = {
      id: 'format_readiness',
      label: 'ATS File & Format Readiness',
      status: 'warn',
      detail: 'Simplify tables, multi-column layouts, or decorative elements for cleaner ATS parsing.',
      points: 5,
      maxPoints: 8,
    };
  } else {
    formatCheck = {
      id: 'format_readiness',
      label: 'ATS File & Format Readiness',
      status: 'fail',
      detail: 'Low structural readability; switch to a clean single-column ATS template.',
      points: 2,
      maxPoints: 8,
    };
  }

  // Check C: Target Role Keyword Depth (9 pts)
  const matchedCount = (analysis.matchedKeywords || []).length;
  const missingCount = (analysis.missingKeywords || []).length;
  const totalKeywords = matchedCount + missingCount;
  const coverageRatio = totalKeywords > 0 ? matchedCount / totalKeywords : keywordScore / 100;
  let keywordCheck: ResumeStandardCheck;
  if (matchedCount >= 5 && (coverageRatio >= 0.55 || missingCount <= 3)) {
    keywordCheck = {
      id: 'keyword_depth',
      label: 'Role Keyword Coverage',
      status: 'pass',
      detail: `${matchedCount} role-relevant keywords matched cleanly.`,
      points: 9,
      maxPoints: 9,
    };
  } else if (matchedCount >= 2 || keywordScore >= 50) {
    keywordCheck = {
      id: 'keyword_depth',
      label: 'Role Keyword Coverage',
      status: 'warn',
      detail: `${matchedCount} matched vs ${missingCount} suggested keywords to weave in naturally.`,
      points: 5,
      maxPoints: 9,
    };
  } else {
    keywordCheck = {
      id: 'keyword_depth',
      label: 'Role Keyword Coverage',
      status: 'fail',
      detail: 'Very few target-role keywords found; align skills and project terms with the role.',
      points: 1,
      maxPoints: 9,
    };
  }

  // Check D: Impact & Actionable Bullet Strength (8 pts)
  const bulletFixesNeeded = (analysis.bulletImprovements || []).length;
  const hasMetricsInText = trimmedText ? /\b\d+(%|x|\+)?\b/.test(trimmedText) : atsScore >= 75;
  let bulletCheck: ResumeStandardCheck;
  if (bulletFixesNeeded <= 2 && atsScore >= 75 && hasMetricsInText) {
    bulletCheck = {
      id: 'bullet_impact',
      label: 'Action Verbs & Bullet Impact',
      status: 'pass',
      detail: 'Bullets demonstrate clear ownership and measurable outcomes.',
      points: 8,
      maxPoints: 8,
    };
  } else if (bulletFixesNeeded <= 4 || atsScore >= 55) {
    bulletCheck = {
      id: 'bullet_impact',
      label: 'Action Verbs & Bullet Impact',
      status: 'warn',
      detail: `${bulletFixesNeeded} bullet refinement(s) suggested to highlight impact and metrics.`,
      points: 5,
      maxPoints: 8,
    };
  } else {
    bulletCheck = {
      id: 'bullet_impact',
      label: 'Action Verbs & Bullet Impact',
      status: 'fail',
      detail: 'Start experience/project bullets with strong action verbs and real outcomes.',
      points: 2,
      maxPoints: 8,
    };
  }

  // Check E: Professional Summary Quality (8 pts)
  const summarySection = sections.find((s) =>
    /summary|objective|profile|headline/i.test(s.section)
  );
  let summaryCheck: ResumeStandardCheck;
  if (summarySection?.status === 'strong' || (!summarySection && atsScore >= 75)) {
    summaryCheck = {
      id: 'summary_quality',
      label: 'Professional Summary Standard',
      status: 'pass',
      detail: 'Concise, role-aligned career summary positioned at the top.',
      points: 8,
      maxPoints: 8,
    };
  } else if (summarySection?.status === 'missing') {
    summaryCheck = {
      id: 'summary_quality',
      label: 'Professional Summary Standard',
      status: 'fail',
      detail: 'Missing top summary/profile statement; use the generated draft below.',
      points: 1,
      maxPoints: 8,
    };
  } else {
    summaryCheck = {
      id: 'summary_quality',
      label: 'Professional Summary Standard',
      status: 'warn',
      detail: 'Tailor your opening summary specifically to the target role and key skills.',
      points: 4,
      maxPoints: 8,
    };
  }

  const checks = [sectionsCheck, formatCheck, keywordCheck, bulletCheck, summaryCheck];
  const standardsComponent = checks.reduce((sum, item) => sum + item.points, 0);
  const standardsMax = checks.reduce((sum, item) => sum + item.maxPoints, 0);
  const score = Math.max(0, Math.min(100, atsComponent + standardsComponent));
  const passedChecksCount = checks.filter((c) => c.status === 'pass').length;

  let tierLabel: ResumeHealthResult['tierLabel'] = 'Low';
  let tone: ResumeHealthResult['tone'] = 'danger';
  if (score >= 80) {
    tierLabel = 'Strong';
    tone = 'verified';
  } else if (score >= 65) {
    tierLabel = 'Good';
    tone = 'info';
  } else if (score >= 45) {
    tierLabel = 'Needs Work';
    tone = 'warning';
  }

  return {
    score,
    tierLabel,
    tone,
    atsComponent,
    atsMax: 55,
    standardsComponent,
    standardsMax,
    passedChecksCount,
    checks,
  };
}
