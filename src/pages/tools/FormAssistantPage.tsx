import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckSquare,
  FileCheck2,
  Languages,
  Send,
  ShieldAlert,
  Square,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchVerifiedJobs, logAIUsage } from '../../services/firestoreService';
import type { JobListing } from '../../types';

interface FormAssistResponse {
  explanation: string;
  fieldByFieldTips: string[];
  documentSpecs: string[];
  stepChecklist: string[];
  cautionNote: string;
}

const PRESET_FORMS = [
  'UPSC Civil Services (CSE) Online Application',
  'SSC CGL Combined Graduate Level Form',
  'IBPS PO / Clerk Common Recruitment Form',
  'Railway RRB NTPC / Technician Application',
  'State PSC Combined Examination Form',
  'ISRO / DRDO Scientist & Engineer Application',
];

const QUICK_QUESTIONS = [
  'What photo and signature dimensions and KB limits are normally required, and should date be printed on photo?',
  'Which income/caste certificate financial year is valid for EWS / OBC-NCL reservation claims?',
  'How should final-year degree students enter marks or passing status safely without rejection?',
  'What are common fee payment verification mistakes and how to confirm final submission slip?',
];

export function FormAssistantPage() {
  const { user, profile } = useAuth();
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [examName, setExamName] = useState(PRESET_FORMS[0]);
  const [language, setLanguage] = useState<'en' | 'hi'>(profile?.preferredLanguage || 'en');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<FormAssistResponse | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetchVerifiedJobs()
      .then((res) => setJobs(res.jobs.filter((j) => j.sector === 'government').slice(0, 6)))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || loading) return;
    setErrorMsg('');
    setLoading(true);
    try {
      const matchedJob = jobs.find((j) =>
        examName.toLowerCase().includes(j.organization.toLowerCase()) ||
        j.title.toLowerCase().includes(examName.toLowerCase())
      );

      const resp = await fetch('/api/ai/form-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examName: examName.trim(),
          question: question.trim(),
          language,
          jobContext: matchedJob
            ? {
                title: matchedJob.title,
                organization: matchedJob.organization,
                requiredDocuments: matchedJob.requiredDocuments,
                applicationFee: matchedJob.applicationFee,
              }
            : undefined,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Form assistant request failed.');
      setResult(data);
      setCheckedSteps({});
      if (user && user.emailVerified) {
        await logAIUsage(user.uid, 'form_assistant', language);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to reach Form Assistant.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0D9488] dark:text-[#14B8A6]">
            Bilingual Form Guidance (English &amp; हिन्दी)
          </p>
          <h1 className="text-3xl font-bold text-[#14243A] dark:text-white mt-1">
            Government Application Form Assistant
          </h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1 max-w-2xl">
            Understand complex Indian recruitment form sections, category certificate dates, photo/signature specs, and step-by-step preparation checklists.
          </p>
        </div>

        <Link
          to="/tools/photo-resizer"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-[#14B8A6] text-[#0D9488] dark:text-teal-300 rounded-lg shrink-0"
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Open Photo &amp; Signature Resizer</span>
        </Link>
      </div>

      {/* Strong Privacy Banner */}
      <div className="bg-red-50/70 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl p-4 flex items-start gap-3 text-xs text-red-950 dark:text-red-200">
        <ShieldAlert className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
        <span>
          <strong>Privacy &amp; Official Portal Rule:</strong> Never type Aadhaar numbers, PAN numbers, OTPs, or portal passwords here. FormSaathi explains instructions only — you must always complete and submit the final application directly on the official government website.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Query Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-4 h-fit"
        >
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-semibold">Language Mode</label>
            <div className="flex gap-1.5">
              {(['en', 'hi'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md border ${
                    language === lang
                      ? 'bg-[#14243A] text-white border-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A]'
                      : 'border-[#E2E8F0] dark:border-slate-700'
                  }`}
                >
                  <Languages className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'English' : 'हिन्दी'}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5">Select Exam / Portal</label>
            <select
              value={PRESET_FORMS.includes(examName) ? examName : ''}
              onChange={(e) => e.target.value && setExamName(e.target.value)}
              aria-label="Exam form preset"
              className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg mb-2"
            >
              {PRESET_FORMS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
              {jobs.map((j) => (
                <option key={j.id} value={`${j.organization} — ${j.title}`}>
                  {j.organization} — {j.title}
                </option>
              ))}
            </select>
            <input
              type="text"
              required
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              placeholder="Or type exact exam / recruitment notice name..."
              className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5">Your Form Question *</label>
            <textarea
              rows={4}
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about photo specifications, caste/EWS certificate dates, qualification fields, or fee rules..."
              className="w-full p-3 text-xs bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400">
              Quick Prompts:
            </p>
            <div className="flex flex-col gap-1.5">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuestion(q)}
                  className="text-left text-[11px] p-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-800 hover:border-[#14B8A6] text-[#64748B] dark:text-slate-300"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-[#DC2626] flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Send className="w-4 h-4" />
            <span>{loading ? 'Preparing Guidance...' : 'Get Form Guidance'}</span>
          </button>
        </form>

        {/* Guidance Output */}
        <div className="lg:col-span-7">
          {!result ? (
            <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-12 text-center space-y-3">
              <FileCheck2 className="w-10 h-10 text-[#14B8A6] mx-auto" />
              <h2 className="text-lg font-bold text-[#14243A] dark:text-white">
                Step-by-step form breakdown awaits
              </h2>
              <p className="text-sm text-[#64748B] dark:text-slate-400 max-w-md mx-auto">
                Choose an exam portal and ask a question in English or Hindi to get clear field-by-field instructions, document format limits, and an interactive checklist.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-3">
                <h2 className="text-lg font-bold text-[#14243A] dark:text-white">
                  Guidance: {examName}
                </h2>
                <p className="text-sm text-[#172033] dark:text-slate-200 leading-relaxed whitespace-pre-line">
                  {result.explanation}
                </p>
              </div>

              {result.fieldByFieldTips.length > 0 && (
                <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-3">
                  <h3 className="text-base font-bold text-[#14243A] dark:text-white">
                    Field-by-Field Tips
                  </h3>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs text-[#64748B] dark:text-slate-300">
                    {result.fieldByFieldTips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.documentSpecs.length > 0 && (
                <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-3">
                  <h3 className="text-base font-bold text-[#14243A] dark:text-white">
                    Document &amp; Scan Specifications
                  </h3>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs text-[#64748B] dark:text-slate-300">
                    {result.documentSpecs.map((spec, i) => (
                      <li key={i}>{spec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.stepChecklist.length > 0 && (
                <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-3">
                  <h3 className="text-base font-bold text-[#14243A] dark:text-white">
                    Interactive Submission Checklist
                  </h3>
                  <div className="space-y-2">
                    {result.stepChecklist.map((step, idx) => {
                      const done = Boolean(checkedSteps[idx]);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCheckedSteps((p) => ({ ...p, [idx]: !p[idx] }))}
                          className="w-full text-left p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-800 flex items-start gap-2.5 text-xs"
                        >
                          {done ? (
                            <CheckSquare className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                          ) : (
                            <Square className="w-4 h-4 text-[#64748B] shrink-0 mt-0.5" />
                          )}
                          <span className={done ? 'line-through text-[#64748B]' : ''}>{step}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-xs text-amber-950 dark:text-amber-200">
                <strong>Important:</strong> {result.cautionNote}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
