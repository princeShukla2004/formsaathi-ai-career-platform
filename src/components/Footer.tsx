import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-white dark:bg-[#0F172A] border-t border-[#E2E8F0] dark:border-slate-800 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <Link
              to="/"
              className="text-lg font-bold tracking-tight text-[#14243A] dark:text-white"
            >
              {t('brandName')}
            </Link>
            <p className="mt-3 text-sm text-[#64748B] dark:text-slate-400 leading-relaxed">
              {t('tagline')}
            </p>
            <p className="mt-4 text-xs text-[#64748B] dark:text-slate-400 leading-relaxed">
              Independent career discovery, AI preparation, and application readiness platform launched for India, built for global readiness. Not affiliated with any government ministry or recruitment board.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#172033] dark:text-slate-100 mb-4">
              Opportunities &amp; Exams
            </h3>
            <ul className="space-y-2.5 text-sm text-[#64748B] dark:text-slate-400">
              <li><Link to="/jobs" className="hover:text-[#14243A] dark:hover:text-teal-300">Explore All Jobs</Link></li>
              <li><Link to="/jobs/government" className="hover:text-[#14243A] dark:hover:text-teal-300">Government Jobs</Link></li>
              <li><Link to="/jobs/private" className="hover:text-[#14243A] dark:hover:text-teal-300">Private Jobs</Link></li>
              <li><Link to="/jobs/internships" className="hover:text-[#14243A] dark:hover:text-teal-300">Internships</Link></li>
              <li><Link to="/tools/exam-calendar" className="hover:text-[#14243A] dark:hover:text-teal-300">Government Exam Calendar</Link></li>
              <li><Link to="/tools/compare-jobs" className="hover:text-[#14243A] dark:hover:text-teal-300">Compare Jobs Side-by-Side</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#172033] dark:text-slate-100 mb-4">
              AI &amp; Preparation Tools
            </h3>
            <ul className="space-y-2.5 text-sm text-[#64748B] dark:text-slate-400">
              <li><Link to="/tools/resume-analyzer" className="hover:text-[#14243A] dark:hover:text-teal-300">AI Resume Analyzer</Link></li>
              <li><Link to="/resume-studio" className="hover:text-[#14243A] dark:hover:text-teal-300">Resume Studio</Link></li>
              <li><Link to="/tools/mock-interview" className="hover:text-[#14243A] dark:hover:text-teal-300">AI Mock Interview Studio</Link></li>
              <li><Link to="/tools/mock-tests" className="hover:text-[#14243A] dark:hover:text-teal-300">Competitive Exam Mock Tests</Link></li>
              <li><Link to="/tools/career-roadmap" className="hover:text-[#14243A] dark:hover:text-teal-300">Career Roadmap Generator</Link></li>
              <li><Link to="/tools/form-assistant" className="hover:text-[#14243A] dark:hover:text-teal-300">Gov Form &amp; Photo Resizer</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#172033] dark:text-slate-100 mb-4">
              Trust &amp; Learning
            </h3>
            <ul className="space-y-2.5 text-sm text-[#64748B] dark:text-slate-400">
              <li><Link to="/tools/learning-hub" className="hover:text-[#14243A] dark:hover:text-teal-300">Skills &amp; Learning Hub</Link></li>
              <li><Link to="/eligibility" className="hover:text-[#14243A] dark:hover:text-teal-300">Eligibility Checker</Link></li>
              <li><Link to="/resources" className="hover:text-[#14243A] dark:hover:text-teal-300">Career Resources &amp; Safety</Link></li>
              <li><Link to="/pricing" className="hover:text-[#14243A] dark:hover:text-teal-300">Plans &amp; Free Access</Link></li>
              <li><Link to="/privacy" className="hover:text-[#14243A] dark:hover:text-teal-300">Privacy Policy (DPDP)</Link></li>
              <li><Link to="/contact" className="hover:text-[#14243A] dark:hover:text-teal-300">Contact &amp; Feedback</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-[#E2E8F0] dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#64748B] dark:text-slate-400">
          <p>&copy; {new Date().getFullYear()} FormSaathi. All rights reserved.</p>
          <p>Always verify final dates, fees, and eligibility on the official recruiting portal.</p>
        </div>
      </div>
    </footer>
  );
}
