import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { DEFAULT_CATEGORIES, OFFICIAL_STARTER_CATALOG } from '../data/officialStarterCatalog';
import {
  OFFICIAL_EXAM_EVENTS,
  STARTER_LEARNING_PATHS,
  STARTER_MOCK_TESTS,
  STARTER_QUESTION_BANK,
} from '../data/platformDatasets';
import { db, formatFirestoreDate, handleFirestoreError, OperationType } from '../lib/firebase';
import type {
  AdminAuditLog,
  AIChatMessage,
  AIChatSession,
  AIFeatureType,
  ApplicationRecord,
  ApplicationStatus,
  CareerRoadmapRecord,
  DocumentChecklist,
  EligibilityCheckRecord,
  ExamEvent,
  JobCategory,
  JobComparisonRecord,
  JobListing,
  JobReport,
  LanguageCode,
  LearningPath,
  LearningProgressRecord,
  MockInterviewSession,
  MockTest,
  MockTestAttempt,
  NotificationItem,
  PlatformSetting,
  QuestionBankItem,
  ResumeAnalysisRecord,
  ResumeRecord,
  SavedExamReminder,
  SupportTicket,
  UserFeedbackRecord,
  UserProfile,
} from '../types';

function makeSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function mapJobDoc(id: string, data: Record<string, any>): JobListing {
  return {
    id,
    title: data.title || '',
    organization: data.organization || '',
    organizationLogo: data.organizationLogo || '',
    category: data.category || 'General',
    sector: data.sector || 'private',
    location: data.location || 'India',
    employmentType: data.employmentType || 'Full-Time',
    workMode: data.workMode || 'onsite',
    experience: data.experience || 'Fresher',
    qualifications: Array.isArray(data.qualifications) ? data.qualifications : [],
    eligibilityRules: data.eligibilityRules || { requiredQualifications: [] },
    description: data.description || '',
    responsibilities: Array.isArray(data.responsibilities) ? data.responsibilities : [],
    salary: data.salary || 'As per official notification',
    importantDates: data.importantDates || {},
    applicationFee: data.applicationFee || 'Refer to official notification',
    requiredDocuments: Array.isArray(data.requiredDocuments) ? data.requiredDocuments : [],
    selectionProcess: Array.isArray(data.selectionProcess) ? data.selectionProcess : [],
    applicationInstructions: data.applicationInstructions || '',
    officialSourceURL: data.officialSourceURL || '',
    applicationURL: data.applicationURL || '',
    sourceName: data.sourceName || '',
    verificationStatus: data.verificationStatus || 'pending',
    verifiedBy: data.verifiedBy || '',
    verifiedAt: formatFirestoreDate(data.verifiedAt),
    expiresAt: data.expiresAt || '',
    createdBy: data.createdBy || '',
    createdAt: formatFirestoreDate(data.createdAt),
    updatedAt: formatFirestoreDate(data.updatedAt),
  };
}

// --- Public Jobs & Categories ---
export async function fetchVerifiedJobs(): Promise<{ jobs: JobListing[]; fromFirestore: boolean }> {
  const path = 'jobs';
  try {
    const q = query(
      collection(db, path),
      where('verificationStatus', '==', 'verified'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      return { jobs: OFFICIAL_STARTER_CATALOG, fromFirestore: false };
    }
    const firestoreJobs = snap.docs.map((d) => mapJobDoc(d.id, d.data()));
    return { jobs: firestoreJobs, fromFirestore: true };
  } catch (error) {
    // If collection index is building or unseeded, gracefully check without ordering before surfacing error
    try {
      const qFallback = query(
        collection(db, path),
        where('verificationStatus', '==', 'verified'),
        limit(100)
      );
      const snap = await getDocs(qFallback);
      if (snap.empty) {
        return { jobs: OFFICIAL_STARTER_CATALOG, fromFirestore: false };
      }
      return { jobs: snap.docs.map((d) => mapJobDoc(d.id, d.data())), fromFirestore: true };
    } catch (innerError) {
      handleFirestoreError(innerError || error, OperationType.LIST, path);
    }
  }
}

export async function fetchJobById(jobId: string): Promise<JobListing | null> {
  const path = `jobs/${jobId}`;
  try {
    const snap = await getDoc(doc(db, 'jobs', jobId));
    if (snap.exists()) {
      return mapJobDoc(snap.id, snap.data());
    }
    const starterMatch = OFFICIAL_STARTER_CATALOG.find((j) => j.id === jobId);
    return starterMatch || null;
  } catch (error) {
    const starterMatch = OFFICIAL_STARTER_CATALOG.find((j) => j.id === jobId);
    if (starterMatch) return starterMatch;
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function fetchCategories(): Promise<JobCategory[]> {
  const path = 'categories';
  try {
    const q = query(collection(db, path), where('isActive', '==', true), limit(50));
    const snap = await getDocs(q);
    if (snap.empty) return DEFAULT_CATEGORIES;
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        slug: data.slug,
        name: data.name,
        nameHi: data.nameHi || '',
        sector: data.sector || 'all',
        description: data.description || '',
        isActive: Boolean(data.isActive),
        createdAt: formatFirestoreDate(data.createdAt),
      };
    });
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export async function fetchPlatformAnnouncement(): Promise<PlatformSetting | null> {
  try {
    const snap = await getDoc(doc(db, 'platformSettings', 'default'));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      announcementBanner: data.announcementBanner || '',
      showAnnouncement: Boolean(data.showAnnouncement),
      aiDailyLimitFree: Number(data.aiDailyLimitFree ?? 15),
      eligibilityLimitFree: Number(data.eligibilityLimitFree ?? 10),
      updatedAt: formatFirestoreDate(data.updatedAt),
    };
  } catch {
    return null;
  }
}

// --- Saved Jobs ---
export async function saveJobForUser(uid: string, job: JobListing): Promise<void> {
  const path = `users/${uid}/savedJobs/${job.id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'savedJobs', job.id), {
      userId: uid,
      jobId: job.id.slice(0, 128),
      jobTitle: job.title.slice(0, 180),
      organization: job.organization.slice(0, 160),
      deadline: (job.importantDates?.lastDate || job.expiresAt || '').slice(0, 40),
      savedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function unsaveJobForUser(uid: string, jobId: string): Promise<void> {
  const path = `users/${uid}/savedJobs/${jobId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'savedJobs', jobId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Applications Tracker ---
export async function fetchUserApplications(uid: string): Promise<ApplicationRecord[]> {
  const path = `users/${uid}/applications`;
  try {
    const q = query(
      collection(db, path),
      where('userId', '==', uid),
      orderBy('updatedAt', 'desc'),
      limit(100)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId,
        jobId: data.jobId || '',
        jobTitle: data.jobTitle,
        organization: data.organization,
        status: data.status as ApplicationStatus,
        appliedAt: data.appliedAt || '',
        deadline: data.deadline || '',
        interviewDate: data.interviewDate || '',
        followUpDate: data.followUpDate || '',
        notes: data.notes || '',
        applicationURL: data.applicationURL || '',
        createdAt: formatFirestoreDate(data.createdAt),
        updatedAt: formatFirestoreDate(data.updatedAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createApplicationRecord(
  uid: string,
  payload: Omit<ApplicationRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = makeSafeId('app');
  const path = `users/${uid}/applications/${id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'applications', id), {
      userId: uid,
      jobId: (payload.jobId || '').slice(0, 128),
      jobTitle: payload.jobTitle.trim().slice(0, 180),
      organization: payload.organization.trim().slice(0, 160),
      status: payload.status,
      appliedAt: (payload.appliedAt || '').slice(0, 40),
      deadline: (payload.deadline || '').slice(0, 40),
      interviewDate: (payload.interviewDate || '').slice(0, 40),
      followUpDate: (payload.followUpDate || '').slice(0, 40),
      notes: (payload.notes || '').slice(0, 2000),
      applicationURL: (payload.applicationURL || '').slice(0, 500),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateApplicationRecord(
  uid: string,
  appId: string,
  updates: Partial<
    Pick<
      ApplicationRecord,
      'status' | 'appliedAt' | 'deadline' | 'interviewDate' | 'followUpDate' | 'notes' | 'applicationURL'
    >
  >
): Promise<void> {
  const path = `users/${uid}/applications/${appId}`;
  try {
    const clean: Record<string, any> = { updatedAt: serverTimestamp() };
    if (updates.status !== undefined) clean.status = updates.status;
    if (updates.appliedAt !== undefined) clean.appliedAt = updates.appliedAt.slice(0, 40);
    if (updates.deadline !== undefined) clean.deadline = updates.deadline.slice(0, 40);
    if (updates.interviewDate !== undefined) clean.interviewDate = updates.interviewDate.slice(0, 40);
    if (updates.followUpDate !== undefined) clean.followUpDate = updates.followUpDate.slice(0, 40);
    if (updates.notes !== undefined) clean.notes = updates.notes.slice(0, 2000);
    if (updates.applicationURL !== undefined) clean.applicationURL = updates.applicationURL.slice(0, 500);
    await updateDoc(doc(db, 'users', uid, 'applications', appId), clean);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteApplicationRecord(uid: string, appId: string): Promise<void> {
  const path = `users/${uid}/applications/${appId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'applications', appId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Eligibility History ---
export async function fetchEligibilityHistory(uid: string): Promise<EligibilityCheckRecord[]> {
  const path = `users/${uid}/eligibilityChecks`;
  try {
    const q = query(
      collection(db, path),
      where('userId', '==', uid),
      orderBy('checkedAt', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId,
        jobId: data.jobId,
        jobTitle: data.jobTitle,
        result: data.result,
        matchedRequirements: Array.isArray(data.matchedRequirements) ? data.matchedRequirements : [],
        unmatchedRequirements: Array.isArray(data.unmatchedRequirements) ? data.unmatchedRequirements : [],
        missingInformation: Array.isArray(data.missingInformation) ? data.missingInformation : [],
        sourceReference: data.sourceReference || '',
        checkedAt: formatFirestoreDate(data.checkedAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveEligibilityCheckRecord(
  uid: string,
  payload: Omit<EligibilityCheckRecord, 'id' | 'userId' | 'checkedAt'>
): Promise<string> {
  const id = makeSafeId('elig');
  const path = `users/${uid}/eligibilityChecks/${id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'eligibilityChecks', id), {
      userId: uid,
      jobId: payload.jobId.slice(0, 128),
      jobTitle: payload.jobTitle.slice(0, 180),
      result: payload.result,
      matchedRequirements: payload.matchedRequirements.slice(0, 30),
      unmatchedRequirements: payload.unmatchedRequirements.slice(0, 30),
      missingInformation: payload.missingInformation.slice(0, 30),
      sourceReference: (payload.sourceReference || '').slice(0, 500),
      checkedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'subscriptions', uid), {
      eligibilityChecksUsed: increment(1),
      updatedAt: serverTimestamp(),
    }).catch(() => undefined);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteEligibilityCheckRecord(uid: string, checkId: string): Promise<void> {
  const path = `users/${uid}/eligibilityChecks/${checkId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'eligibilityChecks', checkId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Resumes ---
export async function fetchUserResumes(uid: string): Promise<ResumeRecord[]> {
  const path = `users/${uid}/resumes`;
  try {
    const q = query(
      collection(db, path),
      where('userId', '==', uid),
      orderBy('updatedAt', 'desc'),
      limit(30)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId,
        title: data.title,
        template: data.template,
        personalDetails: data.personalDetails || {},
        summary: data.summary || '',
        education: Array.isArray(data.education) ? data.education : [],
        experience: Array.isArray(data.experience) ? data.experience : [],
        internships: Array.isArray(data.internships) ? data.internships : [],
        projects: Array.isArray(data.projects) ? data.projects : [],
        skills: Array.isArray(data.skills) ? data.skills : [],
        certifications: Array.isArray(data.certifications) ? data.certifications : [],
        languages: Array.isArray(data.languages) ? data.languages : [],
        achievements: Array.isArray(data.achievements) ? data.achievements : [],
        sectionOrder: Array.isArray(data.sectionOrder) ? data.sectionOrder : [],
        createdAt: formatFirestoreDate(data.createdAt),
        updatedAt: formatFirestoreDate(data.updatedAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveResumeRecord(
  uid: string,
  resume: Omit<ResumeRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<string> {
  const id = resume.id && resume.id.length > 0 ? resume.id : makeSafeId('res');
  const path = `users/${uid}/resumes/${id}`;
  const isNew = !resume.id;
  try {
    const sanitizedPersonalDetails = {
      fullName: (resume.personalDetails?.fullName || '').trim().slice(0, 120),
      email: (resume.personalDetails?.email || '').trim().slice(0, 200),
      phone: (resume.personalDetails?.phone || '').trim().slice(0, 30),
      location: (resume.personalDetails?.location || '').trim().slice(0, 120),
      linkedin: (resume.personalDetails?.linkedin || '').trim().slice(0, 250),
      portfolio: (resume.personalDetails?.portfolio || '').trim().slice(0, 250),
    };
    const payload = {
      userId: uid,
      title: resume.title.trim().slice(0, 120) || 'My Resume',
      template: resume.template,
      personalDetails: sanitizedPersonalDetails,
      summary: (resume.summary || '').trim().slice(0, 2000),
      education: resume.education.slice(0, 15),
      experience: resume.experience.slice(0, 20),
      internships: resume.internships.slice(0, 15),
      projects: resume.projects.slice(0, 20),
      skills: resume.skills.map((s) => s.trim()).filter(Boolean).slice(0, 50),
      certifications: resume.certifications.map((s) => s.trim()).filter(Boolean).slice(0, 30),
      languages: resume.languages.map((s) => s.trim()).filter(Boolean).slice(0, 20),
      achievements: resume.achievements.map((s) => s.trim()).filter(Boolean).slice(0, 30),
      sectionOrder: resume.sectionOrder.slice(0, 15),
      updatedAt: serverTimestamp(),
    };
    if (isNew) {
      await setDoc(doc(db, 'users', uid, 'resumes', id), {
        ...payload,
        createdAt: serverTimestamp(),
      });
    } else {
      const existingSnap = await getDoc(doc(db, 'users', uid, 'resumes', id));
      if (!existingSnap.exists()) {
        await setDoc(doc(db, 'users', uid, 'resumes', id), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, 'users', uid, 'resumes', id), payload);
      }
    }
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteResumeRecord(uid: string, resumeId: string): Promise<void> {
  const path = `users/${uid}/resumes/${resumeId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'resumes', resumeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Document Checklists ---
export async function fetchDocumentChecklists(uid: string): Promise<DocumentChecklist[]> {
  const path = `users/${uid}/documents`;
  try {
    const q = query(
      collection(db, path),
      where('userId', '==', uid),
      orderBy('updatedAt', 'desc'),
      limit(30)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId,
        title: data.title,
        jobId: data.jobId || '',
        items: Array.isArray(data.items) ? data.items : [],
        createdAt: formatFirestoreDate(data.createdAt),
        updatedAt: formatFirestoreDate(data.updatedAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveDocumentChecklist(
  uid: string,
  checklist: Omit<DocumentChecklist, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<string> {
  const id = checklist.id || makeSafeId('docchk');
  const path = `users/${uid}/documents/${id}`;
  try {
    const ref = doc(db, 'users', uid, 'documents', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        userId: uid,
        title: checklist.title.slice(0, 160),
        jobId: (checklist.jobId || '').slice(0, 128),
        items: checklist.items.slice(0, 40),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        title: checklist.title.slice(0, 160),
        items: checklist.items.slice(0, 40),
        updatedAt: serverTimestamp(),
      });
    }
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteDocumentChecklist(uid: string, docId: string): Promise<void> {
  const path = `users/${uid}/documents/${docId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'documents', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- AI Chats & Telemetry ---
export async function fetchAIChats(uid: string): Promise<AIChatSession[]> {
  const path = `users/${uid}/aiChats`;
  try {
    const q = query(
      collection(db, path),
      where('userId', '==', uid),
      orderBy('updatedAt', 'desc'),
      limit(30)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId,
        title: data.title,
        language: data.language === 'hi' ? 'hi' : 'en',
        jobId: data.jobId || '',
        messages: Array.isArray(data.messages) ? data.messages : [],
        createdAt: formatFirestoreDate(data.createdAt),
        updatedAt: formatFirestoreDate(data.updatedAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveAIChatSession(
  uid: string,
  session: {
    id?: string;
    title: string;
    language: LanguageCode;
    jobId?: string;
    messages: AIChatMessage[];
  }
): Promise<string> {
  const id = session.id || makeSafeId('chat');
  const path = `users/${uid}/aiChats/${id}`;
  try {
    const ref = doc(db, 'users', uid, 'aiChats', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        userId: uid,
        title: session.title.slice(0, 160),
        language: session.language,
        jobId: (session.jobId || '').slice(0, 128),
        messages: session.messages.slice(-100),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        title: session.title.slice(0, 160),
        language: session.language,
        messages: session.messages.slice(-100),
        updatedAt: serverTimestamp(),
      });
    }
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteAIChatSession(uid: string, chatId: string): Promise<void> {
  const path = `users/${uid}/aiChats/${chatId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'aiChats', chatId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function logAIUsage(
  uid: string,
  feature: AIFeatureType,
  language: LanguageCode
): Promise<void> {
  const id = makeSafeId('aiu');
  try {
    await setDoc(doc(db, 'aiUsage', id), {
      userId: uid,
      feature,
      language,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'subscriptions', uid), {
      aiQueriesUsed: increment(1),
      updatedAt: serverTimestamp(),
    }).catch(() => undefined);
  } catch {
    // Non-blocking telemetry
  }
}

// --- Notifications ---
export async function createUserNotification(
  uid: string,
  notif: Omit<NotificationItem, 'id' | 'userId' | 'read' | 'createdAt'>
): Promise<string> {
  const id = makeSafeId('notif');
  const path = `users/${uid}/notifications/${id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'notifications', id), {
      userId: uid,
      type: notif.type,
      title: notif.title.slice(0, 160),
      message: notif.message.slice(0, 600),
      link: (notif.link || '').slice(0, 300),
      read: false,
      createdAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function markNotificationRead(uid: string, notifId: string): Promise<void> {
  const path = `users/${uid}/notifications/${notifId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'notifications', notifId), { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function markAllNotificationsRead(uid: string, items: NotificationItem[]): Promise<void> {
  const unread = items.filter((n) => !n.read);
  if (unread.length === 0) return;
  try {
    const batch = writeBatch(db);
    unread.forEach((n) => {
      batch.update(doc(db, 'users', uid, 'notifications', n.id), { read: true });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}/notifications`);
  }
}

export function filterMatchingJobsByCategories(
  jobs: JobListing[],
  selectedCategories: string[]
): JobListing[] {
  if (!selectedCategories.length) return [];
  const normalized = new Set(selectedCategories.map((c) => c.trim().toLowerCase()));
  return jobs.filter(
    (job) =>
      job.verificationStatus === 'verified' &&
      normalized.has(job.category.trim().toLowerCase())
  );
}

export async function syncMatchingJobAlertsForUser(
  uid: string,
  recipientEmail: string,
  selectedCategories: string[],
  existingNotifications: NotificationItem[],
  jobs: JobListing[],
  maxCreate = 3
): Promise<number> {
  const matching = filterMatchingJobsByCategories(jobs, selectedCategories);
  if (matching.length === 0) return 0;

  const existingLinks = new Set(existingNotifications.map((n) => n.link || ''));
  const unseen = matching.filter((job) => !existingLinks.has(`/jobs/${job.id}`)).slice(0, maxCreate);

  let created = 0;
  for (const job of unseen) {
    const subject = `Job Alert [${job.category}]: ${job.title}`.slice(0, 160);
    const body = `Simulated Email to ${recipientEmail || 'your inbox'} — ${job.organization} (${job.location}) has an active verified opening in ${job.category}. Experience: ${job.experience}. Salary: ${job.salary}. Apply via official portal after checking eligibility.`.slice(
      0,
      600
    );
    await createUserNotification(uid, {
      type: 'matching_job',
      title: subject,
      message: body,
      link: `/jobs/${job.id}`.slice(0, 300),
    });
    created += 1;
  }
  return created;
}

export async function sendSimulatedJobAlertEmailDigest(
  uid: string,
  recipientEmail: string,
  selectedCategories: string[],
  jobs: JobListing[]
): Promise<{ delivered: boolean; matchedCount: number; subject: string }> {
  const matching = filterMatchingJobsByCategories(jobs, selectedCategories);
  if (matching.length > 0) {
    const top = matching[0];
    const extraCount = matching.length - 1;
    const subject =
      extraCount > 0
        ? `Job Alert Digest (${matching.length} matches): ${top.title}`.slice(0, 160)
        : `Job Alert [${top.category}]: ${top.title}`.slice(0, 160);
    const otherNames = matching
      .slice(1, 3)
      .map((j) => `${j.title} (${j.organization})`)
      .join('; ');
    const body = (
      extraCount > 0
        ? `Simulated Email to ${recipientEmail} — Featured match: ${top.title} at ${top.organization} (${top.location}). Also matching ${extraCount} more verified opening(s) in ${selectedCategories.join(', ')}: ${otherNames}.`
        : `Simulated Email to ${recipientEmail} — New match in ${top.category}: ${top.title} at ${top.organization} (${top.location}). Qualification: ${top.qualifications.join(', ')}. Verify official portal dates before applying.`
    ).slice(0, 600);

    await createUserNotification(uid, {
      type: 'matching_job',
      title: subject,
      message: body,
      link: `/jobs/${top.id}`.slice(0, 300),
    });
    return { delivered: true, matchedCount: matching.length, subject };
  }

  const fallbackSubject = `Job Alert Subscription Active (${selectedCategories.slice(0, 2).join(', ')})`.slice(
    0,
    160
  );
  const fallbackBody = `Simulated Email to ${recipientEmail} — You are subscribed to alerts for: ${selectedCategories.join(
    ', '
  )}. No new verified listings match these categories right now, and you will be notified as soon as matching roles are published.`.slice(
    0,
    600
  );
  await createUserNotification(uid, {
    type: 'matching_job',
    title: fallbackSubject,
    message: fallbackBody,
    link: '/jobs',
  });
  return { delivered: true, matchedCount: 0, subject: fallbackSubject };
}

// --- Profile, Privacy Export & Account Deletion ---
export async function fetchUserProfile(
  uid: string,
  preferServer = false
): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const ref = doc(db, 'users', uid);
    const snap = preferServer
      ? await getDocFromServer(ref).catch(() => getDoc(ref))
      : await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      uid: data.uid || uid,
      name: data.name || '',
      email: data.email || '',
      photoURL: data.photoURL || '',
      phone: data.phone || '',
      location: data.location || '',
      linkedin: data.linkedin || '',
      portfolio: data.portfolio || '',
      summary: data.summary || '',
      certifications: Array.isArray(data.certifications) ? data.certifications : [],
      preferredLanguage: data.preferredLanguage === 'hi' ? 'hi' : 'en',
      education: data.education || '',
      qualification: data.qualification || '',
      skills: Array.isArray(data.skills) ? data.skills : [],
      experience: typeof data.experience === 'number' ? data.experience : 0,
      preferredLocations: Array.isArray(data.preferredLocations) ? data.preferredLocations : [],
      preferredCategories: Array.isArray(data.preferredCategories) ? data.preferredCategories : [],
      status: data.status === 'suspended' ? 'suspended' : 'active',
      consentGiven: Boolean(data.consentGiven),
      notificationPrefs: data.notificationPrefs,
      createdAt: formatFirestoreDate(data.createdAt),
      updatedAt: formatFirestoreDate(data.updatedAt),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function updateUserProfileRecord(
  uid: string,
  updates: Partial<
    Pick<
      UserProfile,
      | 'name'
      | 'phone'
      | 'location'
      | 'linkedin'
      | 'portfolio'
      | 'summary'
      | 'certifications'
      | 'preferredLanguage'
      | 'education'
      | 'qualification'
      | 'skills'
      | 'experience'
      | 'preferredLocations'
      | 'preferredCategories'
      | 'notificationPrefs'
    >
  >
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const clean: Record<string, any> = { updatedAt: serverTimestamp() };
    if (updates.name !== undefined && updates.name.trim().length > 0) {
      clean.name = updates.name.trim().slice(0, 120);
    }
    if (updates.phone !== undefined) clean.phone = updates.phone.trim().slice(0, 30);
    if (updates.location !== undefined) clean.location = updates.location.trim().slice(0, 120);
    if (updates.linkedin !== undefined) clean.linkedin = updates.linkedin.trim().slice(0, 250);
    if (updates.portfolio !== undefined) clean.portfolio = updates.portfolio.trim().slice(0, 250);
    if (updates.summary !== undefined) clean.summary = updates.summary.trim().slice(0, 2000);
    if (updates.certifications !== undefined) {
      clean.certifications = updates.certifications.map((s) => s.trim()).filter(Boolean).slice(0, 30);
    }
    if (updates.preferredLanguage !== undefined) clean.preferredLanguage = updates.preferredLanguage;
    if (updates.education !== undefined) clean.education = updates.education.trim().slice(0, 200);
    if (updates.qualification !== undefined) clean.qualification = updates.qualification.trim().slice(0, 120);
    if (updates.skills !== undefined) {
      clean.skills = updates.skills.map((s) => s.trim()).filter(Boolean).slice(0, 40);
    }
    if (updates.experience !== undefined) {
      clean.experience = Math.max(0, Math.min(60, Number(updates.experience) || 0));
    }
    if (updates.preferredLocations !== undefined) {
      clean.preferredLocations = updates.preferredLocations.map((s) => s.trim()).filter(Boolean).slice(0, 20);
    }
    if (updates.preferredCategories !== undefined) {
      clean.preferredCategories = updates.preferredCategories.map((s) => s.trim()).filter(Boolean).slice(0, 20);
    }
    if (updates.notificationPrefs !== undefined) clean.notificationPrefs = updates.notificationPrefs;

    await updateDoc(doc(db, 'users', uid), clean);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function exportUserPersonalData(uid: string): Promise<Record<string, any>> {
  const [
    profileSnap,
    apps,
    resumes,
    checks,
    docs,
    chats,
    resumeAnalyses,
    mockInterviews,
    careerRoadmaps,
    mockTestAttempts,
    savedExams,
    learningProgress,
  ] = await Promise.all([
    getDoc(doc(db, 'users', uid)),
    fetchUserApplications(uid),
    fetchUserResumes(uid),
    fetchEligibilityHistory(uid),
    fetchDocumentChecklists(uid),
    fetchAIChats(uid),
    fetchResumeAnalyses(uid).catch(() => []),
    fetchMockInterviews(uid).catch(() => []),
    fetchCareerRoadmaps(uid).catch(() => []),
    fetchMockTestAttempts(uid).catch(() => []),
    fetchSavedExams(uid).catch(() => []),
    fetchLearningProgress(uid).catch(() => []),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    profile: profileSnap.exists() ? profileSnap.data() : null,
    applications: apps,
    resumes,
    eligibilityChecks: checks,
    documentChecklists: docs,
    aiChats: chats,
    resumeAnalyses,
    mockInterviews,
    careerRoadmaps,
    mockTestAttempts,
    savedExams,
    learningProgress,
  };
}

export async function deleteAllUserData(uid: string): Promise<void> {
  const subcollections = [
    'savedJobs',
    'applications',
    'eligibilityChecks',
    'resumes',
    'documents',
    'aiChats',
    'notifications',
    'resumeAnalyses',
    'mockInterviews',
    'careerRoadmaps',
    'mockTestAttempts',
    'savedExams',
    'learningProgress',
    'jobComparisons',
  ];
  for (const sub of subcollections) {
    const snap = await getDocs(
      query(collection(db, 'users', uid, sub), where('userId', '==', uid), limit(100))
    );
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    if (!snap.empty) await batch.commit();
  }
  await deleteDoc(doc(db, 'users', uid));
}

// --- Reports & Support ---
export async function submitJobReport(
  uid: string,
  jobId: string,
  jobTitle: string,
  reason: string,
  warningIndicators: string[] = []
): Promise<void> {
  const id = makeSafeId('rep');
  const path = `jobReports/${id}`;
  try {
    await setDoc(doc(db, 'jobReports', id), {
      jobId: jobId.slice(0, 128),
      jobTitle: jobTitle.slice(0, 180),
      reporterId: uid,
      reason: reason.trim().slice(0, 500),
      warningIndicators: warningIndicators.slice(0, 10),
      status: 'open',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function submitSupportTicket(
  uid: string,
  payload: { name: string; email: string; subject: string; message: string }
): Promise<string> {
  const id = makeSafeId('tkt');
  const path = `supportTickets/${id}`;
  try {
    await setDoc(doc(db, 'supportTickets', id), {
      userId: uid,
      name: payload.name.trim().slice(0, 120),
      email: payload.email.trim().slice(0, 200),
      subject: payload.subject.trim().slice(0, 180),
      message: payload.message.trim().slice(0, 3000),
      status: 'open',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// --- Admin Operations ---
export async function logAdminAction(
  adminUid: string,
  adminEmail: string,
  action: string,
  targetId: string,
  details: string
): Promise<void> {
  const id = makeSafeId('audit');
  try {
    await setDoc(doc(db, 'adminAuditLogs', id), {
      adminUid,
      adminEmail: adminEmail.slice(0, 200),
      action: action.slice(0, 120),
      targetId: targetId.slice(0, 128),
      details: details.slice(0, 500),
      createdAt: serverTimestamp(),
    });
  } catch {
    // non-fatal
  }
}

export async function fetchAllJobsAdmin(): Promise<JobListing[]> {
  const path = 'jobs';
  try {
    const snap = await getDocs(query(collection(db, path), orderBy('createdAt', 'desc'), limit(200)));
    return snap.docs.map((d) => mapJobDoc(d.id, d.data()));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function upsertJobAdmin(
  adminUid: string,
  adminEmail: string,
  job: Omit<JobListing, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<string> {
  const id = job.id && job.id.trim().length > 0 ? job.id.trim().replace(/[^a-zA-Z0-9_-]/g, '-') : makeSafeId('job');
  const path = `jobs/${id}`;
  try {
    const ref = doc(db, 'jobs', id);
    const snap = await getDoc(ref);
    const baseData = {
      id,
      title: job.title.trim().slice(0, 180),
      organization: job.organization.trim().slice(0, 160),
      organizationLogo: (job.organizationLogo || '').slice(0, 500),
      category: job.category.slice(0, 80),
      sector: job.sector,
      location: job.location.trim().slice(0, 120),
      employmentType: (job.employmentType || 'Full-Time').slice(0, 60),
      workMode: job.workMode || 'onsite',
      experience: (job.experience || 'Fresher').slice(0, 80),
      qualifications: job.qualifications.slice(0, 20),
      eligibilityRules: job.eligibilityRules || {},
      description: (job.description || '').slice(0, 6000),
      responsibilities: job.responsibilities.slice(0, 30),
      salary: (job.salary || '').slice(0, 160),
      importantDates: job.importantDates || {},
      applicationFee: (job.applicationFee || '').slice(0, 300),
      requiredDocuments: job.requiredDocuments.slice(0, 25),
      selectionProcess: job.selectionProcess.slice(0, 15),
      applicationInstructions: (job.applicationInstructions || '').slice(0, 3000),
      officialSourceURL: job.officialSourceURL.trim().slice(0, 500),
      applicationURL: job.applicationURL.trim().slice(0, 500),
      sourceName: (job.sourceName || '').slice(0, 160),
      verificationStatus: job.verificationStatus || 'pending',
      expiresAt: (job.expiresAt || '').slice(0, 40),
      createdBy: job.createdBy || adminUid,
      updatedAt: serverTimestamp(),
    };
    if (!snap.exists()) {
      await setDoc(ref, {
        ...baseData,
        createdAt: serverTimestamp(),
      });
      await logAdminAction(adminUid, adminEmail, 'CREATE_JOB', id, `Created job: ${job.title}`);
    } else {
      await updateDoc(ref, baseData);
      await logAdminAction(adminUid, adminEmail, 'UPDATE_JOB', id, `Updated job: ${job.title}`);
    }
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function verifyJobStatusAdmin(
  adminUid: string,
  adminEmail: string,
  jobId: string,
  status: 'verified' | 'rejected' | 'expired'
): Promise<void> {
  const path = `jobs/${jobId}`;
  try {
    const payload: Record<string, any> = {
      verificationStatus: status,
      updatedAt: serverTimestamp(),
    };
    if (status === 'verified') {
      payload.verifiedBy = adminUid;
      payload.verifiedAt = serverTimestamp();
    }
    await updateDoc(doc(db, 'jobs', jobId), payload);
    await logAdminAction(adminUid, adminEmail, `VERIFY_${status.toUpperCase()}`, jobId, `Status changed to ${status}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteJobAdmin(adminUid: string, adminEmail: string, jobId: string): Promise<void> {
  const path = `jobs/${jobId}`;
  try {
    await deleteDoc(doc(db, 'jobs', jobId));
    await logAdminAction(adminUid, adminEmail, 'DELETE_JOB', jobId, 'Deleted job listing');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedStarterCatalogAdmin(adminUid: string, adminEmail: string): Promise<number> {
  let count = 0;
  for (const cat of DEFAULT_CATEGORIES) {
    await setDoc(doc(db, 'categories', cat.slug), {
      slug: cat.slug,
      name: cat.name,
      nameHi: cat.nameHi || '',
      sector: cat.sector,
      isActive: true,
      createdAt: serverTimestamp(),
    });
  }
  for (const job of OFFICIAL_STARTER_CATALOG) {
    const ref = doc(db, 'jobs', job.id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        id: job.id,
        title: job.title,
        organization: job.organization,
        category: job.category,
        sector: job.sector,
        location: job.location,
        employmentType: job.employmentType,
        workMode: job.workMode,
        experience: job.experience,
        qualifications: job.qualifications,
        eligibilityRules: job.eligibilityRules,
        description: job.description,
        responsibilities: job.responsibilities,
        salary: job.salary,
        importantDates: job.importantDates,
        applicationFee: job.applicationFee,
        requiredDocuments: job.requiredDocuments,
        selectionProcess: job.selectionProcess,
        applicationInstructions: job.applicationInstructions,
        officialSourceURL: job.officialSourceURL,
        applicationURL: job.applicationURL,
        sourceName: job.sourceName || '',
        verificationStatus: 'verified',
        verifiedBy: adminUid,
        verifiedAt: serverTimestamp(),
        expiresAt: job.expiresAt || '',
        createdBy: adminUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      count += 1;
    }
  }
  await logAdminAction(adminUid, adminEmail, 'SEED_OFFICIAL_CATALOG', 'jobs', `Imported ${count} verified portal records`);
  return count;
}

export async function fetchAllUsersAdmin(): Promise<UserProfile[]> {
  const path = 'users';
  try {
    const snap = await getDocs(query(collection(db, path), orderBy('createdAt', 'desc'), limit(200)));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        uid: data.uid,
        name: data.name,
        email: data.email,
        preferredLanguage: data.preferredLanguage || 'en',
        qualification: data.qualification || '',
        status: data.status || 'active',
        createdAt: formatFirestoreDate(data.createdAt),
        updatedAt: formatFirestoreDate(data.updatedAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function toggleUserStatusAdmin(
  adminUid: string,
  adminEmail: string,
  targetUid: string,
  newStatus: 'active' | 'suspended'
): Promise<void> {
  const path = `users/${targetUid}`;
  try {
    await updateDoc(doc(db, 'users', targetUid), {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
    await logAdminAction(adminUid, adminEmail, 'USER_STATUS_CHANGE', targetUid, `Set status to ${newStatus}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function fetchJobReportsAdmin(): Promise<JobReport[]> {
  const path = 'jobReports';
  try {
    const snap = await getDocs(query(collection(db, path), orderBy('createdAt', 'desc'), limit(100)));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        jobId: data.jobId,
        jobTitle: data.jobTitle || '',
        reporterId: data.reporterId,
        reason: data.reason,
        warningIndicators: Array.isArray(data.warningIndicators) ? data.warningIndicators : [],
        adminNote: data.adminNote || '',
        status: data.status,
        createdAt: formatFirestoreDate(data.createdAt),
        updatedAt: formatFirestoreDate(data.updatedAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function updateJobReportAdmin(
  adminUid: string,
  adminEmail: string,
  reportId: string,
  status: JobReport['status'],
  adminNote?: string
): Promise<void> {
  const path = `jobReports/${reportId}`;
  try {
    const clean: Record<string, any> = {
      status,
      updatedAt: serverTimestamp(),
    };
    if (adminNote !== undefined) {
      clean.adminNote = adminNote.slice(0, 500);
    }
    await updateDoc(doc(db, 'jobReports', reportId), clean);
    await logAdminAction(adminUid, adminEmail, 'UPDATE_REPORT', reportId, `Set status to ${status}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function fetchAllCategoriesAdmin(): Promise<JobCategory[]> {
  const path = 'categories';
  try {
    const snap = await getDocs(collection(db, path));
    if (snap.empty) return [];
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        slug: data.slug,
        name: data.name,
        nameHi: data.nameHi || '',
        sector: data.sector || 'all',
        description: data.description || '',
        isActive: Boolean(data.isActive),
        createdAt: formatFirestoreDate(data.createdAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function upsertCategoryAdmin(cat: Omit<JobCategory, 'id' | 'createdAt'>): Promise<void> {
  const slug = cat.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const path = `categories/${slug}`;
  try {
    const ref = doc(db, 'categories', slug);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        slug,
        name: cat.name.trim().slice(0, 80),
        nameHi: (cat.nameHi || '').trim().slice(0, 100),
        sector: cat.sector,
        description: (cat.description || '').slice(0, 300),
        isActive: cat.isActive,
        createdAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        slug,
        name: cat.name.trim().slice(0, 80),
        nameHi: (cat.nameHi || '').trim().slice(0, 100),
        sector: cat.sector,
        description: (cat.description || '').slice(0, 300),
        isActive: cat.isActive,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCategoryAdmin(slug: string): Promise<void> {
  const path = `categories/${slug}`;
  try {
    await deleteDoc(doc(db, 'categories', slug));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchAuditLogsAdmin(): Promise<AdminAuditLog[]> {
  const path = 'adminAuditLogs';
  try {
    const snap = await getDocs(query(collection(db, path), orderBy('createdAt', 'desc'), limit(100)));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        adminUid: data.adminUid,
        adminEmail: data.adminEmail || '',
        action: data.action,
        targetId: data.targetId,
        details: data.details || '',
        createdAt: formatFirestoreDate(data.createdAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchAIUsageLogsAdmin(): Promise<
  Array<{ id: string; userId: string; feature: string; language: string; createdAt: string }>
> {
  const path = 'aiUsage';
  try {
    const snap = await getDocs(query(collection(db, path), orderBy('createdAt', 'desc'), limit(200)));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId,
        feature: data.feature,
        language: data.language,
        createdAt: formatFirestoreDate(data.createdAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchSupportTicketsAdmin(): Promise<SupportTicket[]> {
  const path = 'supportTickets';
  try {
    const snap = await getDocs(query(collection(db, path), orderBy('createdAt', 'desc'), limit(100)));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId,
        name: data.name,
        email: data.email,
        subject: data.subject,
        message: data.message,
        status: data.status,
        createdAt: formatFirestoreDate(data.createdAt),
        updatedAt: formatFirestoreDate(data.updatedAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function updateSupportTicketStatusAdmin(
  ticketId: string,
  status: SupportTicket['status']
): Promise<void> {
  const path = `supportTickets/${ticketId}`;
  try {
    await updateDoc(doc(db, 'supportTickets', ticketId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function savePlatformSettingsAdmin(
  adminUid: string,
  adminEmail: string,
  settings: Omit<PlatformSetting, 'id' | 'updatedAt'>
): Promise<void> {
  const path = 'platformSettings/default';
  try {
    await setDoc(doc(db, 'platformSettings', 'default'), {
      announcementBanner: (settings.announcementBanner || '').slice(0, 300),
      showAnnouncement: Boolean(settings.showAnnouncement),
      aiDailyLimitFree: Number(settings.aiDailyLimitFree || 15),
      eligibilityLimitFree: Number(settings.eligibilityLimitFree || 10),
      updatedAt: serverTimestamp(),
    });
    await logAdminAction(adminUid, adminEmail, 'UPDATE_SETTINGS', 'default', 'Updated platform settings');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// =====================================================================
// FormSaathi 2.0 Collections & Features
// =====================================================================

// --- AI Resume Analyzer ---
export async function fetchResumeAnalyses(uid: string): Promise<ResumeAnalysisRecord[]> {
  const path = `users/${uid}/resumeAnalyses`;
  try {
    const q = query(
      collection(db, path),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId,
        fileName: data.fileName || 'Resume',
        targetRole: data.targetRole || '',
        jobDescriptionSnippet: data.jobDescriptionSnippet || '',
        storagePath: data.storagePath || '',
        atsScore: Number(data.atsScore || 0),
        keywordMatchScore: Number(data.keywordMatchScore || 0),
        summaryFeedback: data.summaryFeedback || '',
        matchedKeywords: Array.isArray(data.matchedKeywords) ? data.matchedKeywords : [],
        missingKeywords: Array.isArray(data.missingKeywords) ? data.missingKeywords : [],
        sectionSuggestions: Array.isArray(data.sectionSuggestions) ? data.sectionSuggestions : [],
        bulletImprovements: Array.isArray(data.bulletImprovements) ? data.bulletImprovements : [],
        improvedSummary: data.improvedSummary || '',
        createdAt: formatFirestoreDate(data.createdAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveResumeAnalysis(
  uid: string,
  payload: Omit<ResumeAnalysisRecord, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  const id = makeSafeId('rana');
  const path = `users/${uid}/resumeAnalyses/${id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'resumeAnalyses', id), {
      userId: uid,
      fileName: payload.fileName.slice(0, 180),
      targetRole: payload.targetRole.slice(0, 140),
      jobDescriptionSnippet: (payload.jobDescriptionSnippet || '').slice(0, 2000),
      storagePath: (payload.storagePath || '').slice(0, 300),
      atsScore: Math.max(0, Math.min(100, Number(payload.atsScore || 0))),
      keywordMatchScore: Math.max(0, Math.min(100, Number(payload.keywordMatchScore || 0))),
      summaryFeedback: (payload.summaryFeedback || '').slice(0, 1500),
      matchedKeywords: payload.matchedKeywords.slice(0, 40),
      missingKeywords: payload.missingKeywords.slice(0, 40),
      sectionSuggestions: payload.sectionSuggestions.slice(0, 15),
      bulletImprovements: payload.bulletImprovements.slice(0, 20),
      improvedSummary: (payload.improvedSummary || '').slice(0, 2000),
      createdAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteResumeAnalysis(uid: string, analysisId: string): Promise<void> {
  const path = `users/${uid}/resumeAnalyses/${analysisId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'resumeAnalyses', analysisId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- AI Mock Interview Studio ---
export async function fetchMockInterviews(uid: string): Promise<MockInterviewSession[]> {
  const path = `users/${uid}/mockInterviews`;
  try {
    const q = query(
      collection(db, path),
      where('userId', '==', uid),
      orderBy('updatedAt', 'desc'),
      limit(40)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId,
        roleTitle: data.roleTitle,
        difficulty: data.difficulty || 'Intermediate',
        durationMinutes: Number(data.durationMinutes || 15),
        questionCount: Number(data.questionCount || 5),
        status: data.status === 'completed' ? 'completed' : 'in_progress',
        overallScore: Number(data.overallScore || 0),
        messages: Array.isArray(data.messages) ? data.messages : [],
        finalFeedback: data.finalFeedback || undefined,
        createdAt: formatFirestoreDate(data.createdAt),
        updatedAt: formatFirestoreDate(data.updatedAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveMockInterviewSession(
  uid: string,
  session: Omit<MockInterviewSession, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<string> {
  const id = session.id || makeSafeId('mint');
  const path = `users/${uid}/mockInterviews/${id}`;
  try {
    const ref = doc(db, 'users', uid, 'mockInterviews', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        userId: uid,
        roleTitle: session.roleTitle.slice(0, 140),
        difficulty: session.difficulty,
        durationMinutes: Number(session.durationMinutes || 15),
        questionCount: Number(session.questionCount || 5),
        status: session.status,
        overallScore: Math.max(0, Math.min(100, Number(session.overallScore || 0))),
        messages: session.messages.slice(-60),
        ...(session.finalFeedback ? { finalFeedback: session.finalFeedback } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        status: session.status,
        overallScore: Math.max(0, Math.min(100, Number(session.overallScore || 0))),
        messages: session.messages.slice(-60),
        ...(session.finalFeedback ? { finalFeedback: session.finalFeedback } : {}),
        updatedAt: serverTimestamp(),
      });
    }
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteMockInterviewSession(uid: string, interviewId: string): Promise<void> {
  const path = `users/${uid}/mockInterviews/${interviewId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'mockInterviews', interviewId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Government Exam Calendar & Saved Reminders ---
export async function fetchExamEvents(includeUnpublished = false): Promise<ExamEvent[]> {
  try {
    const col = collection(db, 'examEvents');
    const q = includeUnpublished
      ? query(col, orderBy('createdAt', 'desc'), limit(100))
      : query(col, where('isPublished', '==', true), limit(100));
    const snap = await getDocs(q);
    if (snap.empty && !includeUnpublished) {
      return OFFICIAL_EXAM_EVENTS;
    }
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: data.title,
        organization: data.organization,
        category: data.category,
        notificationStatus: data.notificationStatus,
        applicationStartDate: data.applicationStartDate || '',
        lastDate: data.lastDate || '',
        examDate: data.examDate || '',
        admitCardNote: data.admitCardNote || '',
        officialURL: data.officialURL,
        lastVerifiedAt: data.lastVerifiedAt,
        notes: data.notes || '',
        isPublished: Boolean(data.isPublished),
        createdAt: formatFirestoreDate(data.createdAt),
        updatedAt: formatFirestoreDate(data.updatedAt),
      };
    });
  } catch {
    return includeUnpublished ? [] : OFFICIAL_EXAM_EVENTS;
  }
}

export async function upsertExamEventAdmin(
  adminUid: string,
  adminEmail: string,
  ev: Omit<ExamEvent, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<string> {
  const id = ev.id?.trim() ? ev.id.trim().replace(/[^a-zA-Z0-9_-]/g, '-') : makeSafeId('exam');
  const path = `examEvents/${id}`;
  try {
    const ref = doc(db, 'examEvents', id);
    const snap = await getDoc(ref);
    const payload = {
      title: ev.title.trim().slice(0, 180),
      organization: ev.organization.trim().slice(0, 160),
      category: ev.category,
      notificationStatus: ev.notificationStatus,
      applicationStartDate: (ev.applicationStartDate || '').slice(0, 60),
      lastDate: (ev.lastDate || '').slice(0, 60),
      examDate: (ev.examDate || '').slice(0, 60),
      admitCardNote: (ev.admitCardNote || '').slice(0, 200),
      officialURL: ev.officialURL.trim().slice(0, 500),
      lastVerifiedAt: (ev.lastVerifiedAt || new Date().toISOString().slice(0, 10)).slice(0, 60),
      notes: (ev.notes || '').slice(0, 1000),
      isPublished: Boolean(ev.isPublished),
      updatedAt: serverTimestamp(),
    };
    if (!snap.exists()) {
      await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
      await logAdminAction(adminUid, adminEmail, 'CREATE_EXAM_EVENT', id, ev.title);
    } else {
      await updateDoc(ref, payload);
      await logAdminAction(adminUid, adminEmail, 'UPDATE_EXAM_EVENT', id, ev.title);
    }
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteExamEventAdmin(adminUid: string, adminEmail: string, examId: string): Promise<void> {
  const path = `examEvents/${examId}`;
  try {
    await deleteDoc(doc(db, 'examEvents', examId));
    await logAdminAction(adminUid, adminEmail, 'DELETE_EXAM_EVENT', examId, 'Deleted exam event');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchSavedExams(uid: string): Promise<SavedExamReminder[]> {
  const path = `users/${uid}/savedExams`;
  try {
    const snap = await getDocs(query(collection(db, path), where('userId', '==', uid), limit(60)));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId,
        examId: data.examId,
        title: data.title,
        organization: data.organization,
        lastDate: data.lastDate || '',
        examDate: data.examDate || '',
        officialURL: data.officialURL,
        savedAt: formatFirestoreDate(data.savedAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveExamReminder(uid: string, exam: ExamEvent): Promise<void> {
  const safeExamId = exam.id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  const path = `users/${uid}/savedExams/${safeExamId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'savedExams', safeExamId), {
      userId: uid,
      examId: safeExamId,
      title: exam.title.slice(0, 180),
      organization: exam.organization.slice(0, 160),
      lastDate: (exam.lastDate || '').slice(0, 60),
      examDate: (exam.examDate || '').slice(0, 60),
      officialURL: exam.officialURL.slice(0, 500),
      savedAt: serverTimestamp(),
    });
    await createUserNotification(uid, {
      type: 'exam_reminder',
      title: `Exam Reminder Saved: ${exam.title}`.slice(0, 160),
      message: `${exam.organization} (${exam.category}) — Exam/Cycle: ${
        exam.examDate || exam.lastDate || 'Check official portal'
      }. Official URL: ${exam.officialURL}`.slice(0, 600),
      link: '/tools/exam-calendar',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeSavedExamReminder(uid: string, examId: string): Promise<void> {
  const safeExamId = examId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  const path = `users/${uid}/savedExams/${safeExamId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'savedExams', safeExamId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Competitive Exam Mock Test Platform & Question Bank ---
export async function fetchMockTests(includeDrafts = false): Promise<MockTest[]> {
  try {
    const col = collection(db, 'mockTests');
    const q = includeDrafts
      ? query(col, orderBy('createdAt', 'desc'), limit(100))
      : query(col, where('status', '==', 'published'), limit(100));
    const snap = await getDocs(q);
    if (snap.empty && !includeDrafts) {
      return STARTER_MOCK_TESTS;
    }
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: data.title,
        examCategory: data.examCategory,
        difficulty: data.difficulty,
        durationMinutes: Number(data.durationMinutes || 15),
        totalMarks: Number(data.totalMarks || 20),
        negativeMarking: Number(data.negativeMarking || 0),
        isUnofficialPractice: data.isUnofficialPractice !== false,
        status: data.status,
        questions: Array.isArray(data.questions) ? data.questions : [],
        description: data.description || '',
        createdAt: formatFirestoreDate(data.createdAt),
        updatedAt: formatFirestoreDate(data.updatedAt),
      };
    });
  } catch {
    return includeDrafts ? [] : STARTER_MOCK_TESTS;
  }
}

export async function upsertMockTestAdmin(
  adminUid: string,
  adminEmail: string,
  test: Omit<MockTest, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<string> {
  const id = test.id?.trim() ? test.id.trim().replace(/[^a-zA-Z0-9_-]/g, '-') : makeSafeId('test');
  const path = `mockTests/${id}`;
  try {
    const ref = doc(db, 'mockTests', id);
    const snap = await getDoc(ref);
    const payload = {
      title: test.title.trim().slice(0, 180),
      examCategory: test.examCategory,
      difficulty: test.difficulty,
      durationMinutes: Number(test.durationMinutes || 15),
      totalMarks: Number(test.totalMarks || 20),
      negativeMarking: Number(test.negativeMarking || 0),
      isUnofficialPractice: test.isUnofficialPractice !== false,
      status: test.status,
      questions: test.questions.slice(0, 150),
      description: (test.description || '').slice(0, 1000),
      updatedAt: serverTimestamp(),
    };
    if (!snap.exists()) {
      await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
      await logAdminAction(adminUid, adminEmail, 'CREATE_MOCK_TEST', id, test.title);
    } else {
      await updateDoc(ref, payload);
      await logAdminAction(adminUid, adminEmail, 'UPDATE_MOCK_TEST', id, test.title);
    }
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteMockTestAdmin(adminUid: string, adminEmail: string, testId: string): Promise<void> {
  const path = `mockTests/${testId}`;
  try {
    await deleteDoc(doc(db, 'mockTests', testId));
    await logAdminAction(adminUid, adminEmail, 'DELETE_MOCK_TEST', testId, 'Deleted mock test');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchQuestionBank(includeInactive = false): Promise<QuestionBankItem[]> {
  try {
    const col = collection(db, 'questionBank');
    const q = includeInactive
      ? query(col, orderBy('createdAt', 'desc'), limit(200))
      : query(col, where('isActive', '==', true), limit(200));
    const snap = await getDocs(q);
    if (snap.empty && !includeInactive) {
      return STARTER_QUESTION_BANK;
    }
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        examCategory: data.examCategory,
        topic: data.topic,
        difficulty: data.difficulty,
        questionText: data.questionText,
        options: Array.isArray(data.options) ? data.options : [],
        correctIndex: Number(data.correctIndex || 0),
        explanation: data.explanation || '',
        isActive: Boolean(data.isActive),
        createdAt: formatFirestoreDate(data.createdAt),
        updatedAt: formatFirestoreDate(data.updatedAt),
      };
    });
  } catch {
    return includeInactive ? [] : STARTER_QUESTION_BANK;
  }
}

export async function upsertQuestionBankAdmin(
  adminUid: string,
  adminEmail: string,
  item: Omit<QuestionBankItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<string> {
  const id = item.id?.trim() ? item.id.trim().replace(/[^a-zA-Z0-9_-]/g, '-') : makeSafeId('qb');
  const path = `questionBank/${id}`;
  try {
    const ref = doc(db, 'questionBank', id);
    const snap = await getDoc(ref);
    const payload = {
      examCategory: item.examCategory,
      topic: item.topic.trim().slice(0, 100),
      difficulty: item.difficulty,
      questionText: item.questionText.trim().slice(0, 1200),
      options: item.options.slice(0, 4).map((o) => String(o).slice(0, 300)),
      correctIndex: Math.max(0, Math.min(3, Number(item.correctIndex || 0))),
      explanation: (item.explanation || '').slice(0, 1200),
      isActive: Boolean(item.isActive),
      updatedAt: serverTimestamp(),
    };
    if (!snap.exists()) {
      await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
      await logAdminAction(adminUid, adminEmail, 'CREATE_QUESTION', id, item.topic);
    } else {
      await updateDoc(ref, payload);
      await logAdminAction(adminUid, adminEmail, 'UPDATE_QUESTION', id, item.topic);
    }
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteQuestionBankAdmin(adminUid: string, adminEmail: string, questionId: string): Promise<void> {
  const path = `questionBank/${questionId}`;
  try {
    await deleteDoc(doc(db, 'questionBank', questionId));
    await logAdminAction(adminUid, adminEmail, 'DELETE_QUESTION', questionId, 'Deleted question');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchMockTestAttempts(uid: string): Promise<MockTestAttempt[]> {
  const path = `users/${uid}/mockTestAttempts`;
  try {
    const q = query(
      collection(db, path),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId,
        testId: data.testId,
        testTitle: data.testTitle,
        examCategory: data.examCategory || 'General',
        score: Number(data.score || 0),
        totalMarks: Number(data.totalMarks || 0),
        correctCount: Number(data.correctCount || 0),
        wrongCount: Number(data.wrongCount || 0),
        unansweredCount: Number(data.unansweredCount || 0),
        accuracyPercent: Number(data.accuracyPercent || 0),
        timeSpentSeconds: Number(data.timeSpentSeconds || 0),
        answers: data.answers || {},
        createdAt: formatFirestoreDate(data.createdAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveMockTestAttempt(
  uid: string,
  payload: Omit<MockTestAttempt, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  const id = makeSafeId('mta');
  const path = `users/${uid}/mockTestAttempts/${id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'mockTestAttempts', id), {
      userId: uid,
      testId: payload.testId.slice(0, 128),
      testTitle: payload.testTitle.slice(0, 180),
      examCategory: (payload.examCategory || 'General').slice(0, 60),
      score: Number(payload.score),
      totalMarks: Number(payload.totalMarks),
      correctCount: Number(payload.correctCount || 0),
      wrongCount: Number(payload.wrongCount || 0),
      unansweredCount: Number(payload.unansweredCount || 0),
      accuracyPercent: Math.max(0, Math.min(100, Number(payload.accuracyPercent || 0))),
      timeSpentSeconds: Number(payload.timeSpentSeconds || 0),
      answers: payload.answers || {},
      createdAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// --- Career Roadmap Generator ---
export async function fetchCareerRoadmaps(uid: string): Promise<CareerRoadmapRecord[]> {
  const path = `users/${uid}/careerRoadmaps`;
  try {
    const q = query(
      collection(db, path),
      where('userId', '==', uid),
      orderBy('updatedAt', 'desc'),
      limit(25)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId,
        targetGoal: data.targetGoal,
        currentLevel: data.currentLevel || 'Beginner',
        weeklyHours: Number(data.weeklyHours || 10),
        overview: data.overview || '',
        stages: Array.isArray(data.stages) ? data.stages : [],
        weeklyPlan: Array.isArray(data.weeklyPlan) ? data.weeklyPlan : [],
        completedStepIds: Array.isArray(data.completedStepIds) ? data.completedStepIds : [],
        createdAt: formatFirestoreDate(data.createdAt),
        updatedAt: formatFirestoreDate(data.updatedAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveCareerRoadmap(
  uid: string,
  roadmap: Omit<CareerRoadmapRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<string> {
  const id = roadmap.id || makeSafeId('road');
  const path = `users/${uid}/careerRoadmaps/${id}`;
  try {
    const ref = doc(db, 'users', uid, 'careerRoadmaps', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        userId: uid,
        targetGoal: roadmap.targetGoal.slice(0, 160),
        currentLevel: (roadmap.currentLevel || 'Beginner').slice(0, 80),
        weeklyHours: Number(roadmap.weeklyHours || 10),
        overview: (roadmap.overview || '').slice(0, 2000),
        stages: roadmap.stages.slice(0, 10),
        weeklyPlan: roadmap.weeklyPlan.slice(0, 14),
        completedStepIds: roadmap.completedStepIds.slice(0, 100),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        completedStepIds: roadmap.completedStepIds.slice(0, 100),
        stages: roadmap.stages.slice(0, 10),
        weeklyPlan: roadmap.weeklyPlan.slice(0, 14),
        updatedAt: serverTimestamp(),
      });
    }
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCareerRoadmap(uid: string, roadmapId: string): Promise<void> {
  const path = `users/${uid}/careerRoadmaps/${roadmapId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'careerRoadmaps', roadmapId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Skills & Learning Hub ---
export async function fetchLearningPaths(includeUnpublished = false): Promise<LearningPath[]> {
  try {
    const col = collection(db, 'learningPaths');
    const q = includeUnpublished
      ? query(col, orderBy('createdAt', 'desc'), limit(100))
      : query(col, where('isPublished', '==', true), limit(100));
    const snap = await getDocs(q);
    if (snap.empty && !includeUnpublished) {
      return STARTER_LEARNING_PATHS;
    }
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: data.title,
        category: data.category,
        level: data.level,
        description: data.description || '',
        estimatedHours: Number(data.estimatedHours || 4),
        lessons: Array.isArray(data.lessons) ? data.lessons : [],
        isPublished: Boolean(data.isPublished),
        createdAt: formatFirestoreDate(data.createdAt),
        updatedAt: formatFirestoreDate(data.updatedAt),
      };
    });
  } catch {
    return includeUnpublished ? [] : STARTER_LEARNING_PATHS;
  }
}

export async function upsertLearningPathAdmin(
  adminUid: string,
  adminEmail: string,
  pathItem: Omit<LearningPath, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<string> {
  const id = pathItem.id?.trim() ? pathItem.id.trim().replace(/[^a-zA-Z0-9_-]/g, '-') : makeSafeId('lp');
  const path = `learningPaths/${id}`;
  try {
    const ref = doc(db, 'learningPaths', id);
    const snap = await getDoc(ref);
    const payload = {
      title: pathItem.title.trim().slice(0, 160),
      category: pathItem.category.slice(0, 80),
      level: pathItem.level,
      description: (pathItem.description || '').slice(0, 1000),
      estimatedHours: Number(pathItem.estimatedHours || 4),
      lessons: pathItem.lessons.slice(0, 50),
      isPublished: Boolean(pathItem.isPublished),
      updatedAt: serverTimestamp(),
    };
    if (!snap.exists()) {
      await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
      await logAdminAction(adminUid, adminEmail, 'CREATE_LEARNING_PATH', id, pathItem.title);
    } else {
      await updateDoc(ref, payload);
      await logAdminAction(adminUid, adminEmail, 'UPDATE_LEARNING_PATH', id, pathItem.title);
    }
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteLearningPathAdmin(adminUid: string, adminEmail: string, pathId: string): Promise<void> {
  const path = `learningPaths/${pathId}`;
  try {
    await deleteDoc(doc(db, 'learningPaths', pathId));
    await logAdminAction(adminUid, adminEmail, 'DELETE_LEARNING_PATH', pathId, 'Deleted learning path');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchLearningProgress(uid: string): Promise<LearningProgressRecord[]> {
  const path = `users/${uid}/learningProgress`;
  try {
    const snap = await getDocs(query(collection(db, path), where('userId', '==', uid), limit(50)));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId,
        pathId: data.pathId,
        pathTitle: data.pathTitle,
        completedLessonIds: Array.isArray(data.completedLessonIds) ? data.completedLessonIds : [],
        updatedAt: formatFirestoreDate(data.updatedAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveLearningProgress(
  uid: string,
  pathId: string,
  pathTitle: string,
  completedLessonIds: string[]
): Promise<void> {
  const safeId = pathId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  const path = `users/${uid}/learningProgress/${safeId}`;
  try {
    const ref = doc(db, 'users', uid, 'learningProgress', safeId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        userId: uid,
        pathId: safeId,
        pathTitle: pathTitle.slice(0, 160),
        completedLessonIds: completedLessonIds.slice(0, 100),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        completedLessonIds: completedLessonIds.slice(0, 100),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- Job Comparisons ---
export async function fetchJobComparisons(uid: string): Promise<JobComparisonRecord[]> {
  const path = `users/${uid}/jobComparisons`;
  try {
    const snap = await getDocs(
      query(collection(db, path), where('userId', '==', uid), orderBy('createdAt', 'desc'), limit(20))
    );
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId,
        title: data.title,
        jobIds: Array.isArray(data.jobIds) ? data.jobIds : [],
        createdAt: formatFirestoreDate(data.createdAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveJobComparison(uid: string, title: string, jobIds: string[]): Promise<string> {
  const id = makeSafeId('cmp');
  const path = `users/${uid}/jobComparisons/${id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'jobComparisons', id), {
      userId: uid,
      title: title.slice(0, 160),
      jobIds: jobIds.slice(0, 3),
      createdAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteJobComparison(uid: string, comparisonId: string): Promise<void> {
  const path = `users/${uid}/jobComparisons/${comparisonId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'jobComparisons', comparisonId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- User Feedback ---
export async function submitUserFeedback(
  uid: string,
  payload: Omit<UserFeedbackRecord, 'id' | 'userId' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = makeSafeId('fb');
  const path = `userFeedback/${id}`;
  try {
    await setDoc(doc(db, 'userFeedback', id), {
      userId: uid,
      name: payload.name.trim().slice(0, 120),
      email: payload.email.trim().slice(0, 200),
      category: payload.category,
      rating: Math.max(1, Math.min(5, Number(payload.rating || 5))),
      message: payload.message.trim().slice(0, 2000),
      status: 'open',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fetchUserFeedbackAdmin(): Promise<UserFeedbackRecord[]> {
  const path = 'userFeedback';
  try {
    const snap = await getDocs(query(collection(db, path), orderBy('createdAt', 'desc'), limit(100)));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId,
        name: data.name,
        email: data.email,
        category: data.category,
        rating: Number(data.rating || 5),
        message: data.message,
        status: data.status,
        adminNote: data.adminNote || '',
        createdAt: formatFirestoreDate(data.createdAt),
        updatedAt: formatFirestoreDate(data.updatedAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function updateUserFeedbackAdmin(
  adminUid: string,
  adminEmail: string,
  feedbackId: string,
  status: UserFeedbackRecord['status'],
  adminNote?: string
): Promise<void> {
  const path = `userFeedback/${feedbackId}`;
  try {
    const clean: Record<string, any> = { status, updatedAt: serverTimestamp() };
    if (adminNote !== undefined) clean.adminNote = adminNote.slice(0, 500);
    await updateDoc(doc(db, 'userFeedback', feedbackId), clean);
    await logAdminAction(adminUid, adminEmail, 'UPDATE_FEEDBACK', feedbackId, `Status set to ${status}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

