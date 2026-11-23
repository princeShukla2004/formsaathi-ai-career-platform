/**
 * FormSaathi Security & Deterministic Eligibility Verification Suite
 * Run via `npx tsx firestore.rules.test.ts`
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { evaluateEligibility } from './src/utils/eligibilityEngine.ts';

console.log('Running FormSaathi 2.0 security rules & deterministic eligibility verification...');

const rulesContent = fs.readFileSync('./firestore.rules', 'utf8');
assert.ok(rulesContent.includes("rules_version = '2';"), 'Rules must use rules_version 2');
assert.ok(rulesContent.includes('allow read, write: if false;'), 'Global default deny must exist');
assert.ok(rulesContent.includes('request.auth.token.email_verified == true'), 'Email verification must be enforced');
assert.ok(!rulesContent.includes('allow read, write: if true;'), 'No unrestricted public read/write allowed');

// Assert FormSaathi 2.0 collections exist and are strictly guarded
for (const pathPattern of [
  'match /resumeAnalyses/{analysisId}',
  'match /mockInterviews/{interviewId}',
  'match /careerRoadmaps/{roadmapId}',
  'match /mockTestAttempts/{attemptId}',
  'match /savedExams/{examId}',
  'match /learningProgress/{progressId}',
  'match /jobComparisons/{comparisonId}',
  'match /mockTests/{testId}',
  'match /questionBank/{questionId}',
  'match /examEvents/{eventId}',
  'match /learningPaths/{pathId}',
  'match /userFeedback/{feedbackId}',
]) {
  assert.ok(rulesContent.includes(pathPattern), `Missing rules block for ${pathPattern}`);
}

// Test deterministic eligibility rules
const sampleJobRules = {
  minAge: 21,
  maxAge: 30,
  minPercentage: 60,
  minExperienceYears: 0,
  requiredQualifications: ['Bachelor Degree', 'B.Tech', 'B.Sc', 'BCA', 'Graduate'],
  requiredNationality: 'Indian',
  ageRelaxationNote: 'OBC: +3 yrs, SC/ST: +5 yrs per official notification',
};

const eligibleResult = evaluateEligibility(
  {
    age: 24,
    highestQualification: 'Bachelor Degree',
    degreeName: 'B.Tech Computer Science',
    passingYear: '2024',
    percentageOrCgpa: '74',
    workExperienceYears: 1,
    nationality: 'Indian',
    state: 'Karnataka',
    category: 'General',
  },
  sampleJobRules,
  'https://upsc.gov.in'
);
assert.equal(eligibleResult.result, 'Eligible', 'Expected Eligible for qualifying candidate');

const notEligibleResult = evaluateEligibility(
  {
    age: 19,
    highestQualification: '12th Pass',
    degreeName: 'HSC',
    passingYear: '2025',
    percentageOrCgpa: '80',
    workExperienceYears: 0,
    nationality: 'Indian',
    state: 'Maharashtra',
    category: 'General',
  },
  sampleJobRules,
  'https://upsc.gov.in'
);
assert.equal(notEligibleResult.result, 'Not Eligible', 'Expected Not Eligible when below minAge and qualification');

const needsVerificationResult = evaluateEligibility(
  {
    age: 32,
    highestQualification: 'Bachelor Degree',
    degreeName: 'BCA',
    passingYear: '2019',
    percentageOrCgpa: '',
    workExperienceYears: 2,
    nationality: 'Indian',
    state: 'Gujarat',
    category: 'OBC',
  },
  sampleJobRules,
  'https://upsc.gov.in'
);
assert.equal(needsVerificationResult.result, 'Needs Verification', 'Expected Needs Verification for category age relaxation / missing percentage');

console.log('All FormSaathi 2.0 security rule invariants and deterministic eligibility tests passed.');
