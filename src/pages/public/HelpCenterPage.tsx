import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Search } from 'lucide-react';

const HELP_ARTICLES = [
  {
    q: 'How do I save a job or track my application?',
    a: 'Sign in with Google or a verified email account, open any job listing, and click "Save Job" or "Track in Applications". All records sync privately to your Candidate Dashboard.',
    link: '/dashboard/applications',
  },
  {
    q: 'Why does the Eligibility Checker show "Needs Verification"?',
    a: 'When an opportunity has category-based age relaxations, state domicile rules, or missing percentage input, FormSaathi avoids guessing and clearly flags the exact item to verify on the official notification.',
    link: '/eligibility',
  },
  {
    q: 'Does FormSaathi submit applications automatically on my behalf?',
    a: 'No. FormSaathi never claims automatic submission and never asks for your portal passwords or OTPs. Always click "Apply on Official Website" to submit directly on the recruiting portal.',
    link: '/jobs',
  },
  {
    q: 'How can I export or delete all my personal data?',
    a: 'Go to Dashboard -> Account Security. You can download a full JSON export of your profile, resumes, checklists, and applications, or permanently delete your account data.',
    link: '/dashboard/security',
  },
];

export function HelpCenterPage() {
  const [queryText, setQueryText] = useState('');
  const filtered = HELP_ARTICLES.filter(
    (item) =>
      item.q.toLowerCase().includes(queryText.toLowerCase()) ||
      item.a.toLowerCase().includes(queryText.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[#0D9488]">
          <HelpCircle className="w-4 h-4" />
          <span>Help Center</span>
        </div>
        <h1 className="text-3xl font-bold text-[#14243A] dark:text-white">How can we help?</h1>
        <div className="relative pt-2">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-5" />
          <input
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Search help topics (e.g. eligibility, PDF, delete account)..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-700 rounded-xl"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((item) => (
          <div
            key={item.q}
            className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-2"
          >
            <h2 className="text-base font-bold text-[#172033] dark:text-white">{item.q}</h2>
            <p className="text-sm text-[#64748B] dark:text-slate-400 leading-relaxed">{item.a}</p>
            <Link
              to={item.link}
              className="inline-block text-xs font-semibold text-[#0D9488] dark:text-teal-300 hover:underline pt-1"
            >
              Open related tool
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
