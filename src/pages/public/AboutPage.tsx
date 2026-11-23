import { Link } from 'react-router-dom';
import { Globe2, ShieldCheck, Target } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-14">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-6 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0D9488] dark:text-[#14B8A6]">
            About FormSaathi
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#14243A] dark:text-white">
            Helping candidates move from discovery to confident application.
          </h1>
          <p className="text-sm sm:text-base text-[#64748B] dark:text-slate-300 leading-relaxed">
            Indian students, fresh graduates, and professionals navigate dozens of fragmented government notifications, campus drives, and private portals every month. FormSaathi unifies verified opportunity discovery, deterministic eligibility checking, document preparation, ATS resume building, and application tracking into one clear workspace.
          </p>
          <p className="text-sm text-[#64748B] dark:text-slate-400 leading-relaxed">
            Launched initially for India in English and Hindi, FormSaathi is architected for multi-language and international expansion.
          </p>
        </div>
        <div className="lg:col-span-6">
          <div className="rounded-xl overflow-hidden border border-[#E2E8F0] dark:border-slate-800 aspect-[4/3] bg-slate-100 dark:bg-slate-900">
            <img
              src="/src/assets/images/about_indian_professionals_1795457092756.jpg"
              alt="Indian graduates collaborating over laptops"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-2">
          <ShieldCheck className="w-6 h-6 text-[#14B8A6]" />
          <h2 className="text-base font-bold text-[#172033] dark:text-white">Independent &amp; Verified</h2>
          <p className="text-sm text-[#64748B] dark:text-slate-400">
            We never impersonate government agencies or invent vacancies. Every listing points directly to the genuine official portal.
          </p>
        </div>
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-2">
          <Target className="w-6 h-6 text-[#14B8A6]" />
          <h2 className="text-base font-bold text-[#172033] dark:text-white">Deterministic Eligibility</h2>
          <p className="text-sm text-[#64748B] dark:text-slate-400">
            Eligibility calculations use explicit rule-based logic rather than opaque guesswork, flagging anything that requires official verification.
          </p>
        </div>
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-2">
          <Globe2 className="w-6 h-6 text-[#14B8A6]" />
          <h2 className="text-base font-bold text-[#172033] dark:text-white">Built for Accessibility</h2>
          <p className="text-sm text-[#64748B] dark:text-slate-400">
            Bilingual English and Hindi workflows designed to load cleanly even on modest mobile devices and slower networks.
          </p>
        </div>
      </div>

      <div className="text-center">
        <Link
          to="/jobs"
          className="inline-flex px-6 py-3 text-sm font-semibold text-white bg-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
        >
          Explore Opportunities
        </Link>
      </div>
    </div>
  );
}
