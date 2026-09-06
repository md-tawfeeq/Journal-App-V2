import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { JournalEntry } from "../types";

// Initialize Firebase App instance safely
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

// Initialize Firestore with specific database ID if configured
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Zero-Crash Undefined-Stripping Hygiene
export function sanitizePayload<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizePayload(item)) as any;
  }
  if (obj !== null && typeof obj === "object") {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = sanitizePayload(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

// Authentication Helpers
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Firebase Auth Error:", error);
    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

// Firestore Isolated User Collection Operations (/users/{userId}/interactions/{interactionId})
export async function saveUserInteraction(userId: string, entry: JournalEntry): Promise<void> {
  if (!userId) {
    throw new Error("Cannot save entry: User ID is required for data isolation.");
  }
  if (!entry.id) {
    throw new Error("Cannot save entry: Entry ID is missing.");
  }

  const docRef = doc(db, "users", userId, "interactions", entry.id);
  const sanitized = sanitizePayload({
    ...entry,
    userId, // Enforce owner ID matching
    updatedAt: Date.now(),
  });

  await setDoc(docRef, sanitized, { merge: true });
}

export function subscribeUserInteractions(
  userId: string,
  onUpdate: (entries: JournalEntry[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const interactionsRef = collection(db, "users", userId, "interactions");
  const q = query(interactionsRef, orderBy("updatedAt", "desc"));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const list: JournalEntry[] = [];
      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data() as JournalEntry;
        list.push({
          ...data,
          id: docSnapshot.id,
        });
      });
      onUpdate(list);
    },
    (err) => {
      console.error("[Firestore Subscription Error]:", err);
      if (onError) onError(err);
    }
  );

  return unsubscribe;
}

export async function deleteUserInteraction(userId: string, interactionId: string): Promise<void> {
  if (!userId || !interactionId) {
    throw new Error("User ID and Interaction ID are required to delete entry.");
  }
  const docRef = doc(db, "users", userId, "interactions", interactionId);
  await deleteDoc(docRef);
}
