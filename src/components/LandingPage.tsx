import React, { useState } from 'react';
import { BookOpen, Sparkles, Shield, Database, ArrowRight, Lock, CheckCircle2, MessageSquare, Brain } from 'lucide-react';

interface LandingPageProps {
  onSignIn: () => Promise<void>;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn }) => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await onSignIn();
    } catch (err: any) {
      console.error('Sign in failed:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in popup was closed before completing. Please try again.');
      } else if (err?.code === 'auth/popup-blocked') {
        setAuthError('Sign-in popup was blocked by your browser. Please allow popups for this site and try again.');
      } else {
        setAuthError(err?.message || 'Authentication failed. Please verify your internet connection and try again.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950/40 backdrop-blur-3xl text-slate-100 flex flex-col justify-between">
      {/* Top minimal header */}
      <header className="w-full border-b border-white/10 bg-slate-950/40 backdrop-blur-xl sticky top-0 z-20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.3)] border border-indigo-400/30">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="font-semibold text-white text-base tracking-tight">
              Gemini Reflect & Journal
            </span>
          </div>

          <button
            id="nav-signin-btn"
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-200 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 rounded-xl backdrop-blur-md shadow-xs transition disabled:opacity-60 cursor-pointer"
          >
            <Shield className="w-4 h-4 text-indigo-400" />
            <span>Sign In</span>
          </button>
        </div>
      </header>

      {/* Hero section */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 flex flex-col items-center text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/25 text-indigo-300 text-xs font-medium mb-6 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Powered by Gemini 3.6 Flash & Cloud Firestore</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight max-w-3xl leading-tight sm:leading-tight mb-4">
          A thoughtful, private space for your thoughts & reflections.
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed mb-8">
          Write unfiltered daily reflections, converse with Gemini 3.6 Flash for cognitive reframing or brainstorming, and store every interaction in user-isolated Cloud Firestore.
        </p>

        {/* Error notice if popup was closed or blocked */}
        {authError && (
          <div
            id="auth-error-banner"
            className="w-full max-w-md p-4 mb-6 text-sm text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-2xl backdrop-blur-md text-left flex items-start gap-3"
          >
            <Lock className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Sign-in Notice</p>
              <p className="text-rose-300/80 text-xs mt-0.5">{authError}</p>
            </div>
          </div>
        )}

        {/* Sign In CTA Button */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md justify-center mb-12">
          <button
            id="hero-google-signin-btn"
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="w-full sm:w-auto min-w-[240px] px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-medium rounded-2xl shadow-[0_0_25px_rgba(99,102,241,0.35),inset_0_1px_0_0_rgba(255,255,255,0.2)] border border-indigo-400/30 hover:border-indigo-300/40 transition flex items-center justify-center gap-3 text-base disabled:opacity-75 cursor-pointer"
          >
            {isSigningIn ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Connecting with Google...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left mt-4">
          <div className="p-6 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-2xl backdrop-blur-xl shadow-[0_4px_25px_-5px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.08)] flex flex-col justify-between transition">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center justify-center mb-4">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h2 className="text-base font-semibold text-white mb-2">
                Multi-Turn Reflections
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Engage in genuine, adaptive multi-turn conversations. Gemini maintains session context to explore nuances, unblock thinking, and provide empathetic perspectives.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-xs font-medium text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Full chat history preserved</span>
            </div>
          </div>

          <div className="p-6 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-2xl backdrop-blur-xl shadow-[0_4px_25px_-5px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.08)] flex flex-col justify-between transition">
            <div>
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-400/30 flex items-center justify-center mb-4">
                <Brain className="w-5 h-5" />
              </div>
              <h2 className="text-base font-semibold text-white mb-2">
                Modes: Brainstorm & Summary
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Seamlessly toggle between deep reflection, structured executive summaries, and lateral creative brainstorming for complex problems or daily logs.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-xs font-medium text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Tailored system instructions</span>
            </div>
          </div>

          <div className="p-6 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-2xl backdrop-blur-xl shadow-[0_4px_25px_-5px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.08)] flex flex-col justify-between transition">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center justify-center mb-4">
                <Shield className="w-5 h-5" />
              </div>
              <h2 className="text-base font-semibold text-white mb-2">
                User-Isolated Firestore
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Rigid owner-bound security rules ensure your reflections are strictly locked to your UID. No other user or unauthorized request can access your data.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-xs font-medium text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Zero cross-user data leakage</span>
            </div>
          </div>
        </div>
      </main>

      {/* Minimal footer */}
      <footer className="w-full border-t border-white/10 bg-slate-950/40 backdrop-blur-xl py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <span>Gemini Reflect & Journal</span>
            <span>•</span>
            <span>Firebase Authentication & Cloud Firestore</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>End-to-end user isolation by authenticated identity</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
