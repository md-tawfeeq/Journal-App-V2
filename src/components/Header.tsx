import React from 'react';
import { UserProfile } from '../types';
import { Sparkles, Database, LogOut, BookOpen, ShieldCheck, Menu } from 'lucide-react';

interface HeaderProps {
  user: UserProfile;
  onSignOut: () => void;
  onToggleSidebar?: () => void;
  isSaving?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onSignOut,
  onToggleSidebar,
  isSaving = false,
}) => {
  return (
    <header
      id="app-header"
      className="sticky top-0 z-30 bg-slate-900/40 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-3 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)]"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Mobile menu & Brand */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              id="btn-toggle-sidebar"
              onClick={onToggleSidebar}
              className="md:hidden p-2 text-slate-300 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 rounded-lg transition"
              aria-label="Toggle Navigation History"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.35)] border border-indigo-400/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-base tracking-tight">
                  Gemini Reflect
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium bg-indigo-500/15 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-400/20 shadow-xs">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  Gemini 3.6 Flash
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Authenticated Journal & AI Reflections
              </p>
            </div>
          </div>
        </div>

        {/* Center/Right: Security status + User profile + Logout */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Firestore Status indicator */}
          <div
            id="firestore-status-badge"
            className="hidden lg:flex items-center gap-1.5 text-xs text-slate-300 bg-white/[0.04] border border-white/10 px-2.5 py-1 rounded-full backdrop-blur-md"
            title="Isolated Firestore collection: /users/{userId}/interactions"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium text-slate-400">Firestore:</span>
            {isSaving ? (
              <span className="text-amber-400 font-medium animate-pulse">Syncing...</span>
            ) : (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> User Isolated
              </span>
            )}
          </div>

          {/* User profile */}
          <div className="flex items-center gap-2.5 bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 rounded-full pl-1.5 pr-3 py-1 backdrop-blur-md transition">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User Avatar'}
                className="w-7 h-7 rounded-full object-cover ring-1 ring-white/20"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-indigo-600/40 text-indigo-200 border border-indigo-400/30 font-semibold text-xs flex items-center justify-center">
                {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="text-left hidden sm:block max-w-[140px] truncate">
              <p className="text-xs font-medium text-slate-200 truncate">
                {user.displayName || 'Reflective Journaler'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
            </div>
          </div>

          {/* Sign out button */}
          <button
            id="btn-sign-out"
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-rose-300 hover:bg-rose-500/15 bg-white/[0.04] border border-white/10 hover:border-rose-500/30 rounded-lg backdrop-blur-md transition shadow-xs cursor-pointer"
            title="Sign out of Firebase Auth"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
