import React, { useState, useRef, useEffect } from 'react';
import { JournalEntry, JournalMessage, ReflectionMode } from '../types';
import { MarkdownView } from './MarkdownView';
import {
  Sparkles,
  Send,
  FileText,
  Brain,
  MessageSquare,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  Edit2,
  Bookmark,
  Compass,
} from 'lucide-react';

interface ReflectionWorkspaceProps {
  entry: JournalEntry | null;
  onSendMessage: (text: string, mode: ReflectionMode) => Promise<void>;
  onUpdateTitle: (title: string) => Promise<void>;
  onUpdateMode: (mode: ReflectionMode) => void;
  onRetrySave?: () => Promise<void>;
  isGenerating: boolean;
  saveError: string | null;
  isSaving: boolean;
}

const PROMPT_STARTERS: Array<{ title: string; text: string; mode: ReflectionMode }> = [
  {
    title: 'Daily Evening Review',
    text: 'Today went unexpectedly fast. I spent most of my time reacting to emergencies instead of focusing on deep work. How can I regain agency over my schedule tomorrow?',
    mode: 'reflect',
  },
  {
    title: 'Executive Summary',
    text: 'Here is what happened today: 3 back-to-back stakeholder meetings, unresolved debate over database migrations, and a successful bug fix in the authentication pipeline. Please summarize the key outcomes, emotional state, and 3 clear next steps.',
    mode: 'summarize',
  },
  {
    title: 'Creative Brainstorm',
    text: 'I want to build a tool that helps creative writers overcome blank page anxiety. Brainstorm 5 unique, non-cliché product concepts or feature angles.',
    mode: 'brainstorm',
  },
  {
    title: 'Difficult Decision',
    text: 'I have two competing offers: one with a fast-growing startup offering high equity and autonomy, and one at an established tech leader offering high stability and mentorship. Help me reflect on the underlying trade-offs.',
    mode: 'reflect',
  },
];

export const ReflectionWorkspace: React.FC<ReflectionWorkspaceProps> = ({
  entry,
  onSendMessage,
  onUpdateTitle,
  onUpdateMode,
  onRetrySave,
  isGenerating,
  saveError,
  isSaving,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(entry?.title || '');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [localMode, setLocalMode] = useState<ReflectionMode>(entry?.mode || 'reflect');

  // Sync title and mode values when active entry changes
  useEffect(() => {
    setTitleValue(entry?.title || '');
    setIsEditingTitle(false);
    if (entry?.mode) {
      setLocalMode(entry.mode);
    }
  }, [entry?.id, entry?.title, entry?.mode]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entry?.messages?.length, isGenerating]);

  const activeMode: ReflectionMode = entry?.mode || localMode;

  const handleSelectMode = (newMode: ReflectionMode) => {
    setLocalMode(newMode);
    onUpdateMode(newMode);
  };

  const handleSend = async () => {
    if (!inputText.trim() || isGenerating) return;
    const text = inputText;
    // We intentionally do NOT clear input immediately until send handler accepts it
    try {
      await onSendMessage(text, activeMode);
      setInputText('');
    } catch (err) {
      // The parent handles error display, and we keep inputText intact per production directives
      console.error('Send error:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveTitle = async () => {
    if (titleValue.trim()) {
      await onUpdateTitle(titleValue.trim());
    }
    setIsEditingTitle(false);
  };

  const messages = entry?.messages || [];

  return (
    <div id="reflection-workspace" className="flex-1 flex flex-col h-full bg-slate-950/20 backdrop-blur-2xl overflow-hidden">
      {/* Workspace Subheader */}
      <div className="bg-white/[0.03] backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.2)]">
        {/* Title area */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          {isEditingTitle ? (
            <div className="flex items-center gap-2 w-full max-w-md">
              <input
                id="input-entry-title"
                type="text"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                autoFocus
                className="text-sm sm:text-base font-semibold text-white bg-white/[0.06] border border-indigo-400/40 rounded-lg px-2.5 py-1 w-full focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <button
                id="btn-save-title"
                onClick={handleSaveTitle}
                className="text-xs font-medium text-indigo-300 hover:text-indigo-200 px-2.5 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-lg transition cursor-pointer"
              >
                Save
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h2
                id="display-entry-title"
                onClick={() => setIsEditingTitle(true)}
                className="text-base sm:text-lg font-semibold text-white truncate cursor-pointer hover:text-indigo-300 transition"
                title="Click to edit title"
              >
                {entry?.title || 'New Reflection Session'}
              </h2>
              <button
                onClick={() => setIsEditingTitle(true)}
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-200 p-1 transition"
                aria-label="Edit title"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Reflection Mode Switcher */}
        <div className="flex items-center bg-white/[0.04] p-1 rounded-xl border border-white/10 gap-1 text-xs backdrop-blur-md">
          <button
            id="mode-btn-reflect"
            onClick={() => handleSelectMode('reflect')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition border cursor-pointer ${
              activeMode === 'reflect'
                ? 'bg-indigo-500/25 text-indigo-200 border-indigo-400/30 shadow-[0_0_12px_rgba(99,102,241,0.2)] font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border-transparent'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Reflect</span>
          </button>

          <button
            id="mode-btn-summarize"
            onClick={() => handleSelectMode('summarize')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition border cursor-pointer ${
              activeMode === 'summarize'
                ? 'bg-amber-500/25 text-amber-200 border-amber-400/30 shadow-[0_0_12px_rgba(245,158,11,0.2)] font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border-transparent'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>Summarize</span>
          </button>

          <button
            id="mode-btn-brainstorm"
            onClick={() => handleSelectMode('brainstorm')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition border cursor-pointer ${
              activeMode === 'brainstorm'
                ? 'bg-violet-500/25 text-violet-200 border-violet-400/30 shadow-[0_0_12px_rgba(168,85,247,0.2)] font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border-transparent'
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-violet-400" />
            <span>Brainstorm</span>
          </button>

          <button
            id="mode-btn-chat"
            onClick={() => handleSelectMode('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition border cursor-pointer ${
              activeMode === 'chat'
                ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/30 shadow-[0_0_12px_rgba(16,185,129,0.2)] font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border-transparent'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>Chat</span>
          </button>
        </div>
      </div>

      {/* Persistence Error Banner with Retry (Guaranteed Transaction Verification) */}
      {saveError && (
        <div
          id="persistence-error-banner"
          className="bg-rose-500/10 backdrop-blur-md border-b border-rose-500/20 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs text-rose-300 shrink-0"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              <strong>Persistence Error:</strong> {saveError}. Your unsaved input has been retained.
            </span>
          </div>
          {onRetrySave && (
            <button
              id="btn-retry-save"
              onClick={onRetrySave}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg font-medium transition shrink-0 shadow-xs border border-rose-400/30 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry Save</span>
            </button>
          )}
        </div>
      )}

      {/* Message Stream Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.length === 0 ? (
          /* Empty State: Guidance + Starters */
          <div className="max-w-3xl mx-auto py-8 text-center space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-400/25 text-indigo-300 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(99,102,241,0.25)]">
              <Compass className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white">
                Begin your reflection with Gemini
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                Write down what's on your mind. Choose whether you'd like a thoughtful reflection, an executive summary, or creative brainstorming.
              </p>
            </div>

            {/* Prompt Starter Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
              {PROMPT_STARTERS.map((starter, idx) => (
                <button
                  key={idx}
                  id={`prompt-starter-${idx}`}
                  onClick={() => {
                    setInputText(starter.text);
                    handleSelectMode(starter.mode);
                    textareaRef.current?.focus();
                  }}
                  className="p-4 bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-indigo-400/30 rounded-2xl backdrop-blur-xl transition text-left group flex flex-col justify-between shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.08)] cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-100 mb-1">
                      <span>{starter.title}</span>
                      <span className="capitalize text-[10px] text-indigo-300 font-mono bg-indigo-500/15 border border-indigo-400/25 px-1.5 py-0.5 rounded">
                        {starter.mode}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                      "{starter.text}"
                    </p>
                  </div>
                  <span className="text-[11px] text-indigo-400 font-medium mt-3 inline-flex items-center gap-1 group-hover:text-indigo-300 group-hover:translate-x-0.5 transition-all">
                    Use prompt starter →
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Conversation stream */
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg: JournalMessage) => {
              const isUser = msg.role === 'user';
              const isCopied = copiedId === msg.id;

              return (
                <div
                  key={msg.id}
                  id={`message-${msg.id}`}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  {/* Speaker Label & Timestamp */}
                  <div className="flex items-center gap-2 mb-1.5 px-1 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300">
                      {isUser ? 'Your Journal Entry' : 'Gemini 3.6 Flash'}
                    </span>
                    {msg.modelUsed && (
                      <span className="text-[10px] bg-white/[0.06] border border-white/10 text-slate-300 px-1.5 py-0.2 rounded font-mono">
                        {msg.modelUsed}
                      </span>
                    )}
                    <span>•</span>
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Message Bubble Card with Frosted Glass */}
                  <div
                    className={`relative w-full max-w-3xl rounded-2xl p-4 sm:p-5 backdrop-blur-xl border transition ${
                      isUser
                        ? 'bg-white/[0.06] border-white/10 text-white shadow-[0_4px_25px_-5px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.12)]'
                        : 'bg-gradient-to-b from-indigo-950/40 to-slate-900/40 border-indigo-400/20 text-slate-100 shadow-[0_4px_30px_-5px_rgba(99,102,241,0.15),inset_0_1px_0_0_rgba(255,255,255,0.1)]'
                    }`}
                  >
                    {/* Copy button */}
                    <button
                      id={`copy-btn-${msg.id}`}
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="absolute top-3 right-3 p-1 text-slate-400 hover:text-white rounded-md hover:bg-white/10 transition cursor-pointer"
                      title="Copy content"
                      aria-label="Copy message"
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {isUser ? (
                      <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed text-slate-100">
                        {msg.content}
                      </div>
                    ) : (
                      <MarkdownView content={msg.content} />
                    )}
                  </div>
                </div>
              );
            })}

            {/* Thinking / Generating Skeleton Indicator */}
            {isGenerating && (
              <div id="ai-generating-indicator" className="flex flex-col items-start space-y-2">
                <div className="flex items-center gap-2 px-1 text-[11px] text-indigo-400 font-medium">
                  <Sparkles className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span>Gemini is reflecting on your input...</span>
                </div>
                <div className="w-full max-w-2xl bg-white/[0.04] border border-indigo-400/20 backdrop-blur-xl rounded-2xl p-4 sm:p-5 shadow-[0_4px_20px_-4px_rgba(99,102,241,0.15)] space-y-2.5">
                  <div className="h-3.5 bg-indigo-400/20 rounded-md w-5/6 animate-pulse" />
                  <div className="h-3.5 bg-white/10 rounded-md w-full animate-pulse" />
                  <div className="h-3.5 bg-white/10 rounded-md w-3/4 animate-pulse" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Composer Area */}
      <div className="p-4 sm:p-6 bg-slate-950/40 backdrop-blur-xl border-t border-white/10 shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="relative border border-white/10 focus-within:border-indigo-400/50 rounded-2xl bg-white/[0.04] focus-within:bg-white/[0.06] focus-within:ring-2 focus-within:ring-indigo-500/20 backdrop-blur-xl transition shadow-[0_8px_32px_0_rgba(0,0,0,0.37),inset_0_1px_0_0_rgba(255,255,255,0.1)]">
            <textarea
              ref={textareaRef}
              id="reflection-input-textarea"
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                activeMode === 'reflect'
                  ? 'Write your unfiltered thoughts, emotions, or daily reflections...'
                  : activeMode === 'summarize'
                  ? 'Paste your notes or write what happened to generate an executive summary...'
                  : activeMode === 'brainstorm'
                  ? 'Describe an obstacle or vision you want to brainstorm solutions for...'
                  : 'Continue conversing with Gemini about this journal entry...'
              }
              className="w-full p-3.5 sm:p-4 text-sm sm:text-base bg-transparent border-none resize-none focus:outline-none text-white placeholder-slate-400 leading-relaxed"
            />

            {/* Bottom bar of composer */}
            <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-white/10 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-slate-400">
                  {inputText.length} chars
                </span>
                <span className="hidden sm:inline text-slate-600">•</span>
                <span className="hidden sm:inline text-slate-400 text-[11px]">
                  Press <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/15 rounded text-[10px] text-slate-300">⌘</kbd> + <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/15 rounded text-[10px] text-slate-300">Enter</kbd> to submit
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isSaving && (
                  <span className="text-[11px] text-indigo-300 animate-pulse hidden sm:inline">
                    Saving to Firestore...
                  </span>
                )}

                <button
                  id="btn-submit-reflection"
                  onClick={handleSend}
                  disabled={!inputText.trim() || isGenerating}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:from-white/10 disabled:to-white/10 disabled:text-slate-500 text-white font-medium rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.3)] border border-indigo-400/30 disabled:border-transparent transition disabled:cursor-not-allowed cursor-pointer text-xs sm:text-sm"
                >
                  <span>
                    {isGenerating
                      ? 'Thinking...'
                      : activeMode === 'summarize'
                      ? 'Summarize'
                      : activeMode === 'brainstorm'
                      ? 'Brainstorm'
                      : activeMode === 'chat'
                      ? 'Send'
                      : 'Reflect'}
                  </span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
