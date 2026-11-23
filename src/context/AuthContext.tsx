import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  formatFirestoreDate,
  googleProvider,
  handleFirestoreError,
  OperationType,
  testConnection,
} from '../lib/firebase';
import type { NotificationItem, SavedJob, SubscriptionRecord, UserProfile } from '../types';
import {
  fetchVerifiedJobs,
  syncMatchingJobAlertsForUser,
} from '../services/firestoreService';
import { useLanguage } from './LanguageContext';

const BOOTSTRAP_ADMIN_EMAIL = 'prince.nuv.bca@gmail.com';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  subscription: SubscriptionRecord | null;
  savedJobs: SavedJob[];
  notifications: NotificationItem[];
  isAdmin: boolean;
  authReady: boolean;
  firestoreConnected: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, password: string, consent: boolean) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [firestoreConnected, setFirestoreConnected] = useState(true);
  const lastAlertSyncUidRef = React.useRef<string>('');
  const { language, setLanguage } = useLanguage();

  useEffect(() => {
    testConnection().then((ok) => setFirestoreConnected(ok));
  }, []);

  const ensureUserRecords = async (fbUser: User) => {
    const userPath = `users/${fbUser.uid}`;
    try {
      const userRef = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists() && fbUser.emailVerified) {
        const initialProfile = {
          uid: fbUser.uid,
          name: (fbUser.displayName || fbUser.email?.split('@')[0] || 'Candidate').slice(0, 120),
          email: (fbUser.email || '').slice(0, 200),
          photoURL: (fbUser.photoURL || '').slice(0, 500),
          phone: '',
          location: '',
          linkedin: '',
          portfolio: '',
          summary: '',
          certifications: [],
          preferredLanguage: language,
          education: '',
          qualification: '',
          skills: [],
          experience: 0,
          preferredLocations: [],
          preferredCategories: [],
          status: 'active',
          consentGiven: true,
          notificationPrefs: {
            matchingJobs: true,
            deadlines: true,
            interviews: true,
            resumeReminders: true,
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(userRef, initialProfile);
        setProfile({
          ...initialProfile,
          preferredLanguage: language,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else if (snap.exists()) {
        const data = snap.data();
        const loaded: UserProfile = {
          uid: data.uid,
          name: data.name || fbUser.displayName || '',
          email: data.email || fbUser.email || '',
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
        setProfile(loaded);
        if (loaded.preferredLanguage) {
          setLanguage(loaded.preferredLanguage);
        }
      }

      // Check subscription
      if (fbUser.emailVerified) {
        const subRef = doc(db, 'subscriptions', fbUser.uid);
        const subSnap = await getDoc(subRef);
        if (!subSnap.exists()) {
          const initSub = {
            userId: fbUser.uid,
            plan: 'free' as const,
            status: 'active' as const,
            aiQueriesUsed: 0,
            eligibilityChecksUsed: 0,
            updatedAt: serverTimestamp(),
          };
          await setDoc(subRef, initSub);
          setSubscription({
            userId: fbUser.uid,
            plan: 'free',
            status: 'active',
            aiQueriesUsed: 0,
            eligibilityChecksUsed: 0,
            updatedAt: new Date().toISOString(),
          });
        } else {
          const s = subSnap.data();
          setSubscription({
            userId: s.userId,
            plan: s.plan === 'pro' ? 'pro' : 'free',
            status: s.status || 'active',
            aiQueriesUsed: Number(s.aiQueriesUsed || 0),
            eligibilityChecksUsed: Number(s.eligibilityChecksUsed || 0),
            updatedAt: formatFirestoreDate(s.updatedAt),
          });
        }
      }

      // Check server-verified admin status
      let adminStatus =
        fbUser.emailVerified === true && fbUser.email === BOOTSTRAP_ADMIN_EMAIL;
      if (!adminStatus) {
        const adminDoc = await getDoc(doc(db, 'admins', fbUser.uid));
        adminStatus = adminDoc.exists() && fbUser.emailVerified === true;
      }
      setIsAdmin(adminStatus);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, userPath);
    }
  };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        try {
          await ensureUserRecords(fbUser);
        } catch (err) {
          console.error('Error initializing user profile:', err);
        }
      } else {
        setProfile(null);
        setSubscription(null);
        setSavedJobs([]);
        setNotifications([]);
        setNotificationsLoaded(false);
        lastAlertSyncUidRef.current = '';
        setIsAdmin(false);
      }
      setAuthReady(true);
    });
    return () => unsubAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Attach authenticated real-time listeners only after authReady && user
  useEffect(() => {
    if (!authReady || !user) return;

    const savedPath = `users/${user.uid}/savedJobs`;
    const savedQuery = query(
      collection(db, savedPath),
      where('userId', '==', user.uid),
      orderBy('savedAt', 'desc')
    );
    const unsubSaved = onSnapshot(
      savedQuery,
      (snap) => {
        setSavedJobs(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              userId: data.userId,
              jobId: data.jobId,
              jobTitle: data.jobTitle,
              organization: data.organization,
              deadline: data.deadline || '',
              savedAt: formatFirestoreDate(data.savedAt),
            };
          })
        );
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, savedPath);
      }
    );

    const notifPath = `users/${user.uid}/notifications`;
    const notifQuery = query(
      collection(db, notifPath),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubNotif = onSnapshot(
      notifQuery,
      (snap) => {
        setNotifications(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              userId: data.userId,
              type: data.type,
              title: data.title,
              message: data.message,
              link: data.link || '',
              read: Boolean(data.read),
              createdAt: formatFirestoreDate(data.createdAt),
            };
          })
        );
        setNotificationsLoaded(true);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, notifPath);
      }
    );

    return () => {
      unsubSaved();
      unsubNotif();
    };
  }, [authReady, user]);

  // Auto-sync new matching jobs into simulated in-app email notifications once per session
  useEffect(() => {
    if (!authReady || !user || !user.emailVerified || !notificationsLoaded || !profile) return;
    if (lastAlertSyncUidRef.current === user.uid) return;
    const enabled =
      profile.notificationPrefs?.matchingJobs !== false &&
      profile.notificationPrefs?.jobAlertEmailEnabled !== false;
    const cats = profile.preferredCategories || [];
    if (!enabled || cats.length === 0) return;

    lastAlertSyncUidRef.current = user.uid;
    fetchVerifiedJobs()
      .then((res) =>
        syncMatchingJobAlertsForUser(
          user.uid,
          user.email || profile.email,
          cats,
          notifications,
          res.jobs,
          3
        )
      )
      .catch(() => {
        // Non-blocking background job alert check
      });
  }, [authReady, user, notificationsLoaded, profile, notifications]);

  const loginWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const loginWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const registerWithEmail = async (
    name: string,
    email: string,
    password: string,
    consent: boolean
  ) => {
    if (!consent) {
      throw new Error('Please review and accept the privacy consent before registering.');
    }
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(cred.user, { displayName: name.trim().slice(0, 120) });
    await sendEmailVerification(cred.user);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const resendVerificationEmail = async () => {
    if (auth.currentUser && !auth.currentUser.emailVerified) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const refreshProfile = async () => {
    if (auth.currentUser) {
      await ensureUserRecords(auth.currentUser);
    }
  };

  const getIdToken = async (): Promise<string | null> => {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        subscription,
        savedJobs,
        notifications,
        isAdmin,
        authReady,
        firestoreConnected,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        resetPassword,
        resendVerificationEmail,
        logout,
        refreshProfile,
        getIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
