import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function PricingPage() {
  const { user, getIdToken } = useAuth();
  const [statusMessage, setStatusMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const handleCheckPlan = async () => {
    setBusy(true);
    setStatusMessage('');
    try {
      const token = await getIdToken();
      const resp = await fetch('/api/subscription/intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await resp.json();
      setStatusMessage(
        data.message ||
          data.error ||
          'Online payments are disabled in this build. All core FormSaathi 2.0 tools are available free.'
      );
    } catch {
      setStatusMessage('Online payment gateway is disabled. All FormSaathi 2.0 tools remain open for free use.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-10">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#14243A] dark:text-white">
          Free Career Discovery &amp; Preparation Tools
        </h1>
        <p className="text-sm sm:text-base text-[#64748B] dark:text-slate-400">
          All FormSaathi 2.0 features work immediately without payment setup. Online billing is optional and disabled in this release.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <div className="bg-white dark:bg-[#131E30] border border-[#14B8A6] rounded-xl p-8 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-[#0D9488] dark:text-[#14B8A6]">
              Included Immediately · No Payment Required
            </p>
            <h2 className="text-2xl font-bold text-[#172033] dark:text-white mt-1">Community Free Plan</h2>
            <p className="text-3xl font-bold font-mono-num text-[#14243A] dark:text-[#14B8A6] mt-4">
              ₹0 <span className="text-xs font-normal text-[#64748B]">/ active now</span>
            </p>
            <ul className="mt-6 space-y-3 text-sm text-[#172033] dark:text-slate-200">
              {[
                'Verified Government, Private & Internship discovery + Job Comparison',
                'Deterministic Eligibility Checker & Job Safety Awareness checks',
                'AI Career Assistant, Resume Analyzer, Mock Interview & Career Roadmap',
                'Resume Studio (4 ATS templates + PDF export) & Photo/Signature Resizer',
                'Competitive Exam Mock Tests, Exam Calendar & Skills Learning Hub',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <Link
            to={user ? '/dashboard' : '/register'}
            className="mt-8 block text-center px-5 py-2.5 text-sm font-semibold text-white bg-[#14243A] hover:bg-[#1D3557] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
          >
            {user ? 'Open Dashboard' : 'Create Free Account'}
          </Link>
        </div>

        <div className="bg-[#14243A] text-white border border-[#1D3557] rounded-xl p-8 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-[#14B8A6]">
              Optional Future Integration
            </p>
            <h2 className="text-2xl font-bold mt-1">Pro Tier (Billing Disabled)</h2>
            <p className="text-3xl font-bold font-mono-num text-[#CCFBF1] mt-4">
              Optional <span className="text-xs font-normal text-slate-300">· Razorpay disabled</span>
            </p>
            <p className="mt-4 text-sm text-slate-300 leading-relaxed">
              The subscription architecture remains cleanly preserved in Firestore for future Razorpay integration if needed, while payment processing is completely turned off so students never face paywalls or broken checkout prompts.
            </p>
          </div>
          <div className="mt-8">
            <button
              type="button"
              disabled={busy || !user}
              onClick={handleCheckPlan}
              className="w-full px-5 py-2.5 text-sm font-semibold border border-slate-600 text-slate-200 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-60"
            >
              {user ? (busy ? 'Checking status...' : 'View Payment Gateway Status') : 'Sign in to check plan'}
            </button>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="max-w-3xl mx-auto p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-[#E2E8F0] dark:border-slate-700 flex items-start gap-3 text-xs sm:text-sm text-[#172033] dark:text-slate-200">
          <Info className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" />
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  );
}
