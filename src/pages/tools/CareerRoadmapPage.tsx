import React, { useEffect, useState } from 'react';
import {
  CheckSquare,
  ExternalLink,
  History,
  Map as MapIcon,
  Sparkles,
  Square,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  deleteCareerRoadmap,
  fetchCareerRoadmaps,
  logAIUsage,
  saveCareerRoadmap,
} from '../../services/firestoreService';
import type { CareerRoadmapRecord } from '../../types';

const GOAL_PRESETS = [
  'Data Analyst (SQL, Excel, Power BI)',
  'Full-Stack React & TypeScript Developer',
  'SSC CGL Tier 1 & Tier 2 Preparation',
  'IBPS PO & SBI Clerk Banking Exams',
  'UPSC Civil Services Preliminary Strategy',
  'Business & Operations Analyst',
];

export function CareerRoadmapPage() {
  const { user, profile } = useAuth();

  const [targetGoal, setTargetGoal] = useState(GOAL_PRESETS[0]);
  const [currentLevel, setCurrentLevel] = useState('Student / Fresher');
  const [weeklyHours, setWeeklyHours] = useState(12);
  const [backgroundNotes, setBackgroundNotes] = useState('');

  const [activeRoadmap, setActiveRoadmap] = useState<CareerRoadmapRecord | null>(null);
  const [history, setHistory] = useState<CareerRoadmapRecord[]>([]);
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchCareerRoadmaps(user.uid)
      .then((list) => {
        setHistory(list);
        if (list.length > 0 && !activeRoadmap) {
          setActiveRoadmap(list[0]);
        }
      })
      .catch(() => {});
  }, [user]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (targetGoal.trim().length < 2) {
      setErrorMsg('Please enter a career or exam goal.');
      return;
    }
    setErrorMsg('');
    setGenerating(true);
    try {
      const resp = await fetch('/api/ai/career-roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetGoal: targetGoal.trim(),
          currentLevel,
          weeklyHours,
          backgroundNotes: backgroundNotes.trim(),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Could not generate roadmap.');

      const payload: Omit<CareerRoadmapRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
        targetGoal: targetGoal.trim(),
        currentLevel,
        weeklyHours,
        overview: data.overview || '',
        stages: Array.isArray(data.stages) ? data.stages : [],
        weeklyPlan: Array.isArray(data.weeklyPlan) ? data.weeklyPlan : [],
        completedStepIds: [],
      };

      let savedId = `local_${Date.now()}`;
      if (user && user.emailVerified) {
        savedId = await saveCareerRoadmap(user.uid, payload);
        await logAIUsage(user.uid, 'career_roadmap', profile?.preferredLanguage || 'en');
        fetchCareerRoadmaps(user.uid).then(setHistory).catch(() => {});
      }

      setActiveRoadmap({
        id: savedId,
        userId: user?.uid || 'guest',
        ...payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to generate roadmap.');
    } finally {
      setGenerating(false);
    }
  };

  const toggleMilestone = async (milestoneId: string) => {
    if (!activeRoadmap) return;
    const exists = activeRoadmap.completedStepIds.includes(milestoneId);
    const nextSteps = exists
      ? activeRoadmap.completedStepIds.filter((s) => s !== milestoneId)
      : [...activeRoadmap.completedStepIds, milestoneId];

    const updated: CareerRoadmapRecord = { ...activeRoadmap, completedStepIds: nextSteps };
    setActiveRoadmap(updated);

    if (user && user.emailVerified && !activeRoadmap.id.startsWith('local_')) {
      await saveCareerRoadmap(user.uid, updated);
      setHistory((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    await deleteCareerRoadmap(user.uid, id);
    const next = history.filter((r) => r.id !== id);
    setHistory(next);
    if (activeRoadmap?.id === id) setActiveRoadmap(next[0] || null);
  };

  const totalMilestones = activeRoadmap
    ? activeRoadmap.stages.reduce((sum, st) => sum + (st.milestones?.length || 0), 0)
    : 0;
  const completedCount = activeRoadmap?.completedStepIds.length || 0;
  const progressPct = totalMilestones > 0 ? Math.round((completedCount / totalMilestones) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0D9488] dark:text-[#14B8A6]">
          Structured Study &amp; Skill Blueprints
        </p>
        <h1 className="text-3xl font-bold text-[#14243A] dark:text-white mt-1">
          Personalized Career Roadmap Generator
        </h1>
        <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1 max-w-3xl">
          Generate a realistic Beginner-to-Advanced learning roadmap with weekly study cadence, milestone checkboxes, project ideas, and free/official study resources.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form + Saved Roadmaps */}
        <div className="lg:col-span-4 space-y-6">
          <form
            onSubmit={handleGenerate}
            className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-4"
          >
            <h2 className="text-base font-bold text-[#14243A] dark:text-white">
              Roadmap Preferences
            </h2>

            <div>
              <label className="block text-xs font-semibold mb-1.5">Quick Presets</label>
              <div className="flex flex-wrap gap-1.5">
                {GOAL_PRESETS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setTargetGoal(g)}
                    className={`px-2.5 py-1 text-[11px] rounded-md border ${
                      targetGoal === g
                        ? 'border-[#14B8A6] bg-[#CCFBF1]/40 font-semibold text-[#14243A] dark:text-teal-300'
                        : 'border-[#E2E8F0] dark:border-slate-700 text-[#64748B] dark:text-slate-300'
                    }`}
                  >
                    {g.split(' (')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">Target Role or Exam Goal *</label>
              <input
                type="text"
                required
                value={targetGoal}
                onChange={(e) => setTargetGoal(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5">Current Level</label>
                <select
                  value={currentLevel}
                  onChange={(e) => setCurrentLevel(e.target.value)}
                  aria-label="Current level"
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
                >
                  <option>Absolute Beginner</option>
                  <option>Student / Fresher</option>
                  <option>0–2 Years Experience</option>
                  <option>Career Switcher</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5">Hours / Week</label>
                <input
                  type="number"
                  min={2}
                  max={70}
                  value={weeklyHours}
                  onChange={(e) => setWeeklyHours(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">Background Notes (Optional)</label>
              <textarea
                rows={3}
                value={backgroundNotes}
                onChange={(e) => setBackgroundNotes(e.target.value)}
                placeholder="e.g. Final year B.Com student comfortable with basic Excel..."
                className="w-full p-2.5 text-xs bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              />
            </div>

            {errorMsg && <p className="text-xs text-[#DC2626]">{errorMsg}</p>}

            <button
              type="submit"
              disabled={generating}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#14243A] hover:bg-[#1D3557] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4" />
              <span>{generating ? 'Building Roadmap...' : 'Generate Career Roadmap'}</span>
            </button>
          </form>

          {user && history.length > 0 && (
            <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
                <History className="w-4 h-4 text-[#0D9488]" />
                <span>Saved Roadmaps ({history.length})</span>
              </div>
              <div className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
                {history.map((r) => (
                  <div key={r.id} className="py-2.5 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveRoadmap(r)}
                      className="text-left min-w-0 flex-1"
                    >
                      <p className="text-xs font-semibold truncate hover:text-[#0D9488]">
                        {r.targetGoal}
                      </p>
                      <p className="text-[11px] text-[#64748B] dark:text-slate-400 font-mono-num">
                        {r.completedStepIds.length} steps completed · {r.weeklyHours}h/wk
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      aria-label="Delete roadmap"
                      className="p-1.5 text-[#64748B] hover:text-[#DC2626]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Roadmap Output */}
        <div className="lg:col-span-8">
          {!activeRoadmap ? (
            <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-12 text-center space-y-3">
              <MapIcon className="w-10 h-10 text-[#14B8A6] mx-auto" />
              <h2 className="text-lg font-bold text-[#14243A] dark:text-white">
                Build your personalized career blueprint
              </h2>
              <p className="text-sm text-[#64748B] dark:text-slate-400 max-w-md mx-auto">
                Pick a preset or enter any role/exam goal on the left to generate a structured 3-stage study &amp; project plan with trackable milestones.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[#0D9488] dark:text-teal-300">
                      {activeRoadmap.currentLevel} · {activeRoadmap.weeklyHours} hrs/week
                    </p>
                    <h2 className="text-2xl font-bold text-[#14243A] dark:text-white mt-0.5">
                      {activeRoadmap.targetGoal}
                    </h2>
                  </div>
                  <div className="text-right">
                    <span className="font-mono-num text-lg font-bold text-[#0D9488]">
                      {progressPct}%
                    </span>
                    <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                      {completedCount}/{totalMilestones} milestones
                    </p>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-[#14B8A6] transition-all" style={{ width: `${progressPct}%` }} />
                </div>
                <p className="text-sm text-[#64748B] dark:text-slate-300 leading-relaxed">
                  {activeRoadmap.overview}
                </p>
              </div>

              {/* Weekly Cadence */}
              {activeRoadmap.weeklyPlan.length > 0 && (
                <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-3">
                  <h3 className="text-base font-bold text-[#14243A] dark:text-white">
                    Recommended Weekly Study Plan
                  </h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-[#64748B] dark:text-slate-300">
                    {activeRoadmap.weeklyPlan.map((dayPlan, idx) => (
                      <li
                        key={idx}
                        className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-800"
                      >
                        {dayPlan}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Stages */}
              {activeRoadmap.stages.map((stage, sIdx) => (
                <section
                  key={`${stage.stageName}_${sIdx}`}
                  className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-bold text-[#14243A] dark:text-white">
                      Stage {sIdx + 1}: {stage.stageName}
                    </h3>
                    <span className="text-xs font-mono-num font-semibold text-[#0D9488] dark:text-teal-300">
                      {stage.durationLabel}
                    </span>
                  </div>

                  {stage.skills?.length > 0 && (
                    <p className="text-xs text-[#64748B] dark:text-slate-400">
                      <strong>Core Skills:</strong> {stage.skills.join(' · ')}
                    </p>
                  )}

                  {/* Interactive Milestones */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
                      Milestones
                    </p>
                    {stage.milestones.map((m) => {
                      const stepKey = m.id || `${sIdx}_${m.title}`;
                      const checked = activeRoadmap.completedStepIds.includes(stepKey);
                      return (
                        <button
                          key={stepKey}
                          type="button"
                          onClick={() => toggleMilestone(stepKey)}
                          className={`w-full text-left p-3 rounded-lg border flex items-start gap-3 transition-colors ${
                            checked
                              ? 'border-[#16A34A] bg-emerald-50/60 dark:bg-emerald-950/20'
                              : 'border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0B1320]'
                          }`}
                        >
                          {checked ? (
                            <CheckSquare className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                          ) : (
                            <Square className="w-4 h-4 text-[#64748B] shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className={`text-xs font-semibold ${checked ? 'line-through text-[#64748B]' : 'text-[#172033] dark:text-slate-100'}`}>
                              {m.title}
                            </p>
                            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                              {m.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {stage.projects?.length > 0 && (
                    <div className="pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
                      <p className="text-xs font-bold mb-1.5">Practical Projects / Drills</p>
                      <ul className="list-disc pl-5 text-xs text-[#64748B] dark:text-slate-300 space-y-1">
                        {stage.projects.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {stage.resources?.length > 0 && (
                    <div className="pt-2 border-t border-[#E2E8F0] dark:border-slate-800 flex flex-wrap gap-3 text-xs">
                      {stage.resources.map((res, i) =>
                        res.url && res.url.startsWith('http') ? (
                          <a
                            key={i}
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#0D9488] dark:text-teal-300 font-semibold hover:underline"
                          >
                            <span>{res.title}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span key={i} className="text-[#64748B] dark:text-slate-400">
                            • {res.title} ({res.type})
                          </span>
                        )
                      )}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
