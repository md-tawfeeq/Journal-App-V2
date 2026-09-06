import React, { useState } from 'react';
import { JournalEntry, ReflectionMode } from '../types';
import { Plus, Search, Trash2, Calendar, MessageSquare, Sparkles, Brain, FileText, ChevronRight, X } from 'lucide-react';

interface HistorySidebarProps {
  entries: JournalEntry[];
  activeEntryId: string | null;
  onSelectEntry: (id: string) => void;
  onNewEntry: () => void;
  onDeleteEntry: (id: string, e: React.MouseEvent) => void;
  isOpenOnMobile?: boolean;
  onCloseMobile?: () => void;
}

const MODE_CONFIG: Record<ReflectionMode, { label: string; icon: React.ReactNode; color: string }> = {
  reflect: {
    label: 'Reflect',
    icon: <Sparkles className="w-3 h-3" />,
    color: 'bg-indigo-500/15 text-indigo-300 border-indigo-400/25',
  },
  summarize: {
    label: 'Summary',
    icon: <FileText className="w-3 h-3" />,
    color: 'bg-amber-500/15 text-amber-300 border-amber-400/25',
  },
  brainstorm: {
    label: 'Brainstorm',
    icon: <Brain className="w-3 h-3" />,
    color: 'bg-violet-500/15 text-violet-300 border-violet-400/25',
  },
  chat: {
    label: 'Chat',
    icon: <MessageSquare className="w-3 h-3" />,
    color: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/25',
  },
};

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  entries,
  activeEntryId,
  onSelectEntry,
  onNewEntry,
  onDeleteEntry,
  isOpenOnMobile = false,
  onCloseMobile,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      searchTerm.trim() === '' ||
      entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.messages.some((m) => m.content.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter = selectedFilter === 'all' || entry.mode === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenOnMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/70 z-40 md:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      <aside
        id="history-sidebar"
        className={`fixed md:static inset-y-0 left-0 z-50 md:z-0 w-80 bg-slate-950/70 md:bg-white/[0.02] backdrop-blur-xl border-r border-white/10 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpenOnMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } shrink-0 h-full`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between gap-2">
          <button
            id="btn-new-reflection"
            onClick={() => {
              onNewEntry();
              if (onCloseMobile) onCloseMobile();
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-sm font-medium rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.25)] border border-indigo-400/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Reflection</span>
          </button>

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search & Filter */}
        <div className="p-3 border-b border-white/10 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-history"
              type="text"
              placeholder="Search reflections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white/[0.04] border border-white/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400/40 focus:bg-white/[0.07] transition text-slate-100 placeholder-slate-400"
            />
          </div>

          {/* Quick filter tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] no-scrollbar">
            {['all', 'reflect', 'summarize', 'brainstorm', 'chat'].map((mode) => (
              <button
                key={mode}
                onClick={() => setSelectedFilter(mode)}
                className={`px-2.5 py-1 rounded-md font-medium capitalize shrink-0 transition border ${
                  selectedFilter === mode
                    ? 'bg-white/15 text-white border-white/20 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] border-transparent'
                }`}
              >
                {mode === 'all' ? 'All' : mode}
              </button>
            ))}
          </div>
        </div>

        {/* List of past entries */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredEntries.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <Calendar className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-60" />
              <p className="text-xs font-medium text-slate-300">No reflections found</p>
              <p className="text-[11px] text-slate-500 mt-1">
                {searchTerm
                  ? 'Try a different search query'
                  : 'Start your first journal entry or reflection'}
              </p>
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const isActive = activeEntryId === entry.id;
              const modeCfg = MODE_CONFIG[entry.mode] || MODE_CONFIG.reflect;
              const firstSnippet =
                entry.messages && entry.messages[0]?.content
                  ? entry.messages[0].content
                  : 'Empty entry';
              const turnCount = entry.messages ? entry.messages.length : 0;

              return (
                <div
                  key={entry.id}
                  id={`history-item-${entry.id}`}
                  onClick={() => {
                    onSelectEntry(entry.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`group relative w-full text-left p-3 rounded-xl border transition cursor-pointer flex flex-col gap-1.5 ${
                    isActive
                      ? 'bg-white/[0.09] border-indigo-400/40 text-white shadow-[0_0_20px_rgba(99,102,241,0.15),inset_0_1px_0_0_rgba(255,255,255,0.15)]'
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.06] hover:border-white/15 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border ${modeCfg.color}`}
                    >
                      {modeCfg.icon}
                      {modeCfg.label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatDate(entry.updatedAt || entry.createdAt)}
                    </span>
                  </div>

                  <h3 className="text-xs font-semibold text-slate-100 truncate pr-6">
                    {entry.title || 'Untitled Reflection'}
                  </h3>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {firstSnippet}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {turnCount} {turnCount === 1 ? 'interaction' : 'interactions'}
                    </span>

                    {/* Delete button */}
                    <button
                      id={`delete-entry-${entry.id}`}
                      onClick={(e) => onDeleteEntry(entry.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 rounded transition"
                      title="Delete entry from Firestore"
                      aria-label="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-white/10 bg-white/[0.02] backdrop-blur-md text-[11px] text-slate-400 flex items-center justify-between">
          <span>{entries.length} Total Saved</span>
          <span className="font-mono text-[10px] text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-400/25">
            Encrypted in Firestore
          </span>
        </div>
      </aside>
    </>
  );
};
