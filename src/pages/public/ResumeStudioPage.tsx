import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import type { User } from 'firebase/auth';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Copy,
  Download,
  FilePlus2,
  Loader2,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  fetchUserProfile,
  fetchUserResumes,
  logAIUsage,
  saveResumeRecord,
  updateUserProfileRecord,
} from '../../services/firestoreService';
import type { ResumeRecord, ResumeTemplateId, UserProfile } from '../../types';

const ALL_SECTIONS = [
  'summary',
  'education',
  'experience',
  'internships',
  'projects',
  'skills',
  'certifications',
  'languages',
  'achievements',
] as const;

type ResumeSectionKey = (typeof ALL_SECTIONS)[number];

const SECTION_LABELS: Record<ResumeSectionKey, string> = {
  summary: 'Professional Summary',
  education: 'Education',
  experience: 'Work Experience',
  internships: 'Internships',
  projects: 'Projects',
  skills: 'Technical Skills',
  certifications: 'Certifications',
  languages: 'Languages',
  achievements: 'Achievements',
};

type EditableResume = Omit<ResumeRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

function createBlankResume(): EditableResume {
  return {
    title: 'My Resume',
    template: 'modern',
    personalDetails: {
      fullName: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      portfolio: '',
    },
    summary: '',
    education: [],
    experience: [],
    internships: [],
    projects: [],
    skills: [],
    certifications: [],
    languages: [],
    achievements: [],
    sectionOrder: [...ALL_SECTIONS],
  };
}

function buildResumeFromProfile(profile: UserProfile | null, user: User | null): EditableResume {
  const fullName = (profile?.name || user?.displayName || '').trim();
  const email = (profile?.email || user?.email || '').trim();
  const phone = (profile?.phone || '').trim();
  const location = (profile?.location || profile?.preferredLocations?.[0] || '').trim();
  const linkedin = (profile?.linkedin || '').trim();
  const portfolio = (profile?.portfolio || '').trim();
  const summary = (profile?.summary || '').trim();

  const educationDegree = [profile?.qualification, profile?.education]
    .map((v) => (v || '').trim())
    .filter(Boolean)
    .join(' — ');

  return {
    title: fullName ? `${fullName} — Resume` : 'My Resume',
    template: 'modern',
    personalDetails: {
      fullName,
      email,
      phone,
      location,
      linkedin,
      portfolio,
    },
    summary,
    education: educationDegree
      ? [{ institution: '', degree: educationDegree, year: '', score: '' }]
      : [],
    experience: [],
    internships: [],
    projects: [],
    skills: Array.isArray(profile?.skills)
      ? profile.skills.map((s) => s.trim()).filter(Boolean)
      : [],
    certifications: Array.isArray(profile?.certifications)
      ? profile.certifications.map((c) => c.trim()).filter(Boolean)
      : [],
    languages: [],
    achievements: [],
    sectionOrder: [...ALL_SECTIONS],
  };
}

function containsSensitiveIds(text: string): boolean {
  if (!text) return false;
  const aadhaarPattern = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/;
  const panPattern = /\b[A-Z]{5}\d{4}[A-Z]\b/;
  return aadhaarPattern.test(text) || panPattern.test(text);
}

function sanitizeEducationEntries(entries: EditableResume['education'] | undefined) {
  if (!Array.isArray(entries)) return [];
  return entries.filter(
    (ed) =>
      Boolean(ed?.degree?.trim()) ||
      Boolean(ed?.institution?.trim()) ||
      Boolean(ed?.year?.trim()) ||
      Boolean(ed?.score?.trim())
  );
}

function sanitizeExperienceEntries(entries: EditableResume['experience'] | undefined) {
  if (!Array.isArray(entries)) return [];
  return entries.filter(
    (ex) =>
      Boolean(ex?.role?.trim()) ||
      Boolean(ex?.organization?.trim()) ||
      Boolean(ex?.duration?.trim()) ||
      Boolean(ex?.highlights?.trim())
  );
}

function sanitizeProjectEntries(entries: EditableResume['projects'] | undefined) {
  if (!Array.isArray(entries)) return [];
  return entries.filter(
    (p) =>
      Boolean(p?.name?.trim()) ||
      Boolean(p?.techStack?.trim()) ||
      Boolean(p?.description?.trim())
  );
}

function sanitizeStringEntries(entries: string[] | undefined) {
  if (!Array.isArray(entries)) return [];
  return entries.map((item) => item.trim()).filter(Boolean);
}

export function ResumeStudioPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const resumeIdParam = searchParams.get('resumeId');
  const isNewParam = searchParams.get('new') === '1';
  const { user, profile, authReady, refreshProfile, getIdToken } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [resumeId, setResumeId] = useState<string | undefined>(resumeIdParam || undefined);
  const [savedResumes, setSavedResumes] = useState<ResumeRecord[]>([]);
  const [firestoreProfile, setFirestoreProfile] = useState<UserProfile | null>(null);
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [profileAlertDismissed, setProfileAlertDismissed] = useState(false);
  const [resume, setResume] = useState<EditableResume>(createBlankResume());
  const [syncToProfile, setSyncToProfile] = useState(true);

  const [skillInput, setSkillInput] = useState('');
  const [certInput, setCertInput] = useState('');
  const [langInput, setLangInput] = useState('');
  const [achInput, setAchInput] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncingProfile, setSyncingProfile] = useState(false);
  const [aiNote, setAiNote] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const activeUserProfile = firestoreProfile || profile;

  const hydrateFromRecord = (match: ResumeRecord, userProfile: UserProfile | null) => {
    setResumeId(match.id);
    setResume({
      title: match.title || 'My Resume',
      template: match.template || 'modern',
      personalDetails: {
        fullName:
          match.personalDetails?.fullName || userProfile?.name || user?.displayName || '',
        email: match.personalDetails?.email || userProfile?.email || user?.email || '',
        phone: match.personalDetails?.phone || userProfile?.phone || '',
        location:
          match.personalDetails?.location ||
          userProfile?.location ||
          userProfile?.preferredLocations?.[0] ||
          '',
        linkedin: match.personalDetails?.linkedin || userProfile?.linkedin || '',
        portfolio: match.personalDetails?.portfolio || userProfile?.portfolio || '',
      },
      summary: match.summary || '',
      education: sanitizeEducationEntries(match.education),
      experience: sanitizeExperienceEntries(match.experience),
      internships: sanitizeExperienceEntries(match.internships),
      projects: sanitizeProjectEntries(match.projects),
      skills: sanitizeStringEntries(match.skills),
      certifications: sanitizeStringEntries(match.certifications),
      languages: sanitizeStringEntries(match.languages),
      achievements: sanitizeStringEntries(match.achievements),
      sectionOrder:
        Array.isArray(match.sectionOrder) && match.sectionOrder.length > 0
          ? match.sectionOrder
          : [...ALL_SECTIONS],
    });
  };

  useEffect(() => {
    if (!authReady) return;

    const applyStagedImport = (base: EditableResume): EditableResume => {
      const stagedRaw = localStorage.getItem('formsaathi_resume_import');
      if (!stagedRaw) return base;
      try {
        const staged = JSON.parse(stagedRaw);
        localStorage.removeItem('formsaathi_resume_import');
        setAiNote(
          staged.suggestedKeywords?.length
            ? `Imported draft summary from Resume Analyzer. Consider adding: ${staged.suggestedKeywords.join(', ')}`
            : 'Imported improved summary from Resume Analyzer.'
        );
        return {
          ...base,
          title: staged.targetRole ? `${staged.targetRole} Resume` : base.title,
          summary: staged.improvedSummary || base.summary,
        };
      } catch {
        return base;
      }
    };

    if (!user) {
      setSavedResumes([]);
      setFirestoreProfile(null);
      setResumeId(undefined);
      setResume(applyStagedImport(createBlankResume()));
      return;
    }

    let cancelled = false;
    setLoadingResumes(true);
    setProfileAlertDismissed(false);
    Promise.all([
      fetchUserProfile(user.uid, true).catch(() => null),
      fetchUserResumes(user.uid).catch(() => [] as ResumeRecord[]),
    ])
      .then(([freshProfile, list]) => {
        if (cancelled) return;
        const resolvedProfile = freshProfile || profile;
        setFirestoreProfile(freshProfile);
        setSavedResumes(list);

        if (resumeIdParam) {
          const match = list.find((r) => r.id === resumeIdParam);
          if (match) {
            hydrateFromRecord(match, resolvedProfile);
            return;
          }
        }

        if (!isNewParam && list.length > 0) {
          const latest = list[0];
          hydrateFromRecord(latest, resolvedProfile);
          setSearchParams({ resumeId: latest.id }, { replace: true });
          return;
        }

        setResumeId(undefined);
        const fromProfile = buildResumeFromProfile(resolvedProfile, user);
        setResume(applyStagedImport(fromProfile));
      })
      .finally(() => {
        if (!cancelled) setLoadingResumes(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, user?.uid, resumeIdParam, isNewParam]);

  const mandatoryProfileChecks = useMemo(() => {
    if (!user || loadingResumes) return [];
    const targetProfile = firestoreProfile;
    return [
      {
        label: 'Full Name',
        present: Boolean(targetProfile?.name?.trim()),
      },
      {
        label: 'Email Address',
        present: Boolean(targetProfile?.email?.trim()),
      },
      {
        label: 'Phone Number',
        present: Boolean(targetProfile?.phone?.trim()),
      },
      {
        label: 'Current Location',
        present: Boolean(targetProfile?.location?.trim()),
      },
      {
        label: 'Education / Qualification',
        present: Boolean(
          targetProfile?.education?.trim() || targetProfile?.qualification?.trim()
        ),
      },
    ];
  }, [user, loadingResumes, firestoreProfile]);

  const missingProfileFields = useMemo(
    () => mandatoryProfileChecks.filter((item) => !item.present).map((item) => item.label),
    [mandatoryProfileChecks]
  );

  const hasIncompleteProfile = Boolean(
    authReady &&
      user &&
      !loadingResumes &&
      (!firestoreProfile || missingProfileFields.length > 0)
  );

  const handleSyncFromProfile = async () => {
    if (!user) return;
    setSyncingProfile(true);
    setErrorMsg('');
    setSaveMsg('');
    try {
      const latestProfile = await fetchUserProfile(user.uid, true);
      if (!latestProfile) {
        setFirestoreProfile(null);
        setErrorMsg('No profile document found in Firestore for your account yet. Please save Profile Settings first.');
        return;
      }
      setFirestoreProfile(latestProfile);
      await refreshProfile().catch(() => {});

      const fromProfile = buildResumeFromProfile(latestProfile, user);
      setResume((prev) => ({
        ...prev,
        title:
          !prev.title || prev.title === 'My Resume' || prev.title.endsWith('— Resume')
            ? fromProfile.title
            : prev.title,
        personalDetails: {
          fullName: fromProfile.personalDetails.fullName,
          email: fromProfile.personalDetails.email,
          phone: fromProfile.personalDetails.phone,
          location: fromProfile.personalDetails.location,
          linkedin: fromProfile.personalDetails.linkedin,
          portfolio: fromProfile.personalDetails.portfolio,
        },
        summary: fromProfile.summary,
        education: fromProfile.education.length > 0 ? fromProfile.education : prev.education,
        skills: [...fromProfile.skills],
        certifications: [...fromProfile.certifications],
      }));
      setSaveMsg('Synced latest profile data from Firestore (users/{uid}) into form fields and live preview.');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to sync from your Firestore profile.'
      );
    } finally {
      setSyncingProfile(false);
    }
  };

  const handleStartNewFromProfile = async () => {
    setErrorMsg('');
    setSaveMsg('');
    setAiNote('');
    setResumeId(undefined);
    setSearchParams({ new: '1' }, { replace: true });
    if (!user) {
      setResume(createBlankResume());
      return;
    }
    const latestProfile =
      (await fetchUserProfile(user.uid, true).catch(() => null)) || activeUserProfile;
    if (latestProfile) setFirestoreProfile(latestProfile);
    setResume(buildResumeFromProfile(latestProfile, user));
  };

  const handleSelectSavedResume = (selectedId: string) => {
    if (!selectedId) {
      void handleStartNewFromProfile();
      return;
    }
    const match = savedResumes.find((r) => r.id === selectedId);
    if (match) {
      setErrorMsg('');
      setSaveMsg('');
      hydrateFromRecord(match, activeUserProfile);
      setSearchParams({ resumeId: match.id }, { replace: true });
    }
  };

  const handleSave = async (asDuplicate = false) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!user.emailVerified) {
      setErrorMsg('Please verify your email in Account Security before saving resumes.');
      return;
    }

    const fullName = resume.personalDetails.fullName.trim();
    const title = resume.title.trim();
    if (!title) {
      setErrorMsg('Please enter a resume title before saving.');
      return;
    }
    if (!fullName) {
      setErrorMsg('Please enter your Full Name before saving.');
      return;
    }

    const combinedText = [
      fullName,
      resume.personalDetails.email,
      resume.personalDetails.phone,
      resume.summary,
      ...resume.experience.map((e) => e.highlights),
      ...resume.internships.map((e) => e.highlights),
      ...resume.projects.map((p) => p.description),
    ].join(' ');

    if (containsSensitiveIds(combinedText)) {
      setErrorMsg(
        'For DPDP privacy protection, please remove Aadhaar or PAN-like numbers before saving your resume.'
      );
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSaveMsg('');
    try {
      const targetTitle = asDuplicate ? `${title} (Copy)` : title;
      const savedDocId = await saveResumeRecord(user.uid, {
        ...resume,
        education: sanitizeEducationEntries(resume.education),
        experience: sanitizeExperienceEntries(resume.experience),
        internships: sanitizeExperienceEntries(resume.internships),
        projects: sanitizeProjectEntries(resume.projects),
        skills: sanitizeStringEntries(resume.skills),
        certifications: sanitizeStringEntries(resume.certifications),
        languages: sanitizeStringEntries(resume.languages),
        achievements: sanitizeStringEntries(resume.achievements),
        title: targetTitle,
        id: asDuplicate ? undefined : resumeId,
      });

      if (syncToProfile) {
        await updateUserProfileRecord(user.uid, {
          name: fullName,
          phone: resume.personalDetails.phone,
          location: resume.personalDetails.location,
          linkedin: resume.personalDetails.linkedin,
          portfolio: resume.personalDetails.portfolio,
          summary: resume.summary,
          skills: resume.skills,
          certifications: resume.certifications,
        });
        const updatedProfile = await fetchUserProfile(user.uid).catch(() => null);
        if (updatedProfile) setFirestoreProfile(updatedProfile);
        await refreshProfile();
      }

      const refreshedList = await fetchUserResumes(user.uid);
      setSavedResumes(refreshedList);
      setResumeId(savedDocId);
      setSearchParams({ resumeId: savedDocId }, { replace: true });
      setSaveMsg(
        asDuplicate
          ? 'Duplicated resume saved to your account.'
          : syncToProfile
            ? 'Resume saved and synced with your FormSaathi profile.'
            : 'Resume saved to your account.'
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not save resume.');
    } finally {
      setSaving(false);
    }
  };

  const handleAiAssist = async (
    action: 'improve_summary' | 'improve_experience' | 'suggest_skills' | 'grammar_check',
    content: string,
    onApply: (text: string, suggestions: string[]) => void
  ) => {
    if (containsSensitiveIds(content)) {
      setErrorMsg('Please remove Aadhaar or PAN numbers before using AI refinement.');
      return;
    }
    setAiBusy(true);
    setErrorMsg('');
    setAiNote('');
    try {
      const token = await getIdToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const resp = await fetch('/api/ai/resume-assist', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action,
          content,
          targetRole: resume.title,
          language,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'AI assistance unavailable.');
      onApply(data.improvedText, data.suggestions || []);
      setAiNote(data.notes || 'Refined using your existing facts.');
      if (user && user.emailVerified) {
        await logAIUsage(user.uid, 'resume_assist', language);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'AI assist failed.');
    } finally {
      setAiBusy(false);
    }
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 42;
    const maxWidth = 510;
    let y = 48;

    const isTech = resume.template === 'technical';
    const isFresh = resume.template === 'fresh_graduate';
    const fontFamily = isTech ? 'courier' : 'helvetica';
    const accentRgb: [number, number, number] = isFresh ? [20, 184, 166] : [20, 36, 58];

    // Top template accent bar for modern / fresh_graduate
    if (resume.template === 'modern' || resume.template === 'fresh_graduate') {
      doc.setFillColor(...accentRgb);
      doc.rect(0, 0, 595.28, 6, 'F');
    }

    const addHeading = (text: string) => {
      if (y > 760) {
        doc.addPage();
        y = 48;
      }
      doc.setFont(fontFamily, 'bold');
      doc.setFontSize(isTech ? 10.5 : 11);
      doc.setTextColor(...accentRgb);
      doc.text(text.toUpperCase(), margin, y);
      y += 6;
      doc.setDrawColor(...accentRgb);
      doc.line(margin, y, margin + maxWidth, y);
      y += 14;
    };

    const addBody = (text: string, bold = false, muted = false) => {
      if (!text.trim()) return;
      doc.setFont(fontFamily, bold ? 'bold' : 'normal');
      doc.setFontSize(isTech ? 9.5 : 10);
      if (muted) {
        doc.setTextColor(100, 116, 139);
      } else {
        doc.setTextColor(23, 32, 51);
      }
      const lines = doc.splitTextToSize(text, maxWidth);
      for (const line of lines) {
        if (y > 780) {
          doc.addPage();
          y = 48;
        }
        doc.text(line, margin, y);
        y += 14;
      }
    };

    // Header
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...accentRgb);
    const displayName = resume.personalDetails.fullName.trim() || 'Candidate Name';
    doc.text(displayName, margin, y);
    y += 18;

    const contactLine = [
      resume.personalDetails.email,
      resume.personalDetails.phone,
      resume.personalDetails.location,
      resume.personalDetails.linkedin,
      resume.personalDetails.portfolio,
    ]
      .map((s) => (s || '').trim())
      .filter(Boolean)
      .join('  |  ');

    if (contactLine) {
      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      const contactLines = doc.splitTextToSize(contactLine, maxWidth);
      for (const line of contactLines) {
        doc.text(line, margin, y);
        y += 13;
      }
      y += 8;
    } else {
      y += 10;
    }

    for (const sec of resume.sectionOrder) {
      if (sec === 'summary' && resume.summary.trim()) {
        addHeading('Professional Summary');
        addBody(resume.summary.trim());
        y += 8;
      }
      if (sec === 'education' && previewEducation.length) {
        addHeading('Education');
        previewEducation.forEach((ed) => {
          const titlePart = [ed.degree, ed.institution].filter(Boolean).join(' — ');
          const metaPart = [ed.year, ed.score].filter(Boolean).join(' · ');
          const line = [titlePart, metaPart].filter(Boolean).join(' · ');
          if (line) addBody(line, true);
        });
        y += 8;
      }
      if (sec === 'experience' && previewExperience.length) {
        addHeading('Work Experience');
        previewExperience.forEach((ex) => {
          const header = [ex.role, ex.organization].filter(Boolean).join(' — ');
          const line = [header, ex.duration ? `(${ex.duration})` : ''].filter(Boolean).join(' ');
          if (line) addBody(line, true);
          if (ex.highlights) addBody(ex.highlights, false, true);
        });
        y += 8;
      }
      if (sec === 'internships' && previewInternships.length) {
        addHeading('Internships');
        previewInternships.forEach((ex) => {
          const header = [ex.role, ex.organization].filter(Boolean).join(' — ');
          const line = [header, ex.duration ? `(${ex.duration})` : ''].filter(Boolean).join(' ');
          if (line) addBody(line, true);
          if (ex.highlights) addBody(ex.highlights, false, true);
        });
        y += 8;
      }
      if (sec === 'projects' && previewProjects.length) {
        addHeading('Projects');
        previewProjects.forEach((p) => {
          const line = p.techStack ? `${p.name} (${p.techStack})` : p.name;
          if (line) addBody(line, true);
          if (p.description) addBody(p.description, false, true);
        });
        y += 8;
      }
      if (sec === 'skills' && previewSkills.length) {
        addHeading('Technical Skills');
        addBody(previewSkills.join(', '));
        y += 8;
      }
      if (sec === 'certifications' && previewCertifications.length) {
        addHeading('Certifications');
        previewCertifications.forEach((c) => addBody(`• ${c}`));
        y += 8;
      }
      if (sec === 'languages' && previewLanguages.length) {
        addHeading('Languages');
        addBody(previewLanguages.join(', '));
        y += 8;
      }
      if (sec === 'achievements' && previewAchievements.length) {
        addHeading('Achievements');
        previewAchievements.forEach((a) => addBody(`• ${a}`));
        y += 8;
      }
    }

    const safeFile = (resume.personalDetails.fullName.trim() || 'FormSaathi_Resume').replace(
      /[^a-zA-Z0-9_-]/g,
      '_'
    );
    doc.save(`${safeFile}.pdf`);
  };

  const moveSection = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= resume.sectionOrder.length) return;
    const copy = [...resume.sectionOrder];
    const [removed] = copy.splice(index, 1);
    copy.splice(target, 0, removed);
    setResume({ ...resume, sectionOrder: copy });
  };

  const removeSection = (sec: string) => {
    if (resume.sectionOrder.length <= 1) return;
    setResume({
      ...resume,
      sectionOrder: resume.sectionOrder.filter((s) => s !== sec),
    });
  };

  const addSection = (sec: string) => {
    if (resume.sectionOrder.includes(sec)) return;
    setResume({
      ...resume,
      sectionOrder: [...resume.sectionOrder, sec],
    });
  };

  const removedSections = ALL_SECTIONS.filter((sec) => !resume.sectionOrder.includes(sec));
  const isSectionActive = (sec: ResumeSectionKey) => resume.sectionOrder.includes(sec);

  const templateStyles: Record<ResumeTemplateId, string> = {
    modern: 'border-t-4 border-t-[#14243A] font-sans',
    minimal_ats: 'border-t border-t-slate-300 font-sans',
    fresh_graduate: 'border-t-4 border-t-[#14B8A6] font-sans',
    technical: 'border-t-4 border-t-[#1D3557] font-mono text-[13px]',
  };

  const previewEducation = useMemo(
    () => sanitizeEducationEntries(resume.education),
    [resume.education]
  );
  const previewExperience = useMemo(
    () => sanitizeExperienceEntries(resume.experience),
    [resume.experience]
  );
  const previewInternships = useMemo(
    () => sanitizeExperienceEntries(resume.internships),
    [resume.internships]
  );
  const previewProjects = useMemo(
    () => sanitizeProjectEntries(resume.projects),
    [resume.projects]
  );
  const previewSkills = useMemo(
    () => sanitizeStringEntries(resume.skills),
    [resume.skills]
  );
  const previewCertifications = useMemo(
    () => sanitizeStringEntries(resume.certifications),
    [resume.certifications]
  );
  const previewLanguages = useMemo(
    () => sanitizeStringEntries(resume.languages),
    [resume.languages]
  );
  const previewAchievements = useMemo(
    () => sanitizeStringEntries(resume.achievements),
    [resume.achievements]
  );

  const previewContactItems = useMemo(
    () =>
      [
        resume.personalDetails.email,
        resume.personalDetails.phone,
        resume.personalDetails.location,
        resume.personalDetails.linkedin,
        resume.personalDetails.portfolio,
      ]
        .map((s) => (s || '').trim())
        .filter(Boolean),
    [resume.personalDetails]
  );

  const hasPopulatedHeader = Boolean(
    resume.personalDetails.fullName.trim() || previewContactItems.length > 0
  );

  const hasPopulatedSections = Boolean(
    (isSectionActive('summary') && resume.summary.trim()) ||
      (isSectionActive('education') && previewEducation.length > 0) ||
      (isSectionActive('experience') && previewExperience.length > 0) ||
      (isSectionActive('internships') && previewInternships.length > 0) ||
      (isSectionActive('projects') && previewProjects.length > 0) ||
      (isSectionActive('skills') && previewSkills.length > 0) ||
      (isSectionActive('certifications') && previewCertifications.length > 0) ||
      (isSectionActive('languages') && previewLanguages.length > 0) ||
      (isSectionActive('achievements') && previewAchievements.length > 0)
  );

  const hasAnyPreviewContent = hasPopulatedHeader || hasPopulatedSections;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Toolbar */}
      <div className="no-print flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-4">
        <div>
          <h1 className="text-2xl font-bold text-[#14243A] dark:text-white">Resume Studio</h1>
          <p className="text-xs text-[#64748B] dark:text-slate-400">
            Synced with your profile · 4 ATS templates · Add/remove &amp; reorder sections · Selectable-text PDF
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {user && (
            <select
              value={resumeId || ''}
              onChange={(e) => handleSelectSavedResume(e.target.value)}
              aria-label="Saved Resumes"
              disabled={loadingResumes}
              className="px-3 py-2 text-xs font-medium bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg max-w-[210px]"
            >
              <option value="">
                {savedResumes.length > 0 ? '+ New Resume from Profile' : 'New Resume (From Profile)'}
              </option>
              {savedResumes.map((sr) => (
                <option key={sr.id} value={sr.id}>
                  {sr.title}
                </option>
              ))}
            </select>
          )}

          {user && (
            <button
              type="button"
              onClick={handleStartNewFromProfile}
              title="Start new resume auto-filled from your profile"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-[#E2E8F0] dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <FilePlus2 className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>New</span>
            </button>
          )}

          {user && (
            <button
              type="button"
              disabled={syncingProfile}
              onClick={handleSyncFromProfile}
              title="Re-fetch users/{uid} from Firestore and overwrite current draft fields"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-[#14B8A6] text-[#0D9488] dark:text-teal-300 rounded-lg hover:bg-[#CCFBF1]/30 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingProfile ? 'animate-spin' : ''}`} />
              <span>{syncingProfile ? 'Syncing...' : 'Sync from Profile'}</span>
            </button>
          )}

          <select
            value={resume.template}
            onChange={(e) => setResume({ ...resume, template: e.target.value as ResumeTemplateId })}
            aria-label="Resume Template"
            className="px-3 py-2 text-xs font-medium bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          >
            <option value="modern">Template: Modern Professional</option>
            <option value="minimal_ats">Template: Minimal ATS</option>
            <option value="fresh_graduate">Template: Fresh Graduate</option>
            <option value="technical">Template: Technical Resume</option>
          </select>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave(false)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saving ? 'Saving...' : 'Save Resume'}</span>
          </button>

          {resumeId && (
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-[#14B8A6] text-[#0D9488] dark:text-teal-300 rounded-lg"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Auth / Profile Completeness Prompts */}
      {authReady && !user && (
        <div className="no-print mb-6 p-4 rounded-xl bg-[#CCFBF1]/40 dark:bg-teal-950/30 border border-[#14B8A6]/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#14243A] dark:text-slate-100">
            <UserCheck className="w-4 h-4 text-[#0D9488] shrink-0" />
            <span>
              Sign in to auto-fill Resume Studio from your saved FormSaathi profile and save resumes privately to your account.
            </span>
          </div>
          <Link
            to="/login"
            className="px-3.5 py-1.5 font-semibold bg-[#14243A] text-white dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
          >
            Sign In
          </Link>
        </div>
      )}

      {hasIncompleteProfile && !profileAlertDismissed && (
        <div
          role="alert"
          className="no-print mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm text-[#14243A] dark:text-amber-100">
                Complete Your Profile
              </p>
              <p className="leading-relaxed">
                {!firestoreProfile
                  ? 'Your Firestore profile does not have saved details yet. Empty resume sections are hidden until mandatory fields are provided.'
                  : `Your Firestore profile is missing mandatory fields (${missingProfileFields.join(', ')}). Empty resume sections are hidden so your preview stays clean.`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link
              to="/dashboard/profile"
              className="px-3.5 py-2 font-semibold bg-[#14243A] hover:bg-[#1D3557] text-white dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
            >
              Go to Settings
            </Link>
            <button
              type="button"
              disabled={syncingProfile}
              onClick={handleSyncFromProfile}
              className="inline-flex items-center gap-1.5 px-3 py-2 font-semibold border border-amber-300 dark:border-amber-700 text-[#14243A] dark:text-amber-100 rounded-lg hover:bg-amber-100/60 dark:hover:bg-amber-900/30 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingProfile ? 'animate-spin' : ''}`} />
              <span>{syncingProfile ? 'Syncing...' : 'Sync from Profile'}</span>
            </button>
            <button
              type="button"
              onClick={() => setProfileAlertDismissed(true)}
              aria-label="Dismiss profile alert"
              className="p-1.5 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {saveMsg && (
        <p className="no-print text-xs font-medium text-[#16A34A] mb-4 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveMsg}</span>
        </p>
      )}
      {aiNote && <p className="no-print text-xs font-medium text-[#0D9488] mb-4">{aiNote}</p>}
      {errorMsg && (
        <p className="no-print text-xs font-medium text-[#DC2626] mb-4 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </p>
      )}

      {authReady && user && loadingResumes ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-6 space-y-4">
            <div className="h-44 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl animate-pulse" />
            <div className="h-36 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl animate-pulse" />
          </div>
          <div className="lg:col-span-6">
            <div className="h-96 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl animate-pulse" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Editor Column */}
          <div className="no-print lg:col-span-6 space-y-6">
          {/* Title & Personal Details */}
          <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[#172033] dark:text-white">
                Resume Title &amp; Personal Information
              </h2>
              {user && (
                <button
                  type="button"
                  disabled={syncingProfile}
                  onClick={handleSyncFromProfile}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0D9488] hover:underline disabled:opacity-60"
                >
                  <RefreshCw className={`w-3 h-3 ${syncingProfile ? 'animate-spin' : ''}`} />
                  <span>{syncingProfile ? 'Syncing...' : 'Sync from Profile'}</span>
                </button>
              )}
            </div>
            <input
              type="text"
              value={resume.title}
              onChange={(e) => setResume({ ...resume, title: e.target.value })}
              placeholder="Resume Name (e.g. Software Developer 2026)"
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={resume.personalDetails.fullName}
                onChange={(e) =>
                  setResume({
                    ...resume,
                    personalDetails: { ...resume.personalDetails, fullName: e.target.value },
                  })
                }
                placeholder="Full Name (required)"
                className="px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              />
              <input
                type="email"
                value={resume.personalDetails.email}
                onChange={(e) =>
                  setResume({
                    ...resume,
                    personalDetails: { ...resume.personalDetails, email: e.target.value },
                  })
                }
                placeholder="Email Address"
                className="px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              />
              <input
                type="text"
                value={resume.personalDetails.phone}
                onChange={(e) =>
                  setResume({
                    ...resume,
                    personalDetails: { ...resume.personalDetails, phone: e.target.value },
                  })
                }
                placeholder="Phone Number (e.g. +91 98XXXXXXXX)"
                className="px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              />
              <input
                type="text"
                value={resume.personalDetails.location}
                onChange={(e) =>
                  setResume({
                    ...resume,
                    personalDetails: { ...resume.personalDetails, location: e.target.value },
                  })
                }
                placeholder="Current Location (City, State)"
                className="px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              />
              <input
                type="text"
                value={resume.personalDetails.linkedin || ''}
                onChange={(e) =>
                  setResume({
                    ...resume,
                    personalDetails: { ...resume.personalDetails, linkedin: e.target.value },
                  })
                }
                placeholder="LinkedIn Profile URL"
                className="px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              />
              <input
                type="text"
                value={resume.personalDetails.portfolio || ''}
                onChange={(e) =>
                  setResume({
                    ...resume,
                    personalDetails: { ...resume.personalDetails, portfolio: e.target.value },
                  })
                }
                placeholder="Portfolio / GitHub URL"
                className="px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              />
            </div>

            {user && (
              <label className="inline-flex items-center gap-2 text-xs text-[#64748B] dark:text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={syncToProfile}
                  onChange={(e) => setSyncToProfile(e.target.checked)}
                  className="rounded border-slate-300 text-[#14B8A6]"
                />
                <span>Also sync personal details, summary &amp; skills to my saved Profile</span>
              </label>
            )}
          </div>

          {/* Summary with AI Assist */}
          {isSectionActive('summary') && (
            <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-[#172033] dark:text-white">
                  Professional Summary
                </h2>
                <button
                  type="button"
                  disabled={aiBusy || resume.summary.length < 5}
                  onClick={() =>
                    handleAiAssist('improve_summary', resume.summary, (improved) =>
                      setResume((r) => ({ ...r, summary: improved }))
                    )
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#0D9488] border border-[#14B8A6] rounded-md disabled:opacity-50"
                >
                  {aiBusy ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  <span>Polish with AI</span>
                </button>
              </div>
              <textarea
                rows={3}
                value={resume.summary}
                onChange={(e) => setResume({ ...resume, summary: e.target.value })}
                placeholder="Summarize your degree, core skills, and the type of role you are targeting..."
                className="w-full p-3 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              />
            </div>
          )}

          {/* Education */}
          {isSectionActive('education') && (
            <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold">Education</h2>
                <button
                  type="button"
                  onClick={() =>
                    setResume({
                      ...resume,
                      education: [
                        ...resume.education,
                        { institution: '', degree: '', year: '', score: '' },
                      ],
                    })
                  }
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0D9488]"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Education
                </button>
              </div>
              {resume.education.length === 0 && (
                <p className="text-xs text-[#64748B] dark:text-slate-400">
                  No education entries added yet. Click &ldquo;Add Education&rdquo; to enter your degree and institution.
                </p>
              )}
              {resume.education.map((ed, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#0B1320]"
                >
                  <input
                    value={ed.degree}
                    onChange={(e) => {
                      const copy = [...resume.education];
                      copy[idx] = { ...copy[idx], degree: e.target.value };
                      setResume({ ...resume, education: copy });
                    }}
                    placeholder="Degree / Course (e.g. BCA)"
                    className="px-2.5 py-1.5 text-xs bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-700 rounded"
                  />
                  <input
                    value={ed.institution}
                    onChange={(e) => {
                      const copy = [...resume.education];
                      copy[idx] = { ...copy[idx], institution: e.target.value };
                      setResume({ ...resume, education: copy });
                    }}
                    placeholder="College / University Name"
                    className="px-2.5 py-1.5 text-xs bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-700 rounded"
                  />
                  <input
                    value={ed.year}
                    onChange={(e) => {
                      const copy = [...resume.education];
                      copy[idx] = { ...copy[idx], year: e.target.value };
                      setResume({ ...resume, education: copy });
                    }}
                    placeholder="Passing Year"
                    className="px-2.5 py-1.5 text-xs bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-700 rounded"
                  />
                  <div className="flex gap-1">
                    <input
                      value={ed.score}
                      onChange={(e) => {
                        const copy = [...resume.education];
                        copy[idx] = { ...copy[idx], score: e.target.value };
                        setResume({ ...resume, education: copy });
                      }}
                      placeholder="Score / CGPA"
                      className="flex-1 px-2.5 py-1.5 text-xs bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-700 rounded"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setResume({
                          ...resume,
                          education: resume.education.filter((_, i) => i !== idx),
                        })
                      }
                      className="p-1.5 text-[#DC2626]"
                      aria-label="Remove education"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Experience & Internships */}
          {(['experience', 'internships'] as const).map(
            (field) =>
              isSectionActive(field) && (
                <div
                  key={field}
                  className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold capitalize">
                      {field === 'experience' ? 'Work Experience' : 'Internships'}
                    </h2>
                    <button
                      type="button"
                      onClick={() =>
                        setResume({
                          ...resume,
                          [field]: [
                            ...resume[field],
                            { role: '', organization: '', duration: '', highlights: '' },
                          ],
                        })
                      }
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#0D9488]"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                  {resume[field].length === 0 && (
                    <p className="text-xs text-[#64748B] dark:text-slate-400">
                      No {field} entries added yet. Click &ldquo;Add&rdquo; if applicable.
                    </p>
                  )}
                  {resume[field].map((item, idx) => (
                    <div
                      key={idx}
                      className="space-y-2 p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#0B1320]"
                    >
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          value={item.role}
                          onChange={(e) => {
                            const copy = [...resume[field]];
                            copy[idx] = { ...copy[idx], role: e.target.value };
                            setResume({ ...resume, [field]: copy });
                          }}
                          placeholder="Role / Position"
                          className="px-2.5 py-1.5 text-xs bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-700 rounded"
                        />
                        <input
                          value={item.organization}
                          onChange={(e) => {
                            const copy = [...resume[field]];
                            copy[idx] = { ...copy[idx], organization: e.target.value };
                            setResume({ ...resume, [field]: copy });
                          }}
                          placeholder="Company / Organization"
                          className="px-2.5 py-1.5 text-xs bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-700 rounded"
                        />
                        <div className="flex gap-1">
                          <input
                            value={item.duration}
                            onChange={(e) => {
                              const copy = [...resume[field]];
                              copy[idx] = { ...copy[idx], duration: e.target.value };
                              setResume({ ...resume, [field]: copy });
                            }}
                            placeholder="Duration"
                            className="flex-1 px-2.5 py-1.5 text-xs bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-700 rounded"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setResume({
                                ...resume,
                                [field]: resume[field].filter((_, i) => i !== idx),
                              })
                            }
                            className="p-1 text-[#DC2626]"
                            aria-label={`Remove ${field} entry`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <textarea
                        rows={2}
                        value={item.highlights}
                        onChange={(e) => {
                          const copy = [...resume[field]];
                          copy[idx] = { ...copy[idx], highlights: e.target.value };
                          setResume({ ...resume, [field]: copy });
                        }}
                        placeholder="Describe your actual responsibilities and measurable outcomes..."
                        className="w-full p-2 text-xs bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-700 rounded"
                      />
                      <button
                        type="button"
                        disabled={aiBusy || item.highlights.length < 5}
                        onClick={() =>
                          handleAiAssist('improve_experience', item.highlights, (improved) => {
                            const copy = [...resume[field]];
                            copy[idx] = { ...copy[idx], highlights: improved };
                            setResume((r) => ({ ...r, [field]: copy }));
                          })
                        }
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0D9488] hover:underline disabled:opacity-50"
                      >
                        <Sparkles className="w-3 h-3" /> Improve bullet with AI
                      </button>
                    </div>
                  ))}
                </div>
              )
          )}

          {/* Projects */}
          {isSectionActive('projects') && (
            <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold">Projects</h2>
                <button
                  type="button"
                  onClick={() =>
                    setResume({
                      ...resume,
                      projects: [...resume.projects, { name: '', techStack: '', description: '' }],
                    })
                  }
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0D9488]"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Project
                </button>
              </div>
              {resume.projects.length === 0 && (
                <p className="text-xs text-[#64748B] dark:text-slate-400">
                  No projects added yet. Click &ldquo;Add Project&rdquo; to showcase your own projects.
                </p>
              )}
              {resume.projects.map((p, idx) => (
                <div
                  key={idx}
                  className="space-y-2 p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#0B1320]"
                >
                  <div className="flex gap-2">
                    <input
                      value={p.name}
                      onChange={(e) => {
                        const copy = [...resume.projects];
                        copy[idx] = { ...copy[idx], name: e.target.value };
                        setResume({ ...resume, projects: copy });
                      }}
                      placeholder="Project Title"
                      className="flex-1 px-2.5 py-1.5 text-xs bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-700 rounded"
                    />
                    <input
                      value={p.techStack}
                      onChange={(e) => {
                        const copy = [...resume.projects];
                        copy[idx] = { ...copy[idx], techStack: e.target.value };
                        setResume({ ...resume, projects: copy });
                      }}
                      placeholder="Tech Stack / Tools"
                      className="flex-1 px-2.5 py-1.5 text-xs bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-700 rounded"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setResume({
                          ...resume,
                          projects: resume.projects.filter((_, i) => i !== idx),
                        })
                      }
                      className="p-1 text-[#DC2626]"
                      aria-label="Remove project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={p.description}
                    onChange={(e) => {
                      const copy = [...resume.projects];
                      copy[idx] = { ...copy[idx], description: e.target.value };
                      setResume({ ...resume, projects: copy });
                    }}
                    placeholder="What you built and achieved..."
                    className="w-full p-2 text-xs bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-700 rounded"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Skills, Certifications, Languages, Achievements */}
          {(isSectionActive('skills') ||
            isSectionActive('certifications') ||
            isSectionActive('languages') ||
            isSectionActive('achievements')) && (
            <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold">Skills, Certifications &amp; Languages</h2>
                {isSectionActive('skills') && (
                  <button
                    type="button"
                    disabled={aiBusy}
                    onClick={() =>
                      handleAiAssist(
                        'suggest_skills',
                        `Current skills: ${resume.skills.join(', ')}. Summary: ${resume.summary}`,
                        (_text, suggestions) => {
                          if (suggestions.length) {
                            const merged = Array.from(new Set([...resume.skills, ...suggestions]));
                            setResume((r) => ({ ...r, skills: merged }));
                          }
                        }
                      )
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#0D9488] hover:underline"
                  >
                    <Sparkles className="w-3 h-3" /> Suggest Skills
                  </button>
                )}
              </div>

              {(
                [
                  ['skills', 'Technical Skills', skillInput, setSkillInput],
                  ['certifications', 'Certifications', certInput, setCertInput],
                  ['languages', 'Languages', langInput, setLangInput],
                  ['achievements', 'Achievements', achInput, setAchInput],
                ] as const
              )
                .filter(([key]) => isSectionActive(key))
                .map(([key, label, val, setter]) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#64748B] dark:text-slate-400">
                      {label}
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={val}
                        onChange={(e) => setter(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (!val.trim()) return;
                            setResume({ ...resume, [key]: [...resume[key], val.trim()] });
                            setter('');
                          }
                        }}
                        placeholder={`Add ${label.toLowerCase()}...`}
                        className="flex-1 px-2.5 py-1.5 text-xs bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!val.trim()) return;
                          setResume({ ...resume, [key]: [...resume[key], val.trim()] });
                          setter('');
                        }}
                        className="px-3 py-1.5 text-xs font-semibold bg-[#14243A] text-white rounded"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {resume[key].map((item, idx) => (
                        <span
                          key={`${item}_${idx}`}
                          className="inline-flex items-center gap-1 text-[#172033] dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded"
                        >
                          {item}
                          <button
                            type="button"
                            onClick={() =>
                              setResume({
                                ...resume,
                                [key]: resume[key].filter((_, i) => i !== idx),
                              })
                            }
                            className="text-[#DC2626] ml-1"
                            aria-label={`Remove ${item}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Add / Remove & Reorder Resume Sections */}
          <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-bold">Manage &amp; Reorder Resume Sections</h2>
            <div className="space-y-1.5">
              {resume.sectionOrder.map((sec, idx) => (
                <div
                  key={sec}
                  className="flex items-center justify-between px-3 py-1.5 bg-[#F8FAFC] dark:bg-[#0B1320] rounded text-xs"
                >
                  <span className="font-medium">
                    {SECTION_LABELS[sec as ResumeSectionKey] || sec}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveSection(idx, -1)}
                      disabled={idx === 0}
                      aria-label={`Move ${sec} up`}
                      className="p-1 disabled:opacity-30"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(idx, 1)}
                      disabled={idx === resume.sectionOrder.length - 1}
                      aria-label={`Move ${sec} down`}
                      className="p-1 disabled:opacity-30"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSection(sec)}
                      disabled={resume.sectionOrder.length <= 1}
                      aria-label={`Remove ${sec} section`}
                      className="p-1 text-[#DC2626] disabled:opacity-30"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {removedSections.length > 0 && (
              <div className="pt-2 border-t border-[#E2E8F0] dark:border-slate-800 space-y-1.5">
                <p className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400">
                  Add Removed Section
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {removedSections.map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => addSection(sec)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded hover:border-[#14B8A6]"
                    >
                      <Plus className="w-3 h-3 text-[#0D9488]" />
                      <span>{SECTION_LABELS[sec]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Preview Column */}
        <div className="lg:col-span-6">
          <div
            className={`bg-white text-[#172033] border border-[#E2E8F0] rounded-xl p-8 shadow-sm ${templateStyles[resume.template]}`}
          >
            {!hasAnyPreviewContent ? (
              <div className="py-12 text-center text-xs text-[#64748B] space-y-3">
                <p className="text-sm font-semibold text-[#14243A]">
                  Your live resume preview is waiting for details
                </p>
                <p className="max-w-md mx-auto leading-relaxed">
                  {hasIncompleteProfile
                    ? 'Empty resume sections are hidden while mandatory profile fields are missing. Complete your profile in Settings or enter your details on the left.'
                    : 'Enter your personal and career details on the left to build your live resume preview.'}
                </p>
                {hasIncompleteProfile && (
                  <div className="pt-1">
                    <Link
                      to="/dashboard/profile"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#14243A] hover:bg-[#1D3557] rounded-lg"
                    >
                      Go to Settings
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <>
                {hasPopulatedHeader && (
                  <header className="pb-4 border-b border-slate-200 mb-5">
                    {resume.personalDetails.fullName.trim() && (
                      <h2
                        className={`text-2xl font-bold ${
                          resume.template === 'fresh_graduate'
                            ? 'text-[#0D9488]'
                            : 'text-[#14243A]'
                        }`}
                      >
                        {resume.personalDetails.fullName.trim()}
                      </h2>
                    )}
                    {previewContactItems.length > 0 && (
                      <p className="text-xs text-[#64748B] mt-1.5 break-words">
                        {previewContactItems.join(' · ')}
                      </p>
                    )}
                  </header>
                )}

                {hasPopulatedSections ? (
                  <div className="space-y-5 text-sm">
                    {resume.sectionOrder.map((sec) => {
                      const headingClass =
                        resume.template === 'fresh_graduate'
                          ? 'text-xs font-bold uppercase tracking-wider text-[#0D9488] border-b border-[#CCFBF1] pb-1 mb-2'
                          : 'text-xs font-bold uppercase tracking-wider text-[#14243A] border-b border-slate-200 pb-1 mb-2';

                      if (sec === 'summary' && resume.summary.trim()) {
                        return (
                          <section key={sec}>
                            <h3 className={headingClass}>Professional Summary</h3>
                            <p className="text-xs leading-relaxed text-[#172033]">
                              {resume.summary.trim()}
                            </p>
                          </section>
                        );
                      }
                      if (sec === 'education' && previewEducation.length > 0) {
                        return (
                          <section key={sec}>
                            <h3 className={headingClass}>Education</h3>
                            <div className="space-y-1.5">
                              {previewEducation.map((ed, i) => (
                                <div key={i} className="flex justify-between gap-2 text-xs">
                                  <span>
                                    {ed.degree.trim() && <strong>{ed.degree.trim()}</strong>}
                                    {ed.institution.trim()
                                      ? ed.degree.trim()
                                        ? ` — ${ed.institution.trim()}`
                                        : ed.institution.trim()
                                      : ''}
                                  </span>
                                  {(ed.year.trim() || ed.score.trim()) && (
                                    <span className="text-[#64748B] tabular-nums shrink-0">
                                      {[ed.year.trim(), ed.score.trim()].filter(Boolean).join(' · ')}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </section>
                        );
                      }
                      if (sec === 'experience' && previewExperience.length > 0) {
                        return (
                          <section key={sec}>
                            <h3 className={headingClass}>Work Experience</h3>
                            <div className="space-y-2.5">
                              {previewExperience.map((ex, i) => (
                                <div key={i} className="text-xs">
                                  {(ex.role.trim() || ex.organization.trim() || ex.duration.trim()) && (
                                    <div className="flex justify-between font-semibold gap-2">
                                      <span>
                                        {[ex.role.trim(), ex.organization.trim()]
                                          .filter(Boolean)
                                          .join(' — ')}
                                      </span>
                                      {ex.duration.trim() && (
                                        <span className="text-[#64748B] shrink-0">
                                          {ex.duration.trim()}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {ex.highlights.trim() && (
                                    <p className="text-[#64748B] mt-0.5">{ex.highlights.trim()}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </section>
                        );
                      }
                      if (sec === 'internships' && previewInternships.length > 0) {
                        return (
                          <section key={sec}>
                            <h3 className={headingClass}>Internships</h3>
                            <div className="space-y-2.5">
                              {previewInternships.map((ex, i) => (
                                <div key={i} className="text-xs">
                                  {(ex.role.trim() || ex.organization.trim() || ex.duration.trim()) && (
                                    <div className="flex justify-between font-semibold gap-2">
                                      <span>
                                        {[ex.role.trim(), ex.organization.trim()]
                                          .filter(Boolean)
                                          .join(' — ')}
                                      </span>
                                      {ex.duration.trim() && (
                                        <span className="text-[#64748B] shrink-0">
                                          {ex.duration.trim()}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {ex.highlights.trim() && (
                                    <p className="text-[#64748B] mt-0.5">{ex.highlights.trim()}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </section>
                        );
                      }
                      if (sec === 'projects' && previewProjects.length > 0) {
                        return (
                          <section key={sec}>
                            <h3 className={headingClass}>Projects</h3>
                            <div className="space-y-2">
                              {previewProjects.map((p, i) => (
                                <div key={i} className="text-xs">
                                  {(p.name.trim() || p.techStack.trim()) && (
                                    <p className="font-semibold">
                                      {p.name.trim()}{' '}
                                      {p.techStack.trim() && (
                                        <span className="font-normal text-[#64748B]">
                                          ({p.techStack.trim()})
                                        </span>
                                      )}
                                    </p>
                                  )}
                                  {p.description.trim() && (
                                    <p className="text-[#64748B]">{p.description.trim()}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </section>
                        );
                      }
                      if (sec === 'skills' && previewSkills.length > 0) {
                        return (
                          <section key={sec}>
                            <h3 className={headingClass}>Technical Skills</h3>
                            <p className="text-xs">{previewSkills.join(' · ')}</p>
                          </section>
                        );
                      }
                      if (sec === 'certifications' && previewCertifications.length > 0) {
                        return (
                          <section key={sec}>
                            <h3 className={headingClass}>Certifications</h3>
                            <ul className="list-disc pl-4 text-xs space-y-0.5">
                              {previewCertifications.map((c, i) => (
                                <li key={i}>{c}</li>
                              ))}
                            </ul>
                          </section>
                        );
                      }
                      if (sec === 'languages' && previewLanguages.length > 0) {
                        return (
                          <section key={sec}>
                            <h3 className={headingClass}>Languages</h3>
                            <p className="text-xs">{previewLanguages.join(' · ')}</p>
                          </section>
                        );
                      }
                      if (sec === 'achievements' && previewAchievements.length > 0) {
                        return (
                          <section key={sec}>
                            <h3 className={headingClass}>Achievements</h3>
                            <ul className="list-disc pl-4 text-xs space-y-0.5">
                              {previewAchievements.map((a, i) => (
                                <li key={i}>{a}</li>
                              ))}
                            </ul>
                          </section>
                        );
                      }
                      return null;
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-[#64748B] py-4">
                    Add your summary, education, experience, or skills on the left to display resume sections here. Empty sections remain hidden.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
