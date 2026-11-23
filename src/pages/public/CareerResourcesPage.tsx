import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, FileCheck2, FileText, ShieldCheck } from 'lucide-react';

const GUIDES = [
  {
    title: 'Standard Photo & Signature Specifications for Indian Recruitment Portals',
    category: 'Document Preparation',
    summary:
      'Most central and state portals (UPSC, SSC, IBPS, RRB) enforce strict KB ranges (20–50 KB for photos, 10–20 KB for signatures) and white backgrounds. Prepare standardized scans once in Document Assistant.',
    checklist: [
      'Passport photograph: 200×230 px or 3.5×4.5 cm, JPEG format, 20–50 KB',
      'Signature: Black ink on plain white paper, JPEG format, 10–20 KB',
      'Class 10th & Degree certificates: Single PDF per document, 150–300 DPI',
    ],
  },
  {
    title: 'How to Verify Official Recruitment Notifications Before Paying Fees',
    category: 'Candidate Safety',
    summary:
      'Always inspect the domain suffix (.gov.in, .nic.in, or official corporate career portal) before entering personal details or paying examination fees.',
    checklist: [
      'Confirm notification number and date directly on the recruiting board website',
      'Never share OTPs, bank PINs, or Aadhaar numbers on unofficial job blogs',
      'Use FormSaathi source links to jump straight to verified portals',
    ],
  },
  {
    title: 'Structuring an ATS-Friendly Resume for Fresher & Early-Career Roles',
    category: 'Resume Strategy',
    summary:
      'Private IT, Data Analyst, and Business Analyst roles use Applicant Tracking Systems that parse clean single-column layouts more reliably than graphic templates.',
    checklist: [
      'Use standard section headings: Summary, Education, Experience, Projects, Skills',
      'Lead bullet points with concrete verbs and verified project outcomes',
      'Export selectable-text PDFs from Resume Studio rather than image-based scans',
    ],
  },
];

export function CareerResourcesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0D9488] dark:text-[#14B8A6]">
            Career Resources &amp; Guides
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#14243A] dark:text-white">
            Practical guides for Indian exams, resumes, and official applications.
          </h1>
          <p className="text-sm sm:text-base text-[#64748B] dark:text-slate-300 leading-relaxed max-w-2xl">
            Step-by-step preparation standards covering document sizing, ATS resume architecture, eligibility verification, and applicant privacy.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/eligibility"
              className="px-4 py-2.5 text-xs font-semibold bg-[#14243A] text-white dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
            >
              Try Eligibility Checker
            </Link>
            <Link
              to="/resume-studio"
              className="px-4 py-2.5 text-xs font-semibold border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            >
              Open Resume Studio
            </Link>
          </div>
        </div>
        <div className="lg:col-span-5">
          <div className="rounded-xl overflow-hidden border border-[#E2E8F0] dark:border-slate-800 aspect-[4/3] bg-slate-100 dark:bg-slate-900">
            <img
              src="/src/assets/images/resources_study_desk_1795457093782.jpg"
              alt="Clean preparation desk with notebook and laptop"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {GUIDES.map((g) => (
          <article
            key={g.title}
            className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-4"
          >
            <span className="text-xs font-semibold text-[#0D9488] dark:text-[#14B8A6]">
              {g.category}
            </span>
            <h2 className="text-lg font-bold text-[#172033] dark:text-white leading-snug">
              {g.title}
            </h2>
            <p className="text-sm text-[#64748B] dark:text-slate-400 leading-relaxed">
              {g.summary}
            </p>
            <ul className="space-y-2 pt-2 border-t border-[#E2E8F0] dark:border-slate-800 text-xs text-[#172033] dark:text-slate-200">
              {g.checklist.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#14B8A6] shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      {/* Job Scam Awareness Guide */}
      <section className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-7 space-y-5">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#DC2626] dark:text-red-400">
            Job Scam Awareness Guide
          </p>
          <h2 className="text-xl font-bold text-[#14243A] dark:text-white">
            How to spot suspicious job offers and fake recruitment messages
          </h2>
          <p className="text-xs text-[#64748B] dark:text-slate-400">
            Genuine employers and public commissions never demand security deposits, interview fees, or OTPs over messaging apps.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {[
            {
              title: '1. Domain Verification',
              desc: 'Verify government recruitment notices end in .gov.in or .nic.in and corporate jobs open on official company career domains.',
            },
            {
              title: '2. Zero Private Offer Fees',
              desc: 'Private employers do not charge "offer letter processing", "laptop security", or "training refundable deposit" fees.',
            },
            {
              title: '3. Guard Aadhaar, PAN & OTPs',
              desc: 'Never share Aadhaar/PAN scans, bank UPI PINs, or OTPs on WhatsApp, Telegram, or Google Forms before verified onboarding.',
            },
            {
              title: '4. Official Contact Channels',
              desc: 'Recruiters use official corporate email domains, not free personal Gmail/Outlook addresses demanding instant transfers.',
            },
          ].map((card) => (
            <div
              key={card.title}
              className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-800 space-y-1.5"
            >
              <h3 className="font-bold text-[#172033] dark:text-white">{card.title}</h3>
              <p className="text-[#64748B] dark:text-slate-300 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/tools/exam-calendar" className="flex items-start gap-3 group">
          <BookOpen className="w-5 h-5 text-[#14B8A6] shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold group-hover:text-[#0D9488]">Exam Calendar</h3>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
              Track UPSC, SSC, IBPS, and Railway official cycles and dates.
            </p>
          </div>
        </Link>
        <Link to="/tools/learning-hub" className="flex items-start gap-3 group">
          <FileText className="w-5 h-5 text-[#14B8A6] shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold group-hover:text-[#0D9488]">Skills Learning Hub</h3>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
              Practice Excel, SQL, Power BI, and interview communication skills.
            </p>
          </div>
        </Link>
        <Link to="/tools/photo-resizer" className="flex items-start gap-3 group">
          <FileCheck2 className="w-5 h-5 text-[#14B8A6] shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold group-hover:text-[#0D9488]">Photo &amp; Signature Resizer</h3>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
              Resize images in-browser to exact KB limits for Indian portals.
            </p>
          </div>
        </Link>
        <Link to="/privacy" className="flex items-start gap-3 group">
          <ShieldCheck className="w-5 h-5 text-[#14B8A6] shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold group-hover:text-[#0D9488]">DPDP Privacy Standards</h3>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
              Learn how FormSaathi protects your career records and supports export.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
