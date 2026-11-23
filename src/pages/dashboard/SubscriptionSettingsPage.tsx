import { useState } from 'react';
import { CreditCard, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function SubscriptionSettingsPage() {
  const { subscription, getIdToken } = useAuth();
  const [gatewayMsg, setGatewayMsg] = useState('');

  const handleStatusCheck = async () => {
    const token = await getIdToken();
    const resp = await fetch('/api/subscription/intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const data = await resp.json();
    setGatewayMsg(
      data.message || data.error || 'Online payments are disabled in this build.'
    );
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#14243A] dark:text-white">Plan &amp; Usage</h1>
        <p className="text-sm text-[#64748B] dark:text-slate-400">
          All core FormSaathi 2.0 career and AI preparation tools are active on your free account.
        </p>
      </div>

      <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CreditCard className="w-5 h-5 text-[#14B8A6]" />
            <div>
              <p className="text-xs text-[#64748B]">Current Plan</p>
              <h2 className="text-lg font-bold capitalize">
                {subscription?.plan || 'Free'} Plan ({subscription?.status || 'active'})
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={handleStatusCheck}
            className="px-4 py-2 text-xs font-semibold border border-[#E2E8F0] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg"
          >
            Billing Status: Disabled
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#E2E8F0] dark:border-slate-800">
          <div>
            <p className="text-xs text-[#64748B]">AI Requests Recorded</p>
            <p className="text-xl font-bold font-mono-num mt-1">
              {subscription?.aiQueriesUsed ?? 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#64748B]">Saved Eligibility Checks</p>
            <p className="text-xl font-bold font-mono-num mt-1">
              {subscription?.eligibilityChecksUsed ?? 0}
            </p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-800 text-xs text-[#64748B] dark:text-slate-300 flex items-start gap-2">
          <Info className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" />
          <span>
            {gatewayMsg ||
              'Payment gateway billing (Razorpay) is optional and disabled. No payment configuration is needed to use FormSaathi.'}
          </span>
        </div>
      </div>
    </div>
  );
}
