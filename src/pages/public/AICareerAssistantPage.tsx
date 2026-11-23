import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bot, Globe, Loader2, Save, Send, ShieldAlert, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  fetchAIChats,
  fetchVerifiedJobs,
  logAIUsage,
  saveAIChatSession,
} from '../../services/firestoreService';
import type { AIChatMessage, JobListing, LanguageCode } from '../../types';

const SUGGESTED_PROMPTS = [
  'Explain this job notification in Hindi.',
  'Am I eligible for this job?',
  'What documents do I need?',
  'Explain how to apply.',
  'Prepare me for a Data Analyst interview.',
  'Improve my resume summary for fresher IT roles.',
];

export function AICareerAssistantPage() {
  const [searchParams] = useSearchParams();
  const initialJobId = searchParams.get('jobId') || '';
  const initialChatId = searchParams.get('chatId') || '';

  const { user, profile, getIdToken } = useAuth();
  const { language: appLanguage } = useLanguage();

  const [chatLang, setChatLang] = useState<LanguageCode>(appLanguage);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [selectedJobId, setSelectedJobId] = useState(initialJobId);
  const [chatId, setChatId] = useState<string | undefined>(initialChatId || undefined);
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Namaste! I am FormSaathi AI. Select an opportunity above or ask any question about eligibility, required documents, application steps, or interview preparation in English or Hindi.',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [saveNotice, setSaveNotice] = useState('');

  useEffect(() => {
    fetchVerifiedJobs().then((res) => setJobs(res.jobs));
  }, []);

  useEffect(() => {
    if (user && initialChatId) {
      fetchAIChats(user.uid).then((list) => {
        const found = list.find((c) => c.id === initialChatId);
        if (found) {
          setMessages(found.messages);
          setChatLang(found.language);
          if (found.jobId) setSelectedJobId(found.jobId);
        }
      });
    }
  }, [user, initialChatId]);

  const selectedJob = jobs.find((j) => j.id === selectedJobId) || null;

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    setErrorMsg('');
    setSaveNotice('');
    const userMsg: AIChatMessage = {
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const token = await getIdToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const resp = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: trimmed,
          language: chatLang,
          history: nextMessages.slice(-6),
          jobContext: selectedJob || undefined,
          userProfileSummary: profile
            ? {
                qualification: profile.qualification,
                experience: profile.experience,
                skills: profile.skills,
              }
            : undefined,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to get AI response.');
      }

      const aiMsg: AIChatMessage = {
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString(),
        disclaimer: data.disclaimer,
      };
      setMessages([...nextMessages, aiMsg]);
      setFollowUps(Array.isArray(data.suggestedFollowUps) ? data.suggestedFollowUps : []);

      if (user && user.emailVerified) {
        await logAIUsage(user.uid, 'assistant', chatLang);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error reaching FormSaathi AI.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSession = async () => {
    if (!user || !user.emailVerified) return;
    const titleSource = messages.find((m) => m.role === 'user')?.content || 'FormSaathi AI Chat';
    const newId = await saveAIChatSession(user.uid, {
      id: chatId,
      title: titleSource.slice(0, 80),
      language: chatLang,
      jobId: selectedJob?.id,
      messages,
    });
    setChatId(newId);
    setSaveNotice('Conversation saved to AI Assistant History.');
  };

  const handleClear = () => {
    setChatId(undefined);
    setFollowUps([]);
    setErrorMsg('');
    setSaveNotice('');
    setMessages([
      {
        role: 'assistant',
        content:
          chatLang === 'hi'
            ? 'नमस्ते! मैं FormSaathi AI हूँ। आप मुझसे नौकरी की अधिसूचना, पात्रता, आवश्यक दस्तावेज़ या इंटरव्यू की तैयारी के बारे में पूछ सकते हैं।'
            : 'Namaste! I am FormSaathi AI. Ask me about any job notification, documents, or interview prep.',
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#14243A] dark:text-white flex items-center gap-2.5">
            <Bot className="w-7 h-7 text-[#14B8A6]" />
            <span>FormSaathi AI Career Assistant</span>
          </h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1">
            Server-side Gemini guidance in English and Hindi. Never share Aadhaar, PAN, OTPs, or banking credentials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setChatLang(chatLang === 'en' ? 'hi' : 'en')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-[#E2E8F0] dark:border-slate-700 rounded-lg bg-white dark:bg-[#131E30]"
          >
            <Globe className="w-3.5 h-3.5 text-[#0D9488]" />
            <span>Response Language: {chatLang === 'en' ? 'English' : 'Hindi (हिन्दी)'}</span>
          </button>
          {user && user.emailVerified && (
            <button
              type="button"
              onClick={handleSaveSession}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#14243A] text-white dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Chat</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium border border-[#E2E8F0] dark:border-slate-700 rounded-lg text-[#64748B] hover:text-[#DC2626]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Job Context Selector */}
      <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-4 mb-5 flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="text-xs font-semibold text-[#172033] dark:text-slate-200 whitespace-nowrap">
          Job Context:
        </label>
        <select
          value={selectedJobId}
          onChange={(e) => setSelectedJobId(e.target.value)}
          className="flex-1 px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
        >
          <option value="">General Career Guidance (No specific job selected)</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.organization} — {j.title}
            </option>
          ))}
        </select>
      </div>

      {/* Suggested Prompts */}
      <div className="flex flex-wrap gap-2 mb-5">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => sendMessage(prompt)}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-700 hover:border-[#14B8A6] rounded-lg text-[#172033] dark:text-slate-200 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Window */}
      <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl flex flex-col min-h-[460px] max-h-[600px]">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={`${msg.timestamp}_${i}`}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#14243A] text-white dark:bg-[#14B8A6] dark:text-[#14243A]'
                    : 'bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-800 text-[#172033] dark:text-slate-100'
                }`}
              >
                <p className="whitespace-pre-line">{msg.content}</p>
                {msg.disclaimer && (
                  <p className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] text-[#64748B] dark:text-slate-400">
                    {msg.disclaimer}
                  </p>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-[#14B8A6]" />
              <span>FormSaathi AI is preparing your guidance...</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-[#DC2626] dark:text-red-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {saveNotice && (
            <p className="text-xs text-[#16A34A] font-medium">{saveNotice}</p>
          )}
        </div>

        {followUps.length > 0 && (
          <div className="px-5 py-2 border-t border-[#E2E8F0] dark:border-slate-800 flex flex-wrap gap-2 bg-[#F8FAFC] dark:bg-[#0B1320]">
            {followUps.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => sendMessage(f)}
                className="text-xs text-[#0D9488] dark:text-teal-300 hover:underline"
              >
                + {f}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="p-4 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={2000}
            placeholder={
              chatLang === 'hi'
                ? 'अपना प्रश्न यहाँ लिखें (जैसे: इस पद के लिए कौन से दस्तावेज़ चाहिए?)...'
                : 'Ask a career, eligibility, or application question...'
            }
            className="flex-1 px-4 py-2.5 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-[#14243A] hover:bg-[#1D3557] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
