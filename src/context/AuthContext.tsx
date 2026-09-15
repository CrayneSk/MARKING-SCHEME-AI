import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, PlanType } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateUserPlan: (newPlan: PlanType, billingCycle: 'monthly' | 'yearly', paymentRef: string) => Promise<void>;
  incrementUsage: () => Promise<boolean>;
  recordGenerationUsage: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Known admin emails or first user detection
const ADMIN_EMAILS = [
  'czytechnology00@gmail.com', // Active session email
  'admin@sktechnologies.co.zw',
  'sktechnologies@gmail.com'
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrCreateProfile = async (firebaseUser: User): Promise<UserProfile> => {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const snap = await getDoc(userDocRef);

    const isAdmin = Boolean(
      (firebaseUser.email && ADMIN_EMAILS.includes(firebaseUser.email.toLowerCase())) ||
      (firebaseUser.email && firebaseUser.email.toLowerCase().includes('admin'))
    );

    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      // Auto upgrade admin role if email matches
      if (isAdmin && data.role !== 'admin') {
        await updateDoc(userDocRef, { role: 'admin' });
        data.role = 'admin';
      }
      return data;
    } else {
      const newProfile: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Teacher',
        role: isAdmin ? 'admin' : 'teacher',
        plan: 'Focus', // Free tier name
        generationsUsed: 0,
        freeGenerationsLimit: 1,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      };
      await setDoc(userDocRef, newProfile);
      return newProfile;
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const prof = await fetchOrCreateProfile(user);
      setProfile(prof);
    } catch (err) {
      console.error('Failed refreshing profile:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const p = await fetchOrCreateProfile(firebaseUser);
          setProfile(p);
        } catch (err) {
          console.error('Error loading user profile:', err);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signupWithEmail = async (email: string, pass: string, name?: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const userDocRef = doc(db, 'users', cred.user.uid);
    const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase()) || email.toLowerCase().includes('admin');
    const newProfile: UserProfile = {
      uid: cred.user.uid,
      email: cred.user.email || email,
      displayName: name || email.split('@')[0],
      role: isAdmin ? 'admin' : 'teacher',
      plan: 'Focus',
      generationsUsed: 0,
      freeGenerationsLimit: 1,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };
    await setDoc(userDocRef, newProfile);
    setProfile(newProfile);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
  };

  const updateUserPlan = async (newPlan: PlanType, billingCycle: 'monthly' | 'yearly', paymentRef: string) => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    const expiry = new Date();
    if (billingCycle === 'yearly') {
      expiry.setFullYear(expiry.getFullYear() + 1);
    } else {
      expiry.setMonth(expiry.getMonth() + 1);
    }

    const updates: Partial<UserProfile> = {
      plan: newPlan,
      billingCycle,
      paymentRef,
      subscriptionExpiry: expiry.toISOString(),
    };

    await updateDoc(userDocRef, updates);
    await refreshProfile();
  };

  const incrementUsage = async (): Promise<boolean> => {
    if (!user || !profile) return false;

    // Check if user has active paid plan or free limit left
    const isPaid = profile.plan === 'Flow' || profile.plan === 'Full';
    if (!isPaid && profile.generationsUsed >= profile.freeGenerationsLimit) {
      return false; // Out of quota
    }

    const userDocRef = doc(db, 'users', user.uid);
    const newUsed = (profile.generationsUsed || 0) + 1;
    await updateDoc(userDocRef, {
      generationsUsed: newUsed,
      lastActiveAt: new Date().toISOString(),
    });
    setProfile(prev => prev ? { ...prev, generationsUsed: newUsed } : null);
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        loginWithEmail,
        signupWithEmail,
        loginWithGoogle,
        logout,
        refreshProfile,
        updateUserPlan,
        incrementUsage,
        recordGenerationUsage: incrementUsage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
