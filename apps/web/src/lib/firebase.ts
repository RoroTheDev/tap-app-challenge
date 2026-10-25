import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { normalizeSeniorProfile, normalizeTrustedContacts, type SeniorProfile, type TrustedContact } from "@tap/shared";
import { shouldFallbackToRedirect } from "./auth-flow";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);
const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isDemo?: boolean;
}

const DEMO_USER_KEY = "tap.demo-user";
const DEMO_PROFILE_KEY = "tap.demo-profile";
const DEMO_CONTACTS_KEY = "tap.demo-contacts";
const GOOGLE_REDIRECT_KEY = "tap.google-redirect-pending";

function mapUser(user: User): AppUser {
  return {
    uid: user.uid,
    email: user.email ?? "",
    displayName: user.displayName ?? user.email?.split("@")[0] ?? "TAP member",
    photoURL: user.photoURL ?? undefined,
  };
}

export function observeUser(callback: (user: AppUser | null) => void, onError?: (error: unknown) => void) {
  if (auth) {
    let stopped = false;
    const pendingRedirect = sessionStorage.getItem(GOOGLE_REDIRECT_KEY) === "true";
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (!stopped) callback(user ? mapUser(user) : null);
      },
      onError,
    );

    if (pendingRedirect) {
      void getRedirectResult(auth)
        .then((result) => {
          sessionStorage.removeItem(GOOGLE_REDIRECT_KEY);
          if (stopped) return;
          if (!result?.user && !auth.currentUser) {
            const error = new Error("Google sign-in did not finish.");
            Object.assign(error, { code: "auth/redirect-incomplete" });
            onError?.(error);
          }
        })
        .catch((error) => {
          sessionStorage.removeItem(GOOGLE_REDIRECT_KEY);
          if (stopped) return;
          onError?.(error);
        });
    } else {
      sessionStorage.removeItem(GOOGLE_REDIRECT_KEY);
    }

    return () => { stopped = true; unsubscribe(); };
  }
  const stored = localStorage.getItem(DEMO_USER_KEY);
  callback(stored ? JSON.parse(stored) : null);
  return () => undefined;
}

export async function continueWithGoogle(): Promise<AppUser | null> {
  if (auth) {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      const result = await signInWithPopup(auth, provider);
      sessionStorage.removeItem(GOOGLE_REDIRECT_KEY);
      return mapUser(result.user);
    } catch (error) {
      if (!shouldFallbackToRedirect(error)) throw error;

      sessionStorage.setItem(GOOGLE_REDIRECT_KEY, "true");
      try {
        await signInWithRedirect(auth, provider);
      } catch (redirectError) {
        sessionStorage.removeItem(GOOGLE_REDIRECT_KEY);
        throw redirectError;
      }
      return null;
    }
  }
  return createDemoUser("Alex Rivera", "alex@example.com");
}

export async function continueWithEmail(
  mode: "login" | "signup",
  email: string,
  password: string,
  displayName: string,
): Promise<AppUser> {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = displayName.trim();
  if (auth) {
    const result = mode === "signup"
      ? await createUserWithEmailAndPassword(auth, normalizedEmail, password)
      : await signInWithEmailAndPassword(auth, normalizedEmail, password);
    if (mode === "signup" && normalizedName) {
      await updateProfile(result.user, { displayName: normalizedName });
    }
    return mapUser(result.user);
  }
  return createDemoUser(normalizedName || normalizedEmail.split("@")[0], normalizedEmail);
}

function createDemoUser(displayName: string, email: string): AppUser {
  const user = { uid: "demo-user", displayName, email, isDemo: true };
  localStorage.setItem(DEMO_USER_KEY, JSON.stringify(user));
  return user;
}

export async function logOut() {
  if (auth) return signOut(auth);
  localStorage.removeItem(DEMO_USER_KEY);
}

export async function loadProfile(uid: string) {
  if (!db) {
    const profile = localStorage.getItem(DEMO_PROFILE_KEY);
    const contacts = localStorage.getItem(DEMO_CONTACTS_KEY);
    return {
      profile: profile ? (JSON.parse(profile) as SeniorProfile) : null,
      contacts: contacts ? (JSON.parse(contacts) as TrustedContact[]) : [],
    };
  }
  const [profileSnapshot, contactSnapshot] = await Promise.all([
    getDoc(doc(db, "users", uid)),
    getDocs(collection(db, "users", uid, "trustedContacts")),
  ]);
  return {
    profile: profileSnapshot.exists()
      ? normalizeSeniorProfile(profileSnapshot.data(), {
        uid,
        email: auth?.currentUser?.email ?? "",
        displayName: auth?.currentUser?.displayName ?? "TAP member",
      })
      : null,
    contacts: normalizeTrustedContacts(contactSnapshot.docs.map((item) => ({
      ...item.data(),
      id: item.id,
      uid,
    })), uid),
  };
}

export async function saveProfile(profile: SeniorProfile, contacts: TrustedContact[]) {
  if (!db) {
    localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(profile));
    localStorage.setItem(DEMO_CONTACTS_KEY, JSON.stringify(contacts));
    return;
  }

  const profileRef = doc(db, "users", profile.uid);
  const contactsRef = collection(db, "users", profile.uid, "trustedContacts");
  const [existing, existingContacts] = await Promise.all([
    getDoc(profileRef),
    getDocs(contactsRef),
  ]);
  const batch = writeBatch(db);
  batch.set(profileRef, {
    ...profile,
    createdAt: existing.data()?.createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const incomingIds = new Set(contacts.map((contact) => contact.id));
  const existingById = new Map(existingContacts.docs.map((item) => [item.id, item.data()]));
  existingContacts.forEach((item) => {
    if (!incomingIds.has(item.id)) batch.delete(item.ref);
  });
  contacts.forEach((contact) => {
    const contactRef = doc(contactsRef, contact.id);
    batch.set(contactRef, {
      ...contact,
      createdAt: existingById.get(contact.id)?.createdAt ?? serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

export async function deleteProfile(uid: string) {
  if (!db) {
    localStorage.removeItem(DEMO_PROFILE_KEY);
    localStorage.removeItem(DEMO_CONTACTS_KEY);
    return;
  }
  const contacts = await getDocs(collection(db, "users", uid, "trustedContacts"));
  const batch = writeBatch(db);
  contacts.forEach((item) => batch.delete(item.ref));
  batch.delete(doc(db, "users", uid));
  await batch.commit();
}
