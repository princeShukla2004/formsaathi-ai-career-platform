import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Compass,
  ExternalLink,
  FileCheck2,
  FileSearch,
  FileText,
  GraduationCap,
  Image as ImageIcon,
  MapPin,
  Mic,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { JobCard } from '../../components/JobCard';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { fetchCategories, fetchExamEvents, fetchVerifiedJobs } from '../../services/firestoreService';
import type { ExamEvent, JobCategory, JobListing } from '../../types';

const FAQS = [
  {
    q: 'Is FormSaathi an official government website?',
    a: 'No. FormSaathi is an independent career discovery and application preparation platform. Every government and private listing includes the genuine official portal link and verification timestamp so you always apply directly on the official website.',
  },
  {
    q: 'How does the Smart Eligibility Checker & Job Match calculate results?',
    a: 'It uses deterministic, transparent rule-based logic comparing your age, educational qualification, marks, experience, and skills against the published criteria. It never invents criteria or guarantees selection.',
  },
  {
    q: 'Are FormSaathi Mock Tests official government exam papers?',
    a: 'No. Practice tests inside our Mock Test Platform are clearly labeled as Unofficial Practice sets for preparation and time management.',
  },
  {
    q: 'Do I need to enter Aadhaar, PAN, or pay to use FormSaathi?',
    a: 'No. Under our privacy-first DPDP-aligned architecture, FormSaathi never asks for Aadhaar, PAN, OTPs, or banking passwords. All core career tools and mock tests are available free without payment setup.',
  },
  {
    q: 'Can I use FormSaathi AI and Form Assistant in Hindi?',
    a: 'Yes. Switch between English and Hindi at any time from the header, and FormSaathi AI + Form Assistant can explain notifications and form fields in clear Hindi.',
  },
];

export function HomePage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [examEvents, setExamEvents] = useState<ExamEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    Promise.all([fetchVerifiedJobs(), fetchCategories(), fetchExamEvents()])
      .then(([jobRes, catRes, examRes]) => {
        setJobs(jobRes.jobs);
        setCategories(catRes);
        setExamEvents(examRes);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set('q', keyword.trim());
    if (location.trim()) params.set('loc', location.trim());
    navigate(`/jobs?${params.toString()}`);
  };

  const latestJobs = jobs.slice(0, 3);
  const govJobs = jobs.filter((j) => j.sector === 'government').slice(0, 3);
  const privateJobs = jobs.filter((j) => j.sector === 'private').slice(0, 3);
  const internshipJobs = jobs.filter((j) => j.sector === 'internship').slice(0, 3);

  return (
    <div>
      {/* 1. Hero Section */}
      <section className="bg-white dark:bg-[#131E30] border-b border-[#E2E8F0] dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#0D9488] dark:text-[#14B8A6]">
                {t('tagline')}
              </p>
              <h1
                className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#14243A] dark:text-white leading-[1.14]"
                style={{ textWrap: 'balance' }}
              >
                Your Next Career Opportunity Starts Here.
              </h1>
              <p className="text-base sm:text-lg text-[#64748B] dark:text-slate-300 leading-relaxed max-w-2xl">
                Discover verified jobs, check eligibility, build your resume and prepare for interviews with your AI-powered career companion.
              </p>

              {/* Smart Job & Location Search */}
              <form
                onSubmit={handleHeroSearch}
                className="bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-xl p-2 flex flex-col sm:flex-row gap-2"
              >
                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#131E30] rounded-lg border border-[#E2E8F0] dark:border-slate-800">
                  <Search className="w-4 h-4 text-[#64748B] shrink-0" />
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder={t('searchPlaceholder')}
                    aria-label="Search job title, company, or keyword"
                    className="w-full bg-transparent text-sm text-[#172033] dark:text-slate-100 placeholder:text-[#64748B] focus:outline-none"
                  />
                </div>
                <div className="sm:w-48 flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#131E30] rounded-lg border border-[#E2E8F0] dark:border-slate-800">
                  <MapPin className="w-4 h-4 text-[#64748B] shrink-0" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder={t('locationPlaceholder')}
                    aria-label="Location"
                    className="w-full bg-transparent text-sm text-[#172033] dark:text-slate-100 placeholder:text-[#64748B] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-[#14243A] hover:bg-[#1D3557] dark:bg-[#14B8A6] dark:text-[#14243A] dark:hover:bg-teal-400 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  {t('searchBtn')}
                </button>
              </form>

              {/* Government & Private Shortcuts + Primary CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  to="/jobs"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#14243A] hover:bg-[#1D3557] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg transition-colors"
                >
                  <span>Explore Opportunities</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                {!user && (
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#14243A] dark:text-slate-100 border border-[#E2E8F0] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    Create Free Account
                  </Link>
                )}
                <div className="flex items-center gap-3 pl-1 text-xs font-medium text-[#64748B] dark:text-slate-400">
                  <Link to="/jobs/government" className="hover:text-[#0D9488] underline underline-offset-4">
                    Government Portals
                  </Link>
                  <span aria-hidden="true">·</span>
                  <Link to="/jobs/private" className="hover:text-[#0D9488] underline underline-offset-4">
                    Private Careers
                  </Link>
                  <span aria-hidden="true">·</span>
                  <Link to="/jobs/internships" className="hover:text-[#0D9488] underline underline-offset-4">
                    Internships
                  </Link>
                </div>
              </div>
            </div>

            {/* Attractive Dashboard Preview */}
            <div className="lg:col-span-5">
              <div className="bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 space-y-3.5">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-slate-800 pb-3">
                  <div>
                    <p className="text-xs font-semibold text-[#0D9488] dark:text-[#14B8A6]">
                      FormSaathi 2.0 Workspace
                    </p>
                    <p className="text-sm font-semibold text-[#172033] dark:text-slate-100">
                      Career Preparation &amp; Discovery
                    </p>
                  </div>
                  <Link
                    to="/eligibility"
                    className="text-xs font-medium text-[#14243A] dark:text-teal-300 hover:underline"
                  >
                    Try Checker
                  </Link>
                </div>

                <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#172033] dark:text-slate-100">
                      AI Resume Analyzer &amp; Studio
                    </span>
                    <span className="font-mono-num text-[#0D9488] font-semibold">ATS Check</span>
                  </div>
                  <p className="text-xs text-[#64748B] dark:text-slate-400">
                    Upload PDF or build from 4 ATS templates with factual keyword gap checks
                  </p>
                </div>

                <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#172033] dark:text-slate-100">
                      Mock Interview &amp; Exam Practice
                    </span>
                    <span className="text-[#16A34A] font-medium inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Interactive
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] dark:text-slate-400">
                    Practice role-based interviews and timed SSC, Banking &amp; UPSC drills
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <Link
                    to="/tools/exam-calendar"
                    className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 hover:border-[#14B8A6] rounded-lg p-3 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 text-[#64748B] dark:text-slate-400 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-[#0D9488]" />
                      <span>Exam Calendar</span>
                    </div>
                    <p className="font-semibold text-[#172033] dark:text-slate-100">
                      Official Portals
                    </p>
                  </Link>
                  <Link
                    to="/tools/photo-resizer"
                    className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 hover:border-[#14B8A6] rounded-lg p-3 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 text-[#64748B] dark:text-slate-400 mb-1">
                      <ImageIcon className="w-3.5 h-3.5 text-[#0D9488]" />
                      <span>Photo Resizer</span>
                    </div>
                    <p className="font-semibold text-[#172033] dark:text-slate-100">
                      Exact KB &amp; px
                    </p>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Transparency Policy Banner */}
      <section className="bg-[#14243A] text-white py-7">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-[#14B8A6] shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-semibold">{t('trustedBannerTitle')}</h2>
              <p className="text-sm text-slate-300 mt-1 max-w-3xl">{t('trustedBannerBody')}</p>
            </div>
          </div>
          <Link to="/about" className="text-xs font-semibold text-[#CCFBF1] hover:underline whitespace-nowrap shrink-0">
            Read verification policy
          </Link>
        </div>
      </section>

      {/* 2. Popular Job Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-[#172033] dark:text-white">Popular Job Categories</h2>
            <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1">
              Browse curated opportunities across government services, private technology teams, and internships.
            </p>
          </div>
          <Link to="/jobs" className="text-sm font-medium text-[#0D9488] dark:text-teal-300 hover:underline whitespace-nowrap">
            View all categories
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.slice(0, 12).map((cat) => (
            <Link
              key={cat.slug}
              to={`/jobs?category=${encodeURIComponent(cat.name)}`}
              className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 hover:border-[#14B8A6] rounded-xl p-4 transition-colors group"
            >
              <p className="text-sm font-semibold text-[#172033] dark:text-slate-100 group-hover:text-[#0D9488] dark:group-hover:text-teal-300">
                {language === 'hi' && cat.nameHi ? cat.nameHi : cat.name}
              </p>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1 capitalize">
                {cat.sector === 'all' ? 'Gov & Private' : cat.sector}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Latest Verified Opportunities */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#172033] dark:text-white">
              Latest Verified Opportunities
            </h2>
            <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1">
              Every listing links directly to its official portal for safe submission.
            </p>
          </div>
          <Link to="/jobs" className="text-sm font-medium text-[#0D9488] dark:text-teal-300 hover:underline whitespace-nowrap">
            Explore all
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-56 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {latestJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>

      {/* 4. Government Job Updates */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-[#14243A] dark:text-[#14B8A6]" />
            <h2 className="text-2xl font-bold text-[#172033] dark:text-white">Government Job Updates</h2>
          </div>
          <Link to="/jobs/government" className="text-sm font-medium text-[#0D9488] dark:text-teal-300 hover:underline whitespace-nowrap">
            All Government Jobs
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {govJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </section>

      {/* 5. Private Job Opportunities */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div className="flex items-center gap-2.5">
            <Briefcase className="w-5 h-5 text-[#14243A] dark:text-[#14B8A6]" />
            <h2 className="text-2xl font-bold text-[#172033] dark:text-white">Private Job Opportunities</h2>
          </div>
          <Link to="/jobs/private" className="text-sm font-medium text-[#0D9488] dark:text-teal-300 hover:underline whitespace-nowrap">
            All Private Jobs
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {privateJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </section>

      {/* 6. Internship Opportunities */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div className="flex items-center gap-2.5">
            <GraduationCap className="w-5 h-5 text-[#14243A] dark:text-[#14B8A6]" />
            <h2 className="text-2xl font-bold text-[#172033] dark:text-white">Internship Opportunities</h2>
          </div>
          <Link to="/jobs/internships" className="text-sm font-medium text-[#0D9488] dark:text-teal-300 hover:underline whitespace-nowrap">
            All Internships
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {internshipJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </section>

      {/* 7. AI Career Tools */}
      <section className="bg-white dark:bg-[#131E30] border-y border-[#E2E8F0] dark:border-slate-800 py-14 mt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#172033] dark:text-white">
              AI Career Tools &amp; Preparation Suite
            </h2>
            <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1">
              Practical preparation tools built around factual guidance and real official portals.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Bot, title: 'AI Career Assistant', desc: 'Translate complex job notifications into plain English or Hindi.', to: '/assistant' },
              { icon: FileSearch, title: 'AI Resume Analyzer', desc: 'Upload your PDF resume for ATS score, keyword gaps, and honest rewrites.', to: '/tools/resume-analyzer' },
              { icon: Compass, title: 'Career Roadmap Generator', desc: 'Step-by-step Beginner to Advanced milestones with projects & weekly plan.', to: '/tools/career-roadmap' },
              { icon: FileCheck2, title: 'Government Form Assistant', desc: 'Understand confusing form fields, fee categories, and document specs.', to: '/tools/form-assistant' },
              { icon: ClipboardCheck, title: 'Competitive Mock Tests', desc: 'Timed SSC, Railway, Banking & UPSC practice sets with explanations.', to: '/tools/mock-tests' },
              { icon: GraduationCap, title: 'Skills & Learning Hub', desc: 'Structured lessons for Excel, SQL, Power BI, Tableau & Interviews.', to: '/tools/learning-hub' },
            ].map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.to}
                  to={tool.to}
                  className="bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-800 hover:border-[#14B8A6] rounded-xl p-6 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <Icon className="w-6 h-6 text-[#0D9488] dark:text-[#14B8A6] mb-3" />
                    <h3 className="text-base font-bold text-[#172033] dark:text-white">{tool.title}</h3>
                    <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 mt-1.5 leading-relaxed">
                      {tool.desc}
                    </p>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#0D9488] dark:text-teal-300">
                    Open tool <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8 & 9. Resume Studio + Mock Interview Split */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-7 flex flex-col justify-between">
          <div>
            <FileText className="w-7 h-7 text-[#14243A] dark:text-[#14B8A6] mb-4" />
            <h2 className="text-xl font-bold text-[#172033] dark:text-white mb-2">Resume Studio</h2>
            <p className="text-sm text-[#64748B] dark:text-slate-400 leading-relaxed mb-6">
              Create structured resumes across 4 ATS-friendly templates (Modern Professional, Minimal ATS, Fresh Graduate, Technical), polish your wording with factual AI assistance, and export selectable-text PDFs.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/resume-studio"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
            >
              Open Resume Studio
            </Link>
            <Link
              to="/tools/resume-analyzer"
              className="px-4 py-2 text-xs font-semibold border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            >
              Analyze Existing Resume
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-7 flex flex-col justify-between">
          <div>
            <Mic className="w-7 h-7 text-[#0D9488] dark:text-[#14B8A6] mb-4" />
            <h2 className="text-xl font-bold text-[#172033] dark:text-white mb-2">AI Mock Interview Studio</h2>
            <p className="text-sm text-[#64748B] dark:text-slate-400 leading-relaxed mb-6">
              Practice role-specific interviews for Software Developer, Data Analyst, Government Officer, Bank PO, and more. Answer one question at a time and receive structured written feedback on clarity, relevance, and completeness.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/tools/mock-interview"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
            >
              Start Mock Interview
            </Link>
            <Link
              to="/eligibility"
              className="px-4 py-2 text-xs font-semibold border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            >
              Run Eligibility Check
            </Link>
          </div>
        </div>
      </section>

      {/* 10. Government Exam Calendar Spotlight */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-[#172033] dark:text-white">
                Government Exam Calendar Reference
              </h2>
              <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1">
                Official examination commission portals and verified schedule links—never fabricated exam dates.
              </p>
            </div>
            <Link
              to="/tools/exam-calendar"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0D9488] dark:text-teal-300 hover:underline whitespace-nowrap"
            >
              <span>Full Exam Calendar</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {examEvents.slice(0, 4).map((ev) => (
              <div
                key={ev.id}
                className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-800 flex flex-col justify-between space-y-3"
              >
                <div>
                  <p className="text-xs font-semibold text-[#0D9488] dark:text-[#14B8A6]">{ev.category}</p>
                  <h3 className="text-sm font-bold text-[#172033] dark:text-slate-100 mt-1 line-clamp-2">
                    {ev.title}
                  </h3>
                  <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">{ev.organization}</p>
                </div>
                <a
                  href={ev.officialURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#14243A] dark:text-teal-300 hover:underline"
                >
                  <span>Official Calendar</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11. How FormSaathi Works */}
      <section className="bg-white dark:bg-[#131E30] border-y border-[#E2E8F0] dark:border-slate-800 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#172033] dark:text-white mb-10">
            How FormSaathi Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                num: '01.',
                title: 'Discover & Compare Roles',
                desc: 'Browse verified government, private, and internship listings with side-by-side comparison and safety checks.',
              },
              {
                num: '02.',
                title: 'Check Deterministic Rules',
                desc: 'Verify age, qualification, marks, and experience criteria before investing time applying.',
              },
              {
                num: '03.',
                title: 'Prepare Resume, Docs & Photos',
                desc: 'Analyze your resume, generate a document checklist, and resize photos/signatures to exact KB & px.',
              },
              {
                num: '04.',
                title: 'Practice & Apply Officially',
                desc: 'Sharpen skills via Mock Tests & AI Mock Interviews, then submit directly on the official portal.',
              },
            ].map((step) => (
              <div key={step.num} className="space-y-2.5">
                <span className="font-mono-num text-sm font-semibold text-[#0D9488] dark:text-[#14B8A6]">
                  {step.num}
                </span>
                <h3 className="text-lg font-semibold text-[#172033] dark:text-slate-100">{step.title}</h3>
                <p className="text-sm text-[#64748B] dark:text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 13. FAQ */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-[#172033] dark:text-white mb-8 text-center">
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          {FAQS.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={item.q}
                className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-[#172033] dark:text-slate-100"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 text-[#64748B] transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 text-sm text-[#64748B] dark:text-slate-400 leading-relaxed border-t border-[#E2E8F0] dark:border-slate-800 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 14. Final CTA */}
      <section className="bg-[#14243A] text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5">
          <h2 className="text-2xl sm:text-3xl font-bold" style={{ textWrap: 'balance' }}>
            Ready to organize your next career move?
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
            Explore verified opportunities freely, or create a free account to unlock saved jobs, mock interview history, resume analyses, and exam reminders.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to={user ? '/dashboard' : '/register'}
              className="px-6 py-3 text-sm font-semibold bg-[#14B8A6] text-[#14243A] hover:bg-teal-400 rounded-lg transition-colors"
            >
              {user ? 'Open My Dashboard' : 'Create Free Account'}
            </Link>
            <Link
              to="/jobs"
              className="px-6 py-3 text-sm font-semibold border border-slate-600 text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              Explore Opportunities
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
