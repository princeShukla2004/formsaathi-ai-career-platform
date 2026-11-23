import type { JobListing, JobMatchResult, UserProfile } from '../types';

const QUAL_LEVELS: Array<{ keywords: string[]; rank: number }> = [
  { keywords: ['10th', 'matric', 'sslc'], rank: 1 },
  { keywords: ['12th', 'hsc', 'intermediate', 'higher secondary'], rank: 2 },
  { keywords: ['diploma', 'iti', 'polytechnic'], rank: 3 },
  {
    keywords: ['bachelor', 'graduate', 'b.tech', 'b.e.', 'bca', 'b.sc', 'b.com', 'ba ', 'degree'],
    rank: 4,
  },
  { keywords: ['master', 'post graduate', 'm.tech', 'mca', 'm.sc', 'mba'], rank: 5 },
  { keywords: ['phd', 'doctorate'], rank: 6 },
];

function inferQualRank(text: string): number {
  const lower = text.toLowerCase();
  for (const level of QUAL_LEVELS) {
    if (level.keywords.some((kw) => lower.includes(kw))) {
      return level.rank;
    }
  }
  return 0;
}

function parseMinYearsFromText(expText: string): number {
  const match = expText.match(/(\d+)/);
  if (!match) return 0;
  const lower = expText.toLowerCase();
  if (lower.includes('fresher') || lower.includes('0')) return 0;
  return Number(match[1]) || 0;
}

export function computeJobMatch(
  job: JobListing,
  profile: Partial<UserProfile> | null | undefined
): JobMatchResult {
  const reasons: string[] = [];
  const userSkills = (profile?.skills || []).map((s) => s.trim()).filter(Boolean);
  const jobText = `${job.title} ${job.category} ${job.description} ${job.responsibilities.join(' ')} ${job.qualifications.join(' ')}`.toLowerCase();

  // Extract common skill tokens present in the job listing for transparent comparison
  const domainKeywords = [
    'SQL',
    'Python',
    'Excel',
    'Power BI',
    'Tableau',
    'JavaScript',
    'TypeScript',
    'React',
    'Java',
    'Data Analysis',
    'Communication',
    'General Studies',
    'Reasoning',
    'Quantitative Aptitude',
    'English',
    'Engineering',
    'HTML',
    'CSS',
    'MS Office',
    'Git',
  ];

  const relevantJobSkills = domainKeywords.filter((kw) => jobText.includes(kw.toLowerCase()));
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  if (userSkills.length > 0 && relevantJobSkills.length > 0) {
    for (const jSkill of relevantJobSkills) {
      const hit = userSkills.some(
        (u) =>
          u.toLowerCase() === jSkill.toLowerCase() ||
          u.toLowerCase().includes(jSkill.toLowerCase()) ||
          jSkill.toLowerCase().includes(u.toLowerCase())
      );
      if (hit) matchedSkills.push(jSkill);
      else missingSkills.push(jSkill);
    }
  } else if (userSkills.length > 0) {
    for (const u of userSkills) {
      if (jobText.includes(u.toLowerCase())) matchedSkills.push(u);
    }
  }

  let score = 35; // Baseline when profile is sparse

  // 1. Skill weight (up to 30 pts)
  if (relevantJobSkills.length > 0 && userSkills.length > 0) {
    const ratio = matchedSkills.length / Math.max(1, relevantJobSkills.length);
    score += Math.round(ratio * 30);
    if (matchedSkills.length > 0) {
      reasons.push(`${matchedSkills.length} listed skill(s) align with job description`);
    }
  } else if (matchedSkills.length > 0) {
    score += Math.min(25, matchedSkills.length * 8);
    reasons.push(`Matched ${matchedSkills.length} profile skill(s)`);
  }

  // 2. Qualification match (up to 20 pts)
  let qualificationMatch: JobMatchResult['qualificationMatch'] = 'Partial';
  const userQual = (profile?.qualification || profile?.education || '').trim();
  const jobQuals = job.qualifications || [];
  if (userQual && jobQuals.length > 0) {
    const directHit = jobQuals.some(
      (q) =>
        q.toLowerCase().includes(userQual.toLowerCase()) ||
        userQual.toLowerCase().includes(q.toLowerCase())
    );
    const userRank = inferQualRank(userQual);
    const minJobRank = Math.min(...jobQuals.map((q) => inferQualRank(q)).filter((r) => r > 0), 99);
    if (directHit || (userRank > 0 && minJobRank < 99 && userRank >= minJobRank)) {
      qualificationMatch = 'Match';
      score += 20;
      reasons.push(`Qualification (${userQual}) aligns with listed criteria`);
    } else if (userRank > 0 && minJobRank < 99 && userRank < minJobRank) {
      qualificationMatch = 'Missing';
      reasons.push('Published listing asks for a higher qualification tier');
    } else {
      score += 10;
    }
  } else if (userQual) {
    score += 10;
  }

  // 3. Experience match (up to 15 pts)
  let experienceMatch: JobMatchResult['experienceMatch'] = 'Unverified';
  if (typeof profile?.experience === 'number') {
    const minYears = job.eligibilityRules?.minExperienceYears ?? parseMinYearsFromText(job.experience);
    if (profile.experience >= minYears) {
      experienceMatch = 'Match';
      score += 15;
    } else {
      experienceMatch = 'Stretch';
      score += 5;
      reasons.push(`Requires ~${minYears}+ years experience (profile shows ${profile.experience} yrs)`);
    }
  }

  // 4. Category & Location preferences (up to 15 pts)
  const catHit = (profile?.preferredCategories || []).some(
    (c) => c.toLowerCase() === job.category.toLowerCase()
  );
  if (catHit) {
    score += 8;
    reasons.push(`Matches preferred category: ${job.category}`);
  }

  const prefLocs = profile?.preferredLocations || [];
  const locationMatch =
    prefLocs.length === 0
      ? job.location.toLowerCase().includes('all india') || job.workMode === 'remote'
      : prefLocs.some(
          (l) =>
            job.location.toLowerCase().includes(l.toLowerCase()) ||
            job.location.toLowerCase().includes('all india') ||
            job.workMode === 'remote'
        );
  if (locationMatch) {
    score += 7;
  }

  const workModeMatch = job.workMode === 'remote' || job.workMode === 'hybrid';
  const clampedScore = Math.max(15, Math.min(98, score));
  const tier: JobMatchResult['tier'] =
    clampedScore >= 75 ? 'Strong Match' : clampedScore >= 55 ? 'Good Fit' : 'Partial Match';

  if (reasons.length === 0) {
    reasons.push('Complete your skills, qualification, and preferences in Profile Settings for sharper scoring.');
  }

  return {
    score: clampedScore,
    tier,
    matchedSkills,
    missingSkills: missingSkills.slice(0, 6),
    qualificationMatch,
    experienceMatch,
    locationMatch,
    workModeMatch,
    reasons,
  };
}
