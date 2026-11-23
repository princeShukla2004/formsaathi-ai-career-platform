import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Database, PlusCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchAIUsageLogsAdmin,
  fetchAllJobsAdmin,
  fetchAllUsersAdmin,
  fetchExamEvents,
  fetchJobReportsAdmin,
  fetchLearningPaths,
  fetchMockTests,
  fetchUserFeedbackAdmin,
  seedStarterCatalogAdmin,
} from '../../services/firestoreService';
import type { JobListing, UserProfile } from '../../types';

export function AdminOverviewPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [aiCount, setAiCount] = useState(0);
  const [reportCount, setReportCount] = useState(0);
  const [examCount, setExamCount] = useState(0);
  const [mockTestCount, setMockTestCount] = useState(0);
  const [learningCount, setLearningCount] = useState(0);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [seedMsg, setSeedMsg] = useState('');
  const [seeding, setSeeding] = useState(false);

  const loadStats = () => {
    setLoading(true);
    Promise.all([
      fetchAllJobsAdmin().catch(() => []),
      fetchAllUsersAdmin().catch(() => []),
      fetchAIUsageLogsAdmin().catch(() => []),
      fetchJobReportsAdmin().catch(() => []),
      fetchExamEvents(true).catch(() => []),
      fetchMockTests(true).catch(() => []),
      fetchLearningPaths(true).catch(() => []),
      fetchUserFeedbackAdmin().catch(() => []),
    ])
      .then(([j, u, ai, rep, ex, mt, lp, fb]) => {
        setJobs(j);
        setUsers(u);
        setAiCount(ai.length);
        setReportCount(rep.filter((r) => r.status === 'open').length);
        setExamCount(ex.length);
        setMockTestCount(mt.length);
        setLearningCount(lp.length);
        setFeedbackCount(fb.filter((f) => f.status === 'open').length);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleSeed = async () => {
    if (!user) return;
    setSeeding(true);
    setSeedMsg('');
    try {
      const added = await seedStarterCatalogAdmin(user.uid, user.email || '');
      setSeedMsg(
        added > 0
          ? `Published ${added} official starter listings and categories into Firestore.`
          : 'Official starter listings are already present in Firestore.'
      );
      loadStats();
    } finally {
      setSeeding(false);
    }
  };

  const verifiedCount = jobs.filter((j) => j.verificationStatus === 'verified').length;
  const pendingCount = jobs.filter((j) => j.verificationStatus === 'pending').length;
  const activeUsers = users.filter((u) => u.status === 'active').length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#14243A] dark:text-white">Admin Overview</h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400">
            Real-time database metrics across jobs, exam calendars, mock tests, learning tracks, and AI usage.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={seeding}
            onClick={handleSeed}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-[#14B8A6] text-[#0D9488] dark:text-teal-300 rounded-lg hover:bg-[#CCFBF1]/30"
          >
            <Database className="w-4 h-4" />
            <span>{seeding ? 'Importing...' : 'Publish Starter Job Catalog'}</span>
          </button>
          <Link
            to="/admin/jobs/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
          >
            <PlusCircle className="w-4 h-4" /> Add New Job
          </Link>
        </div>
      </div>

      {seedMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-xs text-[#16A34A] flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>{seedMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', val: users.length },
          { label: 'Active Users', val: activeUsers },
          { label: 'Verified Jobs', val: verifiedCount },
          { label: 'Pending Jobs', val: pendingCount },
          { label: 'Exam Events (Firestore)', val: examCount },
          { label: 'Mock Tests (Firestore)', val: mockTestCount },
          { label: 'Learning Paths (Firestore)', val: learningCount },
          { label: 'AI Usage Events', val: aiCount },
        ].map((m) => (
          <div
            key={m.label}
            className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-4"
          >
            <p className="text-xs text-[#64748B] dark:text-slate-400">{m.label}</p>
            <p className="text-2xl font-bold font-mono-num mt-1">
              {loading ? '—' : m.val}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/admin/verification"
          className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 hover:border-[#14B8A6] rounded-xl p-5"
        >
          <h2 className="text-sm font-bold">Verification Queue ({pendingCount})</h2>
          <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
            Review official source URLs and approve pending job submissions.
          </p>
        </Link>
        <Link
          to="/admin/exam-calendar"
          className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 hover:border-[#14B8A6] rounded-xl p-5"
        >
          <h2 className="text-sm font-bold">Exam Calendar ({examCount})</h2>
          <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
            Publish and verify national/state competitive exam dates.
          </p>
        </Link>
        <Link
          to="/admin/mock-tests"
          className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 hover:border-[#14B8A6] rounded-xl p-5"
        >
          <h2 className="text-sm font-bold">Mock Tests &amp; Question Bank ({mockTestCount})</h2>
          <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
            Create timed MCQ tests and moderate question bank items.
          </p>
        </Link>
        <Link
          to="/admin/learning-hub"
          className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 hover:border-[#14B8A6] rounded-xl p-5"
        >
          <h2 className="text-sm font-bold">Learning Hub Tracks ({learningCount})</h2>
          <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
            Manage analytics, communication, and interview skill guides.
          </p>
        </Link>
        <Link
          to="/admin/reports"
          className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 hover:border-[#14B8A6] rounded-xl p-5"
        >
          <h2 className="text-sm font-bold">Scam &amp; Link Reports ({reportCount})</h2>
          <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
            Investigate safety warning indicators and support tickets.
          </p>
        </Link>
        <Link
          to="/admin/feedback"
          className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 hover:border-[#14B8A6] rounded-xl p-5"
        >
          <h2 className="text-sm font-bold">Open User Feedback ({feedbackCount})</h2>
          <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
            Moderate candidate ratings and feature requests.
          </p>
        </Link>
      </div>
    </div>
  );
}
