import type { EligibilityEvaluation, EligibilityInput, EligibilityRules } from '../types';

const QUALIFICATION_HIERARCHY: Record<string, number> = {
  '10th Pass': 1,
  '12th Pass': 2,
  Diploma: 3,
  'Bachelor Degree': 4,
  Graduate: 4,
  'B.Tech': 4,
  'B.E.': 4,
  'B.Sc': 4,
  BCA: 4,
  'B.Com': 4,
  'B.A.': 4,
  'Master Degree': 5,
  'Post Graduate': 5,
  'M.Tech': 5,
  'M.Sc': 5,
  MCA: 5,
  MBA: 5,
  PhD: 6,
};

function getQualificationRank(qual: string): number {
  const normalized = qual.trim().toLowerCase();
  for (const [key, rank] of Object.entries(QUALIFICATION_HIERARCHY)) {
    if (normalized.includes(key.toLowerCase())) return rank;
  }
  return 0;
}

function parsePercentage(raw: string): number | null {
  if (!raw.trim()) return null;
  const num = Number(raw.replace('%', '').trim());
  if (Number.isNaN(num) || num < 0) return null;
  // Convert 10-point CGPA to indicative percentage if <= 10
  if (num <= 10) return Number((num * 9.5).toFixed(1));
  return num;
}

export function calculateAgeFromDob(dob: string): number | null {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

export function evaluateEligibility(
  input: EligibilityInput,
  rules: EligibilityRules,
  sourceReference: string
): EligibilityEvaluation {
  const matchedRequirements: string[] = [];
  const unmatchedRequirements: string[] = [];
  const missingInformation: string[] = [];
  const warnings: string[] = [];

  const effectiveAge = input.dob ? calculateAgeFromDob(input.dob) : input.age;

  // 1. Age Rule Evaluation
  if (rules.minAge !== undefined || rules.maxAge !== undefined) {
    if (effectiveAge === null || Number.isNaN(effectiveAge)) {
      missingInformation.push('Date of birth or current age is required to verify age limits.');
    } else {
      const minOk = rules.minAge === undefined || effectiveAge >= rules.minAge;
      const maxOk = rules.maxAge === undefined || effectiveAge <= rules.maxAge;

      if (!minOk) {
        unmatchedRequirements.push(
          `Minimum age required is ${rules.minAge} years (your calculated age: ${effectiveAge}).`
        );
      } else if (!maxOk) {
        if (input.category !== 'General' && rules.ageRelaxationNote) {
          warnings.push(
            `Your age (${effectiveAge}) exceeds the base upper limit (${rules.maxAge} years), but ${input.category} age relaxation may apply: "${rules.ageRelaxationNote}". Verify exact cutoff date in the official notification.`
          );
          missingInformation.push(
            `Age relaxation verification required for ${input.category} category against official cut-off date.`
          );
        } else {
          unmatchedRequirements.push(
            `Maximum general age limit is ${rules.maxAge} years (your age: ${effectiveAge}).`
          );
        }
      } else {
        matchedRequirements.push(
          `Age (${effectiveAge} years) is within the published range (${rules.minAge ?? 18}–${rules.maxAge ?? 'No upper'} years).`
        );
      }
    }
  }

  // 2. Educational Qualification Evaluation
  if (rules.requiredQualifications && rules.requiredQualifications.length > 0) {
    if (!input.highestQualification.trim()) {
      missingInformation.push('Highest educational qualification is required.');
    } else {
      const userRank = getQualificationRank(input.highestQualification);
      const degreeText = `${input.highestQualification} ${input.degreeName}`.toLowerCase();

      const directMatch = rules.requiredQualifications.some((req) =>
        degreeText.includes(req.toLowerCase())
      );
      const minRequiredRank = Math.min(
        ...rules.requiredQualifications.map((q) => getQualificationRank(q)).filter((r) => r > 0),
        99
      );

      if (directMatch || (userRank > 0 && minRequiredRank < 99 && userRank >= minRequiredRank)) {
        matchedRequirements.push(
          `Educational qualification (${input.highestQualification}${input.degreeName ? ` — ${input.degreeName}` : ''}) satisfies the published requirement (${rules.requiredQualifications.join(' / ')}).`
        );
      } else if (userRank === 0) {
        missingInformation.push(
          `Qualification equivalence for "${input.highestQualification}" could not be matched automatically against (${rules.requiredQualifications.join(', ')}).`
        );
      } else {
        unmatchedRequirements.push(
          `Published requirement specifies ${rules.requiredQualifications.join(' or ')}, whereas your entered qualification is ${input.highestQualification}.`
        );
      }
    }
  }

  // 3. Percentage / CGPA Check
  if (rules.minPercentage !== undefined && rules.minPercentage > 0) {
    const pct = parsePercentage(input.percentageOrCgpa);
    if (pct === null) {
      missingInformation.push(
        `Minimum ${rules.minPercentage}% marks requirement published — please enter your percentage or CGPA.`
      );
    } else if (pct >= rules.minPercentage) {
      matchedRequirements.push(
        `Academic score (~${pct}%) meets the minimum ${rules.minPercentage}% requirement.`
      );
    } else {
      unmatchedRequirements.push(
        `Academic score (~${pct}%) is below the published ${rules.minPercentage}% minimum.`
      );
    }
  }

  // 4. Work Experience Check
  if (rules.minExperienceYears !== undefined && rules.minExperienceYears > 0) {
    if (input.workExperienceYears === null || Number.isNaN(input.workExperienceYears)) {
      missingInformation.push(
        `Minimum ${rules.minExperienceYears} year(s) of experience required — enter your experience.`
      );
    } else if (input.workExperienceYears >= rules.minExperienceYears) {
      matchedRequirements.push(
        `Work experience (${input.workExperienceYears} yrs) meets the minimum ${rules.minExperienceYears} year(s) requirement.`
      );
    } else {
      unmatchedRequirements.push(
        `Minimum ${rules.minExperienceYears} year(s) experience required (entered: ${input.workExperienceYears} yrs).`
      );
    }
  }

  // 5. Nationality Check
  if (rules.requiredNationality) {
    if (!input.nationality.trim()) {
      missingInformation.push(`Nationality confirmation (${rules.requiredNationality}) is required.`);
    } else if (input.nationality.trim().toLowerCase() === rules.requiredNationality.toLowerCase()) {
      matchedRequirements.push(`Nationality (${input.nationality}) matches published eligibility.`);
    } else {
      unmatchedRequirements.push(
        `Published requirement specifies ${rules.requiredNationality} nationality.`
      );
    }
  }

  // 6. State / Domicile Check
  if (rules.requiredStates && rules.requiredStates.length > 0) {
    if (!input.state.trim()) {
      missingInformation.push(`State / domicile information required (${rules.requiredStates.join(', ')}).`);
    } else if (
      rules.requiredStates.some((s) => s.toLowerCase() === input.state.trim().toLowerCase())
    ) {
      matchedRequirements.push(`State / location (${input.state}) matches listed states.`);
    } else {
      warnings.push(
        `This opportunity lists specific domicile/location requirements (${rules.requiredStates.join(', ')}). Confirm state relaxation rules on the official portal.`
      );
      missingInformation.push('State domicile verification required.');
    }
  }

  if (rules.notificationDate) {
    warnings.push(
      `Calculated using rules referenced from notification dated ${rules.notificationDate}. The official recruiting authority makes the final eligibility decision.`
    );
  } else {
    warnings.push(
      'The official recruiting authority makes the final eligibility decision based on the original notification and document verification.'
    );
  }

  let result: EligibilityEvaluation['result'] = 'Eligible';
  if (unmatchedRequirements.length > 0) {
    result = 'Not Eligible';
  } else if (missingInformation.length > 0) {
    result = 'Needs Verification';
  }

  return {
    result,
    matchedRequirements,
    unmatchedRequirements,
    missingInformation,
    warnings,
    sourceReference,
  };
}
