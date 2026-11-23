export function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <h1 className="text-3xl font-bold text-[#14243A] dark:text-white">
        Privacy Policy (India DPDP-Aligned)
      </h1>
      <p className="text-xs text-[#64748B] dark:text-slate-400">
        Effective Date: November 2026 · FormSaathi Career Platform
      </p>

      <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-5 text-sm text-[#64748B] dark:text-slate-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#172033] dark:text-white">
            1. Data Minimization &amp; Sensitive Personal Data
          </h2>
          <p>
            FormSaathi is designed in accordance with the Digital Personal Data Protection (DPDP) framework of India. We do not require Aadhaar numbers, PAN numbers, bank account credentials, or portal OTPs for job discovery, eligibility checking, or resume building.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#172033] dark:text-white">
            2. Information We Store When You Sign In
          </h2>
          <p>
            When you create an account, we store your name, email address, language preference, education/experience profile, saved jobs, application tracker entries, resumes, and document checklists strictly under your user ID in Firebase Cloud Firestore.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#172033] dark:text-white">
            3. AI Processing Disclosure
          </h2>
          <p>
            Queries submitted to FormSaathi AI Career Assistant and Resume Studio AI Assistance are processed securely through server-side API calls to Google Gemini models. Do not enter confidential government IDs or passwords in AI prompts.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#172033] dark:text-white">
            4. Your Rights: Access, Export &amp; Erasure
          </h2>
          <p>
            You may export all personal records in JSON format or permanently delete your account data directly from Dashboard &rarr; Account Security at any time.
          </p>
        </section>
      </div>
    </div>
  );
}

export function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <h1 className="text-3xl font-bold text-[#14243A] dark:text-white">
        Terms &amp; Conditions
      </h1>
      <p className="text-xs text-[#64748B] dark:text-slate-400">
        Last Updated: November 2026
      </p>

      <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-5 text-sm text-[#64748B] dark:text-slate-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#172033] dark:text-white">
            1. Independent Platform &amp; Non-Affiliation
          </h2>
          <p>
            FormSaathi is a private software platform and is not affiliated with UPSC, SSC, IBPS, Indian Railways, AICTE, or any government ministry or private employer. Official source URLs are provided on every verified listing.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#172033] dark:text-white">
            2. Eligibility &amp; AI Disclaimers
          </h2>
          <p>
            Rule-based eligibility evaluations and AI explanations are advisory tools. The official recruiting authority makes the final decision on candidate eligibility, fee waivers, and selection.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#172033] dark:text-white">
            3. Acceptable Use
          </h2>
          <p>
            Users must provide accurate information when reporting listings or submitting support requests and must not attempt automated scraping or unauthorized access to other users&apos; records.
          </p>
        </section>
      </div>
    </div>
  );
}
