export type LanguageCode = 'en' | 'hi';

export type JobSector = 'government' | 'private' | 'internship';
export type WorkMode = 'onsite' | 'remote' | 'hybrid';
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'expired';

export interface EligibilityRules {
  minAge?: number;
  maxAge?: number;
  minPercentage?: number;
  minExperienceYears?: number;
  requiredQualifications: string[];
  requiredNationality?: string;
  requiredStates?: string[];
  ageRelaxationNote?: string;
  notificationDate?: string;
}

export interface JobListing {
  id: string;
  title: string;
  organization: string;
  organizationLogo?: string;
  category: string;
  sector: JobSector;
  location: string;
  employmentType: string;
  workMode: WorkMode;
  experience: string;
  qualifications: string[];
  eligibilityRules: EligibilityRules;
  description: string;
  responsibilities: string[];
  salary: string;
  importantDates: {
    notificationDate?: string;
    startDate?: string;
    lastDate?: string;
    examOrInterviewDate?: string;
  };
  applicationFee: string;
  requiredDocuments: string[];
  selectionProcess: string[];
  applicationInstructions: string;
  officialSourceURL: string;
  applicationURL: string;
  sourceName?: string;
  verificationStatus: VerificationStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  expiresAt?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  isReferencePortal?: boolean;
}

export interface JobCategory {
  id: string;
  slug: string;
  name: string;
  nameHi?: string;
  sector: JobSector | 'all';
  description?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  portfolio?: string;
  summary?: string;
  certifications?: string[];
  preferredLanguage: LanguageCode;
  education?: string;
  qualification?: string;
  skills?: string[];
  experience?: number;
  preferredLocations?: string[];
  preferredCategories?: string[];
  status: 'active' | 'suspended';
  consentGiven?: boolean;
  notificationPrefs?: {
    matchingJobs: boolean;
    deadlines: boolean;
    interviews: boolean;
    resumeReminders: boolean;
    jobAlertEmailEnabled?: boolean;
    jobAlertFrequency?: 'instant' | 'daily' | 'weekly';
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface SavedJob {
  id: string;
  userId: string;
  jobId: string;
  jobTitle: string;
  organization: string;
  deadline?: string;
  savedAt?: string;
}

export type ApplicationStatus =
  | 'Saved'
  | 'Planning to Apply'
  | 'Applied'
  | 'Assessment'
  | 'Interview'
  | 'Selected'
  | 'Rejected'
  | 'Withdrawn';

export interface ApplicationRecord {
  id: string;
  userId: string;
  jobId?: string;
  jobTitle: string;
  organization: string;
  status: ApplicationStatus;
  appliedAt?: string;
  deadline?: string;
  interviewDate?: string;
  followUpDate?: string;
  notes?: string;
  applicationURL?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EligibilityInput {
  age: number | null;
  dob?: string;
  highestQualification: string;
  degreeName: string;
  passingYear: string;
  percentageOrCgpa: string;
  workExperienceYears: number | null;
  nationality: string;
  state: string;
  category: 'General' | 'OBC' | 'SC' | 'ST' | 'EWS' | 'PwBD';
}

export interface EligibilityEvaluation {
  result: 'Eligible' | 'Not Eligible' | 'Needs Verification';
  matchedRequirements: string[];
  unmatchedRequirements: string[];
  missingInformation: string[];
  warnings: string[];
  sourceReference: string;
}

export interface EligibilityCheckRecord {
  id: string;
  userId: string;
  jobId: string;
  jobTitle: string;
  result: 'Eligible' | 'Not Eligible' | 'Needs Verification';
  matchedRequirements: string[];
  unmatchedRequirements: string[];
  missingInformation: string[];
  sourceReference?: string;
  checkedAt?: string;
}

export type ResumeTemplateId = 'modern' | 'minimal_ats' | 'fresh_graduate' | 'technical';

export interface ResumeEducationItem {
  institution: string;
  degree: string;
  year: string;
  score: string;
}

export interface ResumeExperienceItem {
  role: string;
  organization: string;
  duration: string;
  highlights: string;
}

export interface ResumeProjectItem {
  name: string;
  techStack: string;
  description: string;
}

export interface ResumeRecord {
  id: string;
  userId: string;
  title: string;
  template: ResumeTemplateId;
  personalDetails: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    portfolio?: string;
  };
  summary: string;
  education: ResumeEducationItem[];
  experience: ResumeExperienceItem[];
  internships: ResumeExperienceItem[];
  projects: ResumeProjectItem[];
  skills: string[];
  certifications: string[];
  languages: string[];
  achievements: string[];
  sectionOrder: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentChecklistItem {
  id: string;
  name: string;
  completed: boolean;
  specs: string;
  allowedFormats: string;
  maxSizeLabel: string;
  guidance: string;
  uploadedFileName?: string;
  uploadedFilePath?: string;
  uploadedAt?: string;
}

export interface DocumentChecklist {
  id: string;
  userId: string;
  title: string;
  jobId?: string;
  items: DocumentChecklistItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  disclaimer?: string;
}

export interface AIChatSession {
  id: string;
  userId: string;
  title: string;
  language: LanguageCode;
  jobId?: string;
  messages: AIChatMessage[];
  createdAt?: string;
  updatedAt?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: 'matching_job' | 'deadline' | 'interview' | 'follow_up' | 'resume' | 'account' | 'exam_reminder';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt?: string;
}

export interface JobReport {
  id: string;
  jobId: string;
  jobTitle?: string;
  reporterId: string;
  reason: string;
  warningIndicators?: string[];
  adminNote?: string;
  status: 'open' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt?: string;
  updatedAt?: string;
}

export interface SupportTicket {
  id: string;
  userId?: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt?: string;
  updatedAt?: string;
}

export interface SubscriptionRecord {
  userId: string;
  plan: 'free' | 'pro';
  status: 'active' | 'test_pending' | 'canceled';
  aiQueriesUsed: number;
  eligibilityChecksUsed: number;
  updatedAt?: string;
}

export interface AdminAuditLog {
  id: string;
  adminUid: string;
  adminEmail?: string;
  action: string;
  targetId: string;
  details?: string;
  createdAt?: string;
}

export interface PlatformSetting {
  id: string;
  announcementBanner?: string;
  showAnnouncement: boolean;
  aiDailyLimitFree: number;
  eligibilityLimitFree: number;
  updatedAt?: string;
}

// --- FormSaathi 2.0 Types ---

export type AIFeatureType =
  | 'assistant'
  | 'resume_assist'
  | 'resume_analyzer'
  | 'mock_interview'
  | 'career_roadmap'
  | 'form_assistant';

export interface ResumeAnalysisRecord {
  id: string;
  userId: string;
  fileName: string;
  targetRole: string;
  jobDescriptionSnippet: string;
  storagePath?: string;
  atsScore: number;
  keywordMatchScore: number;
  summaryFeedback: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  sectionSuggestions: Array<{
    section: string;
    status: 'strong' | 'needs_work' | 'missing';
    feedback: string;
  }>;
  bulletImprovements: string[];
  improvedSummary: string;
  createdAt?: string;
}

export interface MockInterviewMessage {
  role: 'interviewer' | 'candidate';
  content: string;
  questionIndex?: number;
  evaluation?: {
    relevanceScore: number;
    clarityScore: number;
    structureScore: number;
    completenessScore: number;
    strengths: string[];
    improvements: string[];
    modelAnswerTip: string;
  };
  timestamp: string;
}

export interface MockInterviewSession {
  id: string;
  userId: string;
  roleTitle: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  durationMinutes: number;
  questionCount: number;
  status: 'in_progress' | 'completed';
  overallScore: number;
  messages: MockInterviewMessage[];
  finalFeedback?: {
    summary: string;
    topStrengths: string[];
    priorityImprovements: string[];
    disclaimer: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export type ExamCategoryType =
  | 'UPSC'
  | 'SSC'
  | 'Banking'
  | 'Railway'
  | 'Engineering'
  | 'State Govt'
  | 'Defence'
  | 'Teaching';

export interface ExamEvent {
  id: string;
  title: string;
  organization: string;
  category: ExamCategoryType;
  notificationStatus: 'Official Calendar Reference' | 'Upcoming Cycle' | 'Active' | 'Closed';
  applicationStartDate?: string;
  lastDate?: string;
  examDate?: string;
  admitCardNote?: string;
  officialURL: string;
  lastVerifiedAt: string;
  notes?: string;
  isPublished: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SavedExamReminder {
  id: string;
  userId: string;
  examId: string;
  title: string;
  organization: string;
  lastDate?: string;
  examDate?: string;
  officialURL: string;
  savedAt?: string;
}

export interface JobMatchResult {
  score: number;
  tier: 'Strong Match' | 'Good Fit' | 'Partial Match';
  matchedSkills: string[];
  missingSkills: string[];
  qualificationMatch: 'Match' | 'Partial' | 'Missing';
  experienceMatch: 'Match' | 'Stretch' | 'Unverified';
  locationMatch: boolean;
  workModeMatch: boolean;
  reasons: string[];
}

export interface ScamCheckResult {
  statusLabel: 'Verified' | 'Under Review' | 'Unverified' | 'Expired';
  riskLevel: 'low' | 'caution' | 'review';
  warningIndicators: string[];
}

export interface QuestionBankItem {
  id: string;
  examCategory: 'SSC' | 'Railway' | 'Banking' | 'UPSC' | 'State Govt' | 'General';
  topic: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MockTestQuestionSnapshot {
  id: string;
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
}

export interface MockTest {
  id: string;
  title: string;
  examCategory: 'SSC' | 'Railway' | 'Banking' | 'UPSC' | 'State Govt' | 'General';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  durationMinutes: number;
  totalMarks: number;
  negativeMarking: number;
  isUnofficialPractice: boolean;
  status: 'draft' | 'published' | 'archived';
  questions: MockTestQuestionSnapshot[];
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MockTestAttempt {
  id: string;
  userId: string;
  testId: string;
  testTitle: string;
  examCategory: string;
  score: number;
  totalMarks: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  accuracyPercent: number;
  timeSpentSeconds: number;
  answers: Record<string, number>;
  createdAt?: string;
}

export interface RoadmapStage {
  id: string;
  stageName: 'Beginner' | 'Intermediate' | 'Advanced';
  durationLabel: string;
  objectives: string[];
  skills: string[];
  milestones: Array<{
    id: string;
    title: string;
    description: string;
  }>;
  projects: string[];
  resources: Array<{
    title: string;
    type: string;
    url?: string;
  }>;
}

export interface CareerRoadmapRecord {
  id: string;
  userId: string;
  targetGoal: string;
  currentLevel: string;
  weeklyHours: number;
  overview: string;
  stages: RoadmapStage[];
  weeklyPlan: string[];
  completedStepIds: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type LearningCategoryType =
  | 'Advanced Excel'
  | 'SQL'
  | 'Power BI'
  | 'Tableau'
  | 'Data Visualization'
  | 'Business Analytics'
  | 'Communication Skills'
  | 'Interview Preparation'
  | 'Resume Writing';

export interface LearningLesson {
  id: string;
  title: string;
  durationMinutes: number;
  summary: string;
  keyTakeaways: string[];
  practicePrompt: string;
  externalResourceLabel?: string;
  externalResourceURL?: string;
}

export interface LearningPath {
  id: string;
  title: string;
  category: LearningCategoryType;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  estimatedHours: number;
  lessons: LearningLesson[];
  isPublished: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LearningProgressRecord {
  id: string;
  userId: string;
  pathId: string;
  pathTitle: string;
  completedLessonIds: string[];
  updatedAt?: string;
}

export interface JobComparisonRecord {
  id: string;
  userId: string;
  title: string;
  jobIds: string[];
  createdAt?: string;
}

export interface UserFeedbackRecord {
  id: string;
  userId: string;
  name: string;
  email: string;
  category: 'Feature Request' | 'Bug Report' | 'Content Accuracy' | 'General Feedback';
  rating: number;
  message: string;
  status: 'open' | 'reviewed' | 'resolved';
  adminNote?: string;
  createdAt?: string;
  updatedAt?: string;
}
