import React, { useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  auth,
  signInWithGoogle,
  signOutUser,
  saveUserInteraction,
  subscribeUserInteractions,
  deleteUserInteraction,
} from './lib/firebase';
import { JournalEntry, JournalMessage, ReflectionMode, UserProfile } from './types';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { HistorySidebar } from './components/HistorySidebar';
import { ReflectionWorkspace } from './components/ReflectionWorkspace';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Keep a ref of the pending save entry in case retry is needed
  const pendingSaveEntryRef = useRef<JournalEntry | null>(null);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: User | null) => {
      if (firebaseUser) {
        setCurrentUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });
      } else {
        setCurrentUser(null);
        setEntries([]);
        setActiveEntryId(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to user's isolated Firestore collection when authenticated
  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubscribe = subscribeUserInteractions(
      currentUser.uid,
      (fetchedEntries) => {
        setEntries((prev) => {
          // If the user already has an active unsaved draft session, keep it at the top
          const activeDraft = prev.find((e) => e.messages.length === 0);
          if (activeDraft && !fetchedEntries.some((e) => e.id === activeDraft.id)) {
            return [activeDraft, ...fetchedEntries];
          }
          // If user has zero entries in Firestore and local state is empty, create an initial draft
          if (fetchedEntries.length === 0 && prev.length === 0) {
            const initialId = crypto.randomUUID();
            const initialDraft: JournalEntry = {
              id: initialId,
              userId: currentUser.uid,
              title: 'New Reflection',
              createdAt: Date.now(),
              updatedAt: Date.now(),
              mode: 'reflect',
              messages: [],
            };
            setActiveEntryId(initialId);
            return [initialDraft];
          }
          return fetchedEntries;
        });

        // If there is no active entry, default to the most recently updated entry
        setActiveEntryId((prevId) => {
          if (prevId) return prevId;
          return fetchedEntries.length > 0 ? fetchedEntries[0].id : null;
        });
      },
      (error) => {
        console.error('Firestore subscription error:', error);
        setSaveError('Failed to synchronize journal entries with Firestore.');
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Create a brand new reflection draft
  const handleNewEntry = useCallback((initialMode: ReflectionMode = 'reflect') => {
    const newId = crypto.randomUUID();
    const newEntry: JournalEntry = {
      id: newId,
      userId: currentUser?.uid || '',
      title: 'Untitled Reflection',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      mode: initialMode,
      messages: [],
    };

    setEntries((prev) => [newEntry, ...prev.filter((e) => e.messages.length > 0)]);
    setActiveEntryId(newId);
    setSaveError(null);
  }, [currentUser?.uid]);

  // Get active entry
  const activeEntry = entries.find((e) => e.id === activeEntryId) || null;

  // Update reflection mode (supports active entry and fresh/empty sessions)
  const handleUpdateMode = useCallback(
    async (mode: ReflectionMode) => {
      if (!currentUser?.uid) return;

      if (activeEntry) {
        const updated: JournalEntry = { ...activeEntry, mode, updatedAt: Date.now() };
        setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
        if (updated.messages.length > 0) {
          try {
            await saveUserInteraction(currentUser.uid, updated);
          } catch (err: any) {
            console.warn('Failed to update mode in Firestore:', err);
          }
        }
      } else {
        // No active entry yet (e.g. freshly logged in user without saved entries)
        const newId = crypto.randomUUID();
        const newEntry: JournalEntry = {
          id: newId,
          userId: currentUser.uid,
          title: 'Untitled Reflection',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          mode,
          messages: [],
        };
        setEntries((prev) => [newEntry, ...prev]);
        setActiveEntryId(newId);
      }
    },
    [activeEntry, currentUser?.uid]
  );

  // Update title
  const handleUpdateTitle = useCallback(
    async (newTitle: string) => {
      if (!activeEntry || !currentUser?.uid) return;
      const updated = { ...activeEntry, title: newTitle, updatedAt: Date.now() };
      setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      try {
        await saveUserInteraction(currentUser.uid, updated);
      } catch (err: any) {
        console.warn('Failed to update title in Firestore:', err);
      }
    },
    [activeEntry, currentUser?.uid]
  );

  // Send message and converse with Gemini
  const handleSendMessage = async (text: string, mode: ReflectionMode) => {
    if (!currentUser?.uid) {
      throw new Error('User must be logged in to reflect.');
    }

    setSaveError(null);

    // Ensure we have an active entry
    let targetEntry: JournalEntry;
    if (!activeEntry) {
      const newId = crypto.randomUUID();
      targetEntry = {
        id: newId,
        userId: currentUser.uid,
        title: text.slice(0, 36) + (text.length > 36 ? '...' : ''),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        mode,
        messages: [],
      };
      setEntries((prev) => [targetEntry, ...prev]);
      setActiveEntryId(newId);
    } else {
      targetEntry = activeEntry;
    }

    const userMessage: JournalMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    // Auto-generate title if currently default
    let updatedTitle = targetEntry.title;
    if (
      (!targetEntry.title || targetEntry.title === 'Untitled Reflection' || targetEntry.title === 'New Reflection') &&
      text.trim().length > 0
    ) {
      const firstLine = text.trim().split('\n')[0];
      updatedTitle = firstLine.slice(0, 42) + (firstLine.length > 42 ? '...' : '');
    }

    const intermediateEntry: JournalEntry = {
      ...targetEntry,
      title: updatedTitle,
      mode,
      updatedAt: Date.now(),
      messages: [...targetEntry.messages, userMessage],
    };

    // Optimistically update local state with user's message
    setEntries((prev) => prev.map((e) => (e.id === intermediateEntry.id ? intermediateEntry : e)));
    setIsGenerating(true);

    try {
      // Format chat history for Gemini multi-turn reflection
      const historyPayload = intermediateEntry.messages.slice(0, -1).map((m) => ({
        role: m.role,
        text: m.content,
      }));

      const res = await fetch('/api/gemini/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          mode,
          history: historyPayload,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();
      const modelMessage: JournalMessage = {
        id: crypto.randomUUID(),
        role: 'model',
        content: data.response,
        timestamp: Date.now(),
        modelUsed: data.modelUsed,
      };

      const finalEntry: JournalEntry = {
        ...intermediateEntry,
        updatedAt: Date.now(),
        messages: [...intermediateEntry.messages, modelMessage],
      };

      // Update state with Gemini's response
      setEntries((prev) => prev.map((e) => (e.id === finalEntry.id ? finalEntry : e)));

      // Guaranteed Transaction Verification: persist user input AND Gemini response to Firestore
      setIsSaving(true);
      pendingSaveEntryRef.current = finalEntry;
      await saveUserInteraction(currentUser.uid, finalEntry);
      pendingSaveEntryRef.current = null;
    } catch (err: any) {
      console.error('Reflection interaction failed:', err);
      setSaveError(err?.message || 'Failed to complete reflection or persist to Firestore.');
      throw err;
    } finally {
      setIsGenerating(false);
      setIsSaving(false);
    }
  };

  // Retry save operation if previous write failed
  const handleRetrySave = async () => {
    if (!currentUser?.uid || !pendingSaveEntryRef.current) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await saveUserInteraction(currentUser.uid, pendingSaveEntryRef.current);
      pendingSaveEntryRef.current = null;
    } catch (err: any) {
      console.error('Retry save failed:', err);
      setSaveError(err?.message || 'Retry save failed. Please check network connection.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete an interaction entry
  const handleDeleteEntry = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser?.uid) return;
    const confirmDelete = window.confirm('Are you sure you want to delete this reflection? This action cannot be undone.');
    if (!confirmDelete) return;

    try {
      await deleteUserInteraction(currentUser.uid, id);
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
      if (activeEntryId === id) {
        const remaining = entries.filter((entry) => entry.id !== id);
        setActiveEntryId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err: any) {
      console.error('Failed to delete entry:', err);
      setSaveError('Failed to delete entry from Firestore.');
    }
  };

  // Handle Google Sign-in
  const handleSignIn = async () => {
    await signInWithGoogle();
  };

  // Handle Sign-out
  const handleSignOut = async () => {
    await signOutUser();
  };

  // Initial loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-300">Verifying authentication session...</p>
      </div>
    );
  }

  // Not authenticated: Render Landing Page
  if (!currentUser) {
    return <LandingPage onSignIn={handleSignIn} />;
  }

  // Authenticated Dashboard
  return (
    <div className="h-screen flex flex-col bg-slate-950/30 backdrop-blur-2xl overflow-hidden">
      {/* Top Header */}
      <Header
        user={currentUser}
        onSignOut={handleSignOut}
        onToggleSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        isSaving={isSaving}
      />

      {/* Main App Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Reflection History */}
        <HistorySidebar
          entries={entries}
          activeEntryId={activeEntryId}
          onSelectEntry={(id) => setActiveEntryId(id)}
          onNewEntry={handleNewEntry}
          onDeleteEntry={handleDeleteEntry}
          isOpenOnMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Right Workspace: Active Multi-Turn Reflection */}
        <ReflectionWorkspace
          entry={activeEntry}
          onSendMessage={handleSendMessage}
          onUpdateTitle={handleUpdateTitle}
          onUpdateMode={handleUpdateMode}
          onRetrySave={handleRetrySave}
          isGenerating={isGenerating}
          saveError={saveError}
          isSaving={isSaving}
        />
      </div>
    </div>
  );
}
