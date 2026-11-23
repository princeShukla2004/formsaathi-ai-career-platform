import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  Bot,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  FileText,
  Mic,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  fetchCareerRoadmaps,
  fetchEligibilityHistory,
  fetchMockInterviews,
  fetchMockTestAttempts,
  fetchResumeAnalyses,
  fetchSavedExams,
  fetchUserApplications,
  fetchUserResumes,
  fetchVerifiedJobs,
} from '../../services/firestoreService';
import { computeJobMatch } from '../../utils/jobMatching';
import type {
  ApplicationRecord,
  CareerRoadmapRecord,
  EligibilityCheckRecord,
  JobListing,
  MockInterviewSession,
  MockTestAttempt,
  ResumeAnalysisRecord,
  ResumeRecord,
  SavedExamReminder,
} from '../../types';

export function DashboardOverviewPage() {
  const { user, profile, savedJobs } = useAuth();
  const { t } = useLanguage();

  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [checks, setChecks] = useState<EligibilityCheckRecord[]>([]);
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [analyses, setAnalyses] = useState<ResumeAnalysisRecord[]>([]);
  const [interviews, setInterviews] = useState<MockInterviewSession[]>([]);
  const [attempts, setAttempts] = useState<MockTestAttempt[]>([]);
  const [savedExams, setSavedExams] = useState<SavedExamReminder[]>([]);
  const [roadmaps, setRoadmaps] = useState<CareerRoadmapRecord[]>([]);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      fetchUserApplications(user.uid).catch(() => []),
      fetchEligibilityHistory(user.uid).catch(() => []),
      fetchUserResumes(user.uid).catch(() => []),
      fetchResumeAnalyses(user.uid).catch(() => []),
      fetchMockInterviews(user.uid).catch(() => []),
      fetchMockTestAttempts(user.uid).catch(() => []),
      fetchSavedExams(user.uid).catch(() => []),
      fetchCareerRoadmaps(user.uid).catch(() => []),
      fetchVerifiedJobs().then((r) => r.jobs).catch(() => []),
    ])
      .then(([apps, elig, res, rAn, mint, mta, sEx, rds, jobList]) => {
        setApplications(apps);
        setChecks(elig);
        setResumes(res);
        setAnalyses(rAn);
        setInterviews(mint);
        setAttempts(mta);
        setSavedExams(sEx);
        setRoadmaps(rds);
        setJobs(jobList);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const appliedCount = applications.filter((a) =>
    ['Applied', 'Assessment', 'Interview', 'Selected'].includes(a.status)
  ).length;
  const upcomingDeadlines = applications.filter((a) => Boolean(a.deadline));

  const rankedMatches = jobs
    .map((job) => ({ job, match: computeJobMatch(job, profile) }))
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, 4);

  const profileFields = [
    profile?.name,
    profile?.qualification,
    profile?.education,
    (profile?.skills?.length || 0) > 0,
    (profile?.preferredCategories?.length || 0) > 0,
    (profile?.preferredLocations?.length || 0) > 0,
  ];
  const profileCompletion = Math.round(
    (profileFields.filter(Boolean).length / profileFields.length) * 100
  );

  const primaryResume = resumes[0];
  const resumeCompletion = primaryResume
    ? Math.min(
        100,
        [
          primaryResume.personalDetails?.fullName,
          primaryResume.summary,
          primaryResume.education?.length,
          primaryResume.skills?.length,
          primaryResume.projects?.length || primaryResume.experience?.length,
        ].filter(Boolean).length * 20
      )
    : 0;

  const avgTestAccuracy = attempts.length
    ? Math.round(attempts.reduce((sum, a) => sum + (a.accuracyPercent || 0), 0) / attempts.length)
    : 0;

  const completedRoadmapSteps = roadmaps.reduce(
    (sum, r) => sum + (r.completedStepIds?.length || 0),
    0
  );

  const activityBars = [
    { label: 'Applications', count: applications.length, max: 12 },
    { label: 'Saved Jobs', count: savedJobs.length, max: 15 },
    { label: 'Mock Tests', count: attempts.length, max: 10 },
    { label: 'Interviews', count: interviews.length, max: 10 },
    { label: 'ATS Scans', count: analyses.length, max: 10 },
    { label: 'Roadmap Steps', count: completedRoadmapSteps, max: 20 },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#14243A] dark:text-white">
            {t('welcomeBack')}, {profile?.name || user?.displayName || 'Candidate'}!
          </h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1">
            {t('dashboardSubtitle')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/jobs"
            className="px-4 py-2 text-xs font-semibold text-white bg-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
          >
            Explore Jobs
          </Link>
          <Link
            to="/dashboard/mock-interview"
            className="px-4 py-2 text-xs font-semibold border border-[#E2E8F0] dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Practice Interview
          </Link>
        </div>
      </div>

      {/* 6 Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: t('savedJobsCard'), value: savedJobs.length, icon: Bookmark, to: '/dashboard/saved' },
          { label: t('appliedJobsCard'), value: appliedCount, icon: Briefcase, to: '/dashboard/applications' },
          { label: 'Exam Reminders', value: savedExams.length, icon: CalendarDays, to: '/dashboard/exam-calendar' },
          { label: 'Mock Tests', value: attempts.length, icon: ClipboardCheck, to: '/dashboard/mock-tests' },
          { label: 'Mock Interviews', value: interviews.length, icon: Mic, to: '/dashboard/mock-interview' },
          { label: t('eligibilityCard'), value: checks.length, icon: CheckCircle2, to: '/dashboard/eligibility' },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              to={card.to}
              className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 hover:border-[#14B8A6] rounded-xl p-4 transition-colors"
            >
              <div className="flex items-center justify-between text-[#64748B] dark:text-slate-400 mb-2">
                <span className="text-xs font-medium truncate">{card.label}</span>
                <Icon className="w-4 h-4 text-[#0D9488] shrink-0" />
              </div>
              <p className="text-2xl font-bold font-mono-num text-[#14243A] dark:text-white">
                {loading ? '—' : card.value}
              </p>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Career Activity & Preparation Progress */}
          <section className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-[#172033] dark:text-white">
                  Career Preparation &amp; Activity Overview
                </h2>
                <p className="text-xs text-[#64748B] dark:text-slate-400">
                  Real activity recorded across your applications, mock tests, ATS checks, and roadmaps.
                </p>
              </div>
              {attempts.length > 0 && (
                <span className="text-xs font-mono-num font-semibold text-[#0D9488] dark:text-teal-300">
                  Avg Mock Accuracy: {avgTestAccuracy}%
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activityBars.map((item) => {
                const pct = Math.min(100, Math.round((item.count / item.max) * 100));
                return (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#172033] dark:text-slate-200">{item.label}</span>
                      <span className="font-mono-num text-[#64748B] dark:text-slate-400">{item.count}</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#14B8A6] rounded-full transition-all"
                        style={{ width: `${Math.max(item.count > 0 ? 8 : 0, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Intelligent Job Matches */}
          <section className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#172033] dark:text-white">
                  Intelligent Profile Matches
                </h2>
                <p className="text-xs text-[#64748B] dark:text-slate-400">
                  Ranked by your qualification, skills, experience, and preferred locations.
                </p>
              </div>
              <Link to="/dashboard/recommended" className="text-xs font-semibold text-[#0D9488] hover:underline">
                View all
              </Link>
            </div>
            {rankedMatches.length === 0 ? (
              <p className="text-sm text-[#64748B] dark:text-slate-400">
                Complete your profile settings to unlock tailored opportunity scoring.
              </p>
            ) : (
              <div className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
                {rankedMatches.map(({ job, match }) => (
                  <div key={job.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <Link
                        to={`/jobs/${job.id}`}
                        className="text-sm font-semibold text-[#172033] dark:text-slate-100 hover:text-[#0D9488] block truncate"
                      >
                        {job.title}
                      </Link>
                      <p className="text-xs text-[#64748B] dark:text-slate-400 truncate">
                        {job.organization} · {job.location}
                        {match.matchedSkills.length > 0 && ` · Skills: ${match.matchedSkills.slice(0, 2).join(', ')}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono-num text-xs font-semibold text-[#0D9488] dark:text-teal-300">
                        {match.score}% match
                      </span>
                      <Link
                        to={`/eligibility/${job.id}`}
                        className="text-xs font-semibold text-[#14243A] dark:text-slate-200 hover:underline"
                      >
                        Check
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Upcoming Exam Reminders & Deadlines */}
          <section className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#172033] dark:text-white">
                Saved Exam Reminders &amp; Application Deadlines
              </h2>
              <Link to="/dashboard/exam-calendar" className="text-xs font-semibold text-[#0D9488] hover:underline">
                Exam Calendar
              </Link>
            </div>
            {savedExams.length === 0 && upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-[#64748B] dark:text-slate-400">
                Save important dates from the Government Exam Calendar or track an application to see upcoming deadlines here.
              </p>
            ) : (
              <div className="divide-y divide-[#E2E8F0] dark:divide-slate-800 text-sm">
                {savedExams.slice(0, 3).map((ex) => (
                  <div key={ex.id} className="py-2.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{ex.title}</p>
                      <p className="text-xs text-[#64748B] dark:text-slate-400 truncate">
                        {ex.organization}
                      </p>
                    </div>
                    <span className="text-xs font-mono-num text-[#0D9488] shrink-0">
                      {ex.examDate || ex.lastDate || 'Reference'}
                    </span>
                  </div>
                ))}
                {upcomingDeadlines.slice(0, 3).map((app) => (
                  <div key={app.id} className="py-2.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{app.jobTitle}</p>
                      <p className="text-xs text-[#64748B] dark:text-slate-400 truncate">
                        {app.organization} · {app.status}
                      </p>
                    </div>
                    <span className="text-xs font-mono-num text-[#64748B] dark:text-slate-300 shrink-0">
                      Due: {app.deadline}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Profile Completion */}
          <section className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Profile Completion</h2>
              <span className="font-mono-num text-xs font-semibold text-[#0D9488]">
                {profileCompletion}%
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#14243A] dark:bg-[#14B8A6] h-full transition-all"
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
            <p className="text-xs text-[#64748B] dark:text-slate-400">
              {profileCompletion < 100
                ? 'Add skills, qualification, and preferred cities for more accurate job match scores.'
                : 'Your career profile is ready for accurate matching.'}
            </p>
            <Link
              to="/dashboard/profile"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0D9488] hover:underline"
            >
              <span>Edit Profile &amp; Skills</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </section>

          {/* Resume Readiness */}
          <section className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Resume Readiness</h2>
              <span className="font-mono-num text-xs font-semibold text-[#0D9488]">
                {resumeCompletion}%
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#14B8A6] h-full transition-all"
                style={{ width: `${resumeCompletion}%` }}
              />
            </div>
            <p className="text-xs text-[#64748B] dark:text-slate-400">
              {resumes.length === 0
                ? 'Build your ATS-ready resume or scan an existing PDF in Resume Analyzer.'
                : `${resumes.length} saved resume(s) · ${analyses.length} ATS analysis report(s).`}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/resume-studio"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0D9488] hover:underline"
              >
                <span>Resume Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                to="/dashboard/resume-analyzer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#14243A] dark:text-slate-200 hover:underline"
              >
                <span>ATS Analyzer</span>
              </Link>
            </div>
          </section>

          {/* Quick Actions */}
          <section className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-2.5">
            <h2 className="text-sm font-bold mb-2">FormSaathi 2.0 Quick Tools</h2>
            <Link
              to="/dashboard/resume-analyzer"
              className="flex items-center gap-2.5 text-xs font-medium py-1.5 hover:text-[#0D9488]"
            >
              <FileSearch className="w-4 h-4 text-[#14B8A6]" /> Analyze Resume PDF / Text
            </Link>
            <Link
              to="/dashboard/mock-interview"
              className="flex items-center gap-2.5 text-xs font-medium py-1.5 hover:text-[#0D9488]"
            >
              <Mic className="w-4 h-4 text-[#14B8A6]" /> Start AI Mock Interview
            </Link>
            <Link
              to="/dashboard/mock-tests"
              className="flex items-center gap-2.5 text-xs font-medium py-1.5 hover:text-[#0D9488]"
            >
              <ClipboardCheck className="w-4 h-4 text-[#14B8A6]" /> Practice Timed Mock Tests
            </Link>
            <Link
              to="/dashboard/career-roadmap"
              className="flex items-center gap-2.5 text-xs font-medium py-1.5 hover:text-[#0D9488]"
            >
              <Sparkles className="w-4 h-4 text-[#14B8A6]" /> Build Personalized Career Roadmap
            </Link>
            <Link
              to="/dashboard/learning-hub"
              className="flex items-center gap-2.5 text-xs font-medium py-1.5 hover:text-[#0D9488]"
            >
              <BookOpen className="w-4 h-4 text-[#14B8A6]" /> Skills &amp; Learning Hub
            </Link>
            <Link
              to="/tools/photo-resizer"
              className="flex items-center gap-2.5 text-xs font-medium py-1.5 hover:text-[#0D9488]"
            >
              <FileText className="w-4 h-4 text-[#14B8A6]" /> Photo &amp; Signature Resizer
            </Link>
            <Link
              to="/assistant"
              className="flex items-center gap-2.5 text-xs font-medium py-1.5 hover:text-[#0D9488]"
            >
              <Bot className="w-4 h-4 text-[#14B8A6]" /> Ask FormSaathi AI (EN / HI)
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
