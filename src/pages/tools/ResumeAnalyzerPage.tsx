import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ref, uploadBytes } from 'firebase/storage';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  FileSearch,
  FileUp,
  History,
  ShieldCheck,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../lib/firebase';
import {
  deleteResumeAnalysis,
  fetchResumeAnalyses,
  fetchUserResumes,
  logAIUsage,
  saveResumeAnalysis,
} from '../../services/firestoreService';
import { StatusBadge } from '../../components/ui/UIComponents';
import { computeResumeHealthScore } from '../../utils/resumeHealth';
import type { ResumeAnalysisRecord, ResumeRecord } from '../../types';

export function ResumeAnalyzerPage() {
  const { user, profile } = useAuth();

  const [mode, setMode] = useState<'pdf' | 'text'>('pdf');
  const [targetRole, setTargetRole] = useState('Software Engineer');
  const [jobDescription, setJobDescription] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [archiveToStorage, setArchiveToStorage] = useState(true);

  const [savedResumes, setSavedResumes] = useState<ResumeRecord[]>([]);
  const [history, setHistory] = useState<ResumeAnalysisRecord[]>([]);
  const [activeResult, setActiveResult] = useState<ResumeAnalysisRecord | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchResumeAnalyses(user.uid)
      .then((list) => {
        setHistory(list);
        if (list.length > 0 && !activeResult) {
          setActiveResult(list[0]);
        }
      })
      .catch(() => {});
    fetchUserResumes(user.uid).then(setSavedResumes).catch(() => {});
  }, [user]);

  const handleLoadSavedResume = (res: ResumeRecord) => {
    const compiled = [
      res.personalDetails?.fullName,
      res.personalDetails?.email,
      res.personalDetails?.location,
      res.summary ? `SUMMARY:\n${res.summary}` : '',
      res.skills?.length ? `SKILLS:\n${res.skills.join(', ')}` : '',
      res.education?.length
        ? `EDUCATION:\n${res.education.map((e) => `${e.degree} - ${e.institution} (${e.year}) ${e.score}`).join('\n')}`
        : '',
      res.experience?.length
        ? `EXPERIENCE:\n${res.experience.map((ex) => `${ex.role} at ${ex.organization} (${ex.duration}): ${ex.highlights}`).join('\n')}`
        : '',
      res.projects?.length
        ? `PROJECTS:\n${res.projects.map((p) => `${p.name} (${p.techStack}): ${p.description}`).join('\n')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n');
    setMode('text');
    setResumeText(compiled);
    setTargetRole(res.title || targetRole);
    setStatusMsg(`Loaded text from "${res.title}" for ATS scan.`);
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = String(reader.result || '');
        const idx = res.indexOf('base64,');
        resolve(idx >= 0 ? res.slice(idx + 7) : res);
      };
      reader.onerror = () => reject(new Error('Could not read PDF file.'));
      reader.readAsDataURL(file);
    });

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setStatusMsg('');

    if (targetRole.trim().length < 2) {
      setErrorMsg('Please enter a target job role.');
      return;
    }

    if (mode === 'pdf') {
      if (!selectedFile) {
        setErrorMsg('Please select a PDF resume file (max 5 MB).');
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        setErrorMsg('PDF file size must be 5 MB or less.');
        return;
      }
    } else if (resumeText.trim().length < 40) {
      setErrorMsg('Please paste at least 40 characters of your resume text.');
      return;
    }

    setAnalyzing(true);
    try {
      let pdfBase64 = '';
      let storagePath = '';
      if (mode === 'pdf' && selectedFile) {
        pdfBase64 = await fileToBase64(selectedFile);
        if (user && user.emailVerified && archiveToStorage) {
          try {
            const safeName = `${Date.now()}_${selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
            storagePath = `users/${user.uid}/resumes/${safeName}`;
            await uploadBytes(ref(storage, storagePath), selectedFile, {
              contentType: 'application/pdf',
            });
          } catch {
            storagePath = '';
          }
        }
      }

      const resp = await fetch('/api/ai/resume-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64: mode === 'pdf' ? pdfBase64 : undefined,
          resumeText: mode === 'text' ? resumeText.trim() : undefined,
          targetRole: targetRole.trim(),
          jobDescription: jobDescription.trim(),
          fileName: mode === 'pdf' && selectedFile ? selectedFile.name : 'Pasted Resume Text',
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Resume analysis failed.');

      const recordPayload: Omit<ResumeAnalysisRecord, 'id' | 'userId' | 'createdAt'> = {
        fileName: mode === 'pdf' && selectedFile ? selectedFile.name : 'Pasted Resume Text',
        targetRole: targetRole.trim(),
        jobDescriptionSnippet: jobDescription.trim().slice(0, 600),
        storagePath,
        atsScore: data.atsScore,
        keywordMatchScore: data.keywordMatchScore,
        summaryFeedback: data.summaryFeedback,
        matchedKeywords: data.matchedKeywords || [],
        missingKeywords: data.missingKeywords || [],
        sectionSuggestions: data.sectionSuggestions || [],
        bulletImprovements: data.bulletImprovements || [],
        improvedSummary: data.improvedSummary || '',
      };

      let createdId = `local_${Date.now()}`;
      if (user && user.emailVerified) {
        createdId = await saveResumeAnalysis(user.uid, recordPayload);
        await logAIUsage(user.uid, 'resume_analyzer', profile?.preferredLanguage || 'en');
        const refreshed = await fetchResumeAnalyses(user.uid);
        setHistory(refreshed);
      }

      setActiveResult({
        id: createdId,
        userId: user?.uid || 'guest',
        ...recordPayload,
        createdAt: new Date().toISOString(),
      });
      setStatusMsg('ATS & keyword analysis completed.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to analyze resume.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleImportToStudio = () => {
    if (!activeResult) return;
    localStorage.setItem(
      'formsaathi_resume_import',
      JSON.stringify({
        targetRole: activeResult.targetRole,
        improvedSummary: activeResult.improvedSummary,
        suggestedKeywords: activeResult.missingKeywords,
      })
    );
    setStatusMsg('Improved summary and keywords staged for Resume Studio.');
  };

  const healthResult = activeResult
    ? computeResumeHealthScore(activeResult, mode === 'text' ? resumeText : undefined)
    : null;

  const handleDownloadReport = () => {
    if (!activeResult || !healthResult) return;
    const lines = [
      `FormSaathi AI Resume Analysis Report`,
      `Target Role: ${activeResult.targetRole}`,
      `Source: ${activeResult.fileName}`,
      `Resume Health Score: ${healthResult.score}/100 (${healthResult.tierLabel})`,
      `  - ATS Compatibility Component: ${healthResult.atsComponent}/${healthResult.atsMax}`,
      `  - Resume Standards Component: ${healthResult.standardsComponent}/${healthResult.standardsMax}`,
      `ATS Score: ${activeResult.atsScore}/100`,
      `Keyword Match Score: ${activeResult.keywordMatchScore}/100`,
      '',
      `STANDARD RESUME CHECKS:`,
      ...healthResult.checks.map(
        (c) => `- [${c.status.toUpperCase()}] ${c.label} (${c.points}/${c.maxPoints}): ${c.detail}`
      ),
      '',
      `SUMMARY FEEDBACK:`,
      activeResult.summaryFeedback,
      '',
      `MATCHED KEYWORDS: ${activeResult.matchedKeywords.join(', ') || 'None detected'}`,
      `MISSING / SUGGESTED KEYWORDS: ${activeResult.missingKeywords.join(', ') || 'None'}`,
      '',
      `SECTION FEEDBACK:`,
      ...activeResult.sectionSuggestions.map((s) => `- [${s.status.toUpperCase()}] ${s.section}: ${s.feedback}`),
      '',
      `BULLET IMPROVEMENTS:`,
      ...activeResult.bulletImprovements.map((b) => `- ${b}`),
      '',
      `FACT-GROUNDED IMPROVED SUMMARY:`,
      activeResult.improvedSummary,
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `formsaathi-ats-report-${activeResult.targetRole.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteHistory = async (id: string) => {
    if (!user) return;
    await deleteResumeAnalysis(user.uid, id);
    const next = history.filter((h) => h.id !== id);
    setHistory(next);
    if (activeResult?.id === id) {
      setActiveResult(next[0] || null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0D9488] dark:text-[#14B8A6]">
            ATS &amp; Career Evaluation
          </p>
          <h1 className="text-3xl font-bold text-[#14243A] dark:text-white mt-1">
            AI Resume Analyzer
          </h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1 max-w-2xl">
            Upload a PDF resume or paste your resume text to check ATS readability, role keyword gaps, and fact-grounded bullet improvements without fabricating experience.
          </p>
        </div>
        <Link
          to="/resume-studio"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-[#E2E8F0] dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0"
        >
          <span>Open Resume Studio</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Form */}
        <div className="lg:col-span-5 space-y-6">
          <form
            onSubmit={handleAnalyze}
            className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-5"
          >
            <div className="flex gap-2 p-1 bg-[#F8FAFC] dark:bg-[#0B1320] rounded-lg border border-[#E2E8F0] dark:border-slate-800">
              <button
                type="button"
                onClick={() => setMode('pdf')}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
                  mode === 'pdf'
                    ? 'bg-[#14243A] text-white dark:bg-[#14B8A6] dark:text-[#14243A]'
                    : 'text-[#64748B] dark:text-slate-300'
                }`}
              >
                Upload PDF (Max 5 MB)
              </button>
              <button
                type="button"
                onClick={() => setMode('text')}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
                  mode === 'text'
                    ? 'bg-[#14243A] text-white dark:bg-[#14B8A6] dark:text-[#14243A]'
                    : 'text-[#64748B] dark:text-slate-300'
                }`}
              >
                Paste Resume Text
              </button>
            </div>

            {mode === 'pdf' ? (
              <div className="space-y-3">
                <label className="block text-xs font-semibold">Resume PDF Document</label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#E2E8F0] dark:border-slate-700 hover:border-[#14B8A6] rounded-xl p-6 cursor-pointer text-center transition-colors">
                  <FileUp className="w-7 h-7 text-[#0D9488] mb-2" />
                  <span className="text-sm font-medium text-[#172033] dark:text-slate-100">
                    {selectedFile ? selectedFile.name : 'Choose PDF file from device'}
                  </span>
                  <span className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
                    {selectedFile
                      ? `${Math.round(selectedFile.size / 1024)} KB · Ready to scan`
                      : 'PDF only · Max 5 MB · Avoid Aadhaar/PAN inside uploads'}
                  </span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                </label>

                {user && user.emailVerified && (
                  <label className="inline-flex items-center gap-2 text-xs text-[#64748B] dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={archiveToStorage}
                      onChange={(e) => setArchiveToStorage(e.target.checked)}
                      className="rounded border-slate-300 text-[#14B8A6]"
                    />
                    <span>Archive PDF copy privately in my FormSaathi Storage</span>
                  </label>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold">Resume Text</label>
                  {savedResumes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleLoadSavedResume(savedResumes[0])}
                      className="text-xs font-semibold text-[#0D9488] hover:underline"
                    >
                      Load from Saved Resume
                    </button>
                  )}
                </div>
                <textarea
                  rows={7}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste your resume summary, education, projects, internships, and skills..."
                  className="w-full p-3 text-xs bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold mb-1.5">Target Role / Exam Stream *</label>
              <input
                type="text"
                required
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Junior Data Analyst, Java Developer, Technical Officer"
                className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">
                Target Job Description (Optional — improves keyword scoring)
              </label>
              <textarea
                rows={4}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste key requirements or skills from the job posting..."
                className="w-full p-3 text-xs bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-[#DC2626] dark:text-red-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {statusMsg && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-[#16A34A] dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{statusMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={analyzing}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#14243A] hover:bg-[#1D3557] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4" />
              <span>{analyzing ? 'Analyzing Resume...' : 'Run ATS Resume Analysis'}</span>
            </button>

            <p className="text-[11px] text-[#64748B] dark:text-slate-400 leading-relaxed">
              Integrity guarantee: FormSaathi only evaluates submitted facts and never invents degrees, employers, or fake work history.
            </p>
          </form>

          {/* Saved History */}
          {user && history.length > 0 && (
            <section className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
                <History className="w-4 h-4 text-[#0D9488]" />
                <span>Recent Analyses ({history.length})</span>
              </div>
              <div className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
                {history.slice(0, 5).map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveResult(item)}
                      className="text-left min-w-0 flex-1"
                    >
                      <p className="text-xs font-semibold text-[#172033] dark:text-slate-100 truncate hover:text-[#0D9488]">
                        {item.targetRole}
                      </p>
                      <p className="text-[11px] text-[#64748B] dark:text-slate-400 truncate font-mono-num">
                        ATS {item.atsScore}% · {item.fileName}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteHistory(item.id)}
                      aria-label="Delete analysis"
                      className="p-1.5 text-[#64748B] hover:text-[#DC2626]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-7">
          {!activeResult ? (
            <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-12 text-center space-y-3">
              <FileSearch className="w-10 h-10 text-[#14B8A6] mx-auto" />
              <h2 className="text-lg font-bold text-[#14243A] dark:text-white">
                Ready to inspect your resume
              </h2>
              <p className="text-sm text-[#64748B] dark:text-slate-400 max-w-md mx-auto">
                Upload a PDF or paste your resume on the left to receive ATS readability scoring, missing target-role keywords, section diagnostics, and actionable rewrite tips.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Resume Health Score Summary Card */}
              {healthResult && (
                <section
                  aria-label="Resume Health Score Summary"
                  className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-5 shadow-xs"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-[#CCFBF1] dark:bg-teal-950/60 flex items-center justify-center shrink-0">
                        <Activity className="w-5 h-5 text-[#0D9488] dark:text-[#14B8A6]" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-[#14243A] dark:text-white leading-tight">
                          Resume Health Score
                        </h2>
                        <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                          Overall readiness across ATS compatibility metrics and standard resume checks
                        </p>
                      </div>
                    </div>
                    <StatusBadge
                      label={`${healthResult.tierLabel} · ${healthResult.passedChecksCount}/${healthResult.checks.length} Standards Passed`}
                      tone={healthResult.tone}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-4">
                    {/* Circular Score Gauge */}
                    <div className="md:col-span-4 flex items-center gap-4">
                      <div className="relative w-22 h-22 shrink-0 flex items-center justify-center">
                        <svg className="w-22 h-22 -rotate-90" viewBox="0 0 88 88" aria-hidden="true">
                          <circle
                            cx="44"
                            cy="44"
                            r="36"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="8"
                            className="text-slate-200 dark:text-slate-800"
                          />
                          <circle
                            cx="44"
                            cy="44"
                            r="36"
                            fill="none"
                            strokeWidth="8"
                            strokeLinecap="round"
                            stroke={
                              healthResult.score >= 80
                                ? '#16A34A'
                                : healthResult.score >= 65
                                  ? '#14B8A6'
                                  : healthResult.score >= 45
                                    ? '#F59E0B'
                                    : '#DC2626'
                            }
                            strokeDasharray={2 * Math.PI * 36}
                            strokeDashoffset={
                              2 * Math.PI * 36 * (1 - healthResult.score / 100)
                            }
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="font-mono-num text-2xl font-bold text-[#14243A] dark:text-white leading-none">
                            {healthResult.score}
                          </span>
                          <span className="text-[10px] font-semibold text-[#64748B] dark:text-slate-400">
                            / 100
                          </span>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
                          Health Index
                        </p>
                        <p className="text-sm font-bold text-[#14243A] dark:text-white mt-0.5">
                          {healthResult.tierLabel}
                        </p>
                        <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-0.5 leading-snug">
                          55% ATS metrics + 45% standard checks
                        </p>
                      </div>
                    </div>

                    {/* Component Breakdown Bars */}
                    <div className="md:col-span-8 space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-[#172033] dark:text-slate-200">
                            ATS Compatibility Metrics (Readability &amp; Keywords)
                          </span>
                          <span className="font-mono-num font-bold text-[#14243A] dark:text-white">
                            {healthResult.atsComponent}/{healthResult.atsMax} pts
                          </span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#14B8A6] transition-all duration-300"
                            style={{
                              width: `${Math.round((healthResult.atsComponent / healthResult.atsMax) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-[#172033] dark:text-slate-200">
                            Common Resume Standard Checks
                          </span>
                          <span className="font-mono-num font-bold text-[#14243A] dark:text-white">
                            {healthResult.standardsComponent}/{healthResult.standardsMax} pts
                          </span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#14243A] dark:bg-teal-400 transition-all duration-300"
                            style={{
                              width: `${Math.round((healthResult.standardsComponent / healthResult.standardsMax) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Standard Checks Checklist */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#0D9488]" />
                      <span>Standard Resume Checks Breakdown</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {healthResult.checks.map((check) => (
                        <div
                          key={check.id}
                          className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-800 flex items-start gap-2.5"
                        >
                          {check.status === 'pass' ? (
                            <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                          ) : check.status === 'warn' ? (
                            <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-[#172033] dark:text-slate-100 truncate">
                                {check.label}
                              </span>
                              <span className="text-[11px] font-mono-num font-semibold text-[#64748B] dark:text-slate-400 shrink-0">
                                {check.points}/{check.maxPoints}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-0.5 leading-snug">
                              {check.detail}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* Score Header */}
              <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-[#64748B] dark:text-slate-400">
                      {activeResult.fileName} · Target: <strong className="text-[#172033] dark:text-white">{activeResult.targetRole}</strong>
                    </p>
                    <h2 className="text-xl font-bold text-[#14243A] dark:text-white mt-0.5">
                      ATS Evaluation Report
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleImportToStudio}
                      className="px-3 py-1.5 text-xs font-semibold border border-[#14B8A6] text-[#0D9488] dark:text-teal-300 rounded-lg hover:bg-[#CCFBF1]/30"
                    >
                      Stage for Resume Studio
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadReport}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#14243A] text-white dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export TXT</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-slate-400 mb-1">
                      <span>ATS Readability &amp; Structure</span>
                      <span className="font-mono-num font-bold text-[#14243A] dark:text-white text-base">
                        {activeResult.atsScore}/100
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#14B8A6]"
                        style={{ width: `${activeResult.atsScore}%` }}
                      />
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-slate-400 mb-1">
                      <span>Role Keyword Alignment</span>
                      <span className="font-mono-num font-bold text-[#14243A] dark:text-white text-base">
                        {activeResult.keywordMatchScore}/100
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#14243A] dark:bg-teal-400"
                        style={{ width: `${activeResult.keywordMatchScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                <p className="text-sm text-[#172033] dark:text-slate-200 leading-relaxed">
                  {activeResult.summaryFeedback}
                </p>
              </div>

              {/* Keywords Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-[#16A34A] dark:text-emerald-400">
                    Detected Keywords ({activeResult.matchedKeywords.length})
                  </h3>
                  <p className="text-xs text-[#64748B] dark:text-slate-300 leading-relaxed">
                    {activeResult.matchedKeywords.length > 0
                      ? activeResult.matchedKeywords.join(' · ')
                      : 'No role keywords highlighted yet.'}
                  </p>
                </div>
                <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-[#F59E0B] dark:text-amber-300">
                    Missing / Suggested Keywords ({activeResult.missingKeywords.length})
                  </h3>
                  <p className="text-xs text-[#64748B] dark:text-slate-300 leading-relaxed">
                    {activeResult.missingKeywords.length > 0
                      ? activeResult.missingKeywords.join(' · ')
                      : 'Strong keyword alignment for this target role.'}
                  </p>
                </div>
              </div>

              {/* Section Feedback */}
              <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-4">
                <h3 className="text-base font-bold text-[#14243A] dark:text-white">
                  Section-by-Section Diagnostics
                </h3>
                <div className="space-y-3">
                  {activeResult.sectionSuggestions.map((sec, idx) => (
                    <div
                      key={`${sec.section}_${idx}`}
                      className="p-3.5 rounded-lg bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-800 flex flex-col sm:flex-row sm:items-start justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#172033] dark:text-white">
                            {sec.section}
                          </span>
                          <StatusBadge
                            label={
                              sec.status === 'strong'
                                ? 'Strong'
                                : sec.status === 'missing'
                                  ? 'Missing'
                                  : 'Needs Work'
                            }
                            tone={
                              sec.status === 'strong'
                                ? 'verified'
                                : sec.status === 'missing'
                                  ? 'danger'
                                  : 'warning'
                            }
                          />
                        </div>
                        <p className="text-xs text-[#64748B] dark:text-slate-300 leading-relaxed">
                          {sec.feedback}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bullet Improvements & Fact-Grounded Summary */}
              <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-5">
                <div>
                  <h3 className="text-base font-bold text-[#14243A] dark:text-white mb-2">
                    Actionable Bullet Point Improvements
                  </h3>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs text-[#64748B] dark:text-slate-300">
                    {activeResult.bulletImprovements.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>

                {activeResult.improvedSummary && (
                  <div className="pt-4 border-t border-[#E2E8F0] dark:border-slate-800 space-y-2">
                    <h3 className="text-sm font-bold text-[#0D9488] dark:text-teal-300">
                      Fact-Grounded Summary Draft
                    </h3>
                    <p className="text-xs text-[#172033] dark:text-slate-200 bg-[#F8FAFC] dark:bg-[#0B1320] p-4 rounded-lg border border-[#E2E8F0] dark:border-slate-800 leading-relaxed">
                      {activeResult.improvedSummary}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
