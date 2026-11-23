import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { fetchAIUsageLogsAdmin } from '../../services/firestoreService';

interface UsageLogItem {
  id: string;
  userId: string;
  feature: string;
  language: string;
  createdAt: string;
}

const FEATURE_LABELS: Record<string, string> = {
  assistant: 'AI Career Assistant',
  resume_assist: 'Resume Studio AI',
  resume_analyzer: 'AI Resume Analyzer',
  mock_interview: 'AI Mock Interview',
  career_roadmap: 'Career Roadmap Generator',
  form_assistant: 'Gov Form Assistant',
};

export function AdminAIAnalyticsPage() {
  const [logs, setLogs] = useState<UsageLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAIUsageLogsAdmin()
      .then((res) => setLogs(res))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  const enCount = logs.filter((l) => l.language === 'en').length;
  const hiCount = logs.filter((l) => l.language === 'hi').length;
  const uniqueUsers = new Set(logs.map((l) => l.userId)).size;
  const total = logs.length || 1;

  const featureCounts = Object.entries(FEATURE_LABELS).map(([key, label]) => {
    const count = logs.filter((l) => l.feature === key).length;
    return { key, label, count, pct: logs.length ? Math.round((count / total) * 100) : 0 };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#14243A] dark:text-white">
          AI Usage Analytics (FormSaathi 2.0)
        </h1>
        <p className="text-sm text-[#64748B] dark:text-slate-400">
          Verified telemetry across all 6 Gemini-powered modules from `/aiUsage`.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs text-[#64748B] dark:text-slate-400">Total AI Requests</p>
          <p className="text-2xl font-bold font-mono-num mt-1">{loading ? '—' : logs.length}</p>
        </div>
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs text-[#64748B] dark:text-slate-400">Unique Signed-In Users</p>
          <p className="text-2xl font-bold font-mono-num mt-1">{loading ? '—' : uniqueUsers}</p>
        </div>
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs text-[#64748B] dark:text-slate-400">English Invocations</p>
          <p className="text-2xl font-bold font-mono-num mt-1">{loading ? '—' : enCount}</p>
        </div>
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs text-[#64748B] dark:text-slate-400">Hindi Invocations</p>
          <p className="text-2xl font-bold font-mono-num mt-1">{loading ? '—' : hiCount}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#14B8A6]" /> Feature Adoption Breakdown
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {featureCounts.map((f) => (
            <div key={f.key} className="space-y-1">
              <div className="flex justify-between">
                <span className="font-medium">{f.label}</span>
                <span className="font-mono-num font-semibold">
                  {f.count} ({f.pct}%)
                </span>
              </div>
              <div className="h-2 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-[#14B8A6]"
                  style={{ width: `${Math.max(f.count > 0 ? 4 : 0, f.pct)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E2E8F0] dark:border-slate-800">
          <h2 className="text-sm font-bold">Recent AI Usage Events</h2>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-[#64748B]">Loading telemetry...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#64748B] dark:text-slate-400">
            No AI usage logs recorded yet. Usage events appear here whenever signed-in candidates run FormSaathi AI tools.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E2E8F0] dark:border-slate-800 text-[#64748B] dark:text-slate-400 uppercase">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Feature</th>
                  <th className="py-3 px-4">Language</th>
                  <th className="py-3 px-4">User UID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
                {logs.slice(0, 50).map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 px-4 font-mono-num text-[#64748B] dark:text-slate-400">
                      {item.createdAt || 'Just now'}
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {FEATURE_LABELS[item.feature] || item.feature}
                    </td>
                    <td className="py-3 px-4 uppercase font-mono-num">{item.language}</td>
                    <td className="py-3 px-4 font-mono-num text-[#64748B] dark:text-slate-400">
                      {item.userId.slice(0, 12)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
