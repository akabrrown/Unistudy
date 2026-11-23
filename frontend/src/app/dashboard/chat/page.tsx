'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { toast } from 'sonner';
import { UniStudyLogo } from '@/components/brand/UniStudyLogo';
import {
  BrainCircuit,
  Send,
  Paperclip,
  Trash2,
  Download,
  BookOpen,
  Layers,
  X,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  GraduationCap,
  Volume2,
  VolumeX,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Edit3,
  Cpu,
  Zap,
  SlidersHorizontal,
  ChevronDown,
  HelpCircle,
  Cloud,
  CheckCircle,
  Bot,
} from 'lucide-react';
import {
  requestPersistentStorage,
  saveSessionsToIndexedDB,
  loadSessionsFromIndexedDB,
  pushSessionsToCloud,
  pullSessionsFromCloud,
} from '@/lib/chatStorage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getSlideThumbnailUrl, isPlaceholderSlideUrl } from '@/lib/images';
import { cn } from '@/lib/utils';
import { CalibrateTutorDialog } from '@/components/chat/CalibrateTutorDialog';
import { createClient } from '@/lib/supabase/client';

interface LectureItem {
  id: string;
  title: string;
  week?: number | null;
  slide_count?: number | null;
  created_at?: string | null;
  processing?: boolean | null;
  cover_image_url?: string | null;
}

interface CourseItem {
  id: string;
  title: string;
  course_code?: string | null;
  colour?: string | null;
  is_archived?: boolean | null;
  lectures?: LectureItem[];
}

interface ReferencedDeck {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  lectureId: string;
  lectureTitle: string;
  slideCount?: number | null;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  referencedDeck?: ReferencedDeck | null;
  citations?: number[];
  modelUsed?: string;
  provider?: string;
}

interface ConversationSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  referencedDeck?: ReferencedDeck | null;
  messages: ChatMessage[];
  selectedModel: string;
}

const SESSIONS_STORAGE_KEY = 'unistudy_ai_chat_sessions_v2';
const ACTIVE_SESSION_ID_KEY = 'unistudy_ai_chat_active_session_id_v2';

const AI_MODELS = [
  {
    id: 'auto',
    name: 'Smart Auto',
    badge: 'Recommended',
    tagline: 'Best available model with automatic fallback',
    icon: BrainCircuit,
    color: 'text-[#D89A06]',
  },
  {
    id: 'agentrouter',
    name: 'AgentRouter Pro',
    badge: 'Claude & DeepSeek',
    tagline: 'Claude 3.5 Sonnet, DeepSeek R1 & GPT-4o intelligence',
    icon: Bot,
    color: 'text-emerald-500',
  },
  {
    id: 'groq',
    name: 'Groq High-Speed',
    badge: 'Ultra Fast',
    tagline: 'Instant token streaming for rapid problem solving',
    icon: Zap,
    color: 'text-amber-500',
  },
  {
    id: 'gemini',
    name: 'Google Gemini 3.1',
    badge: 'Deep STEM',
    tagline: 'Advanced mathematical logic & multi-lingual tutoring',
    icon: GraduationCap,
    color: 'text-blue-500',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter Cloud',
    badge: 'Multi-Cloud',
    tagline: 'Qwen 2.5 72B & high-parameter reasoning models',
    icon: Cpu,
    color: 'text-purple-500',
  },
] as const;

type ModelId = (typeof AI_MODELS)[number]['id'];

const COMMAND_SHORTCUTS = [
  {
    prefix: '/explain',
    label: '/explain',
    name: 'Deep Dive',
    hint: 'Comprehensive pedagogical derivation and conceptual breakdown',
    template: '/explain Step-by-step breakdown of: ',
  },
  {
    prefix: '/test',
    label: '/test',
    name: 'Quiz Me',
    hint: 'Generates practice questions without revealing answers immediately',
    template: '/test Quiz me on: ',
  },
  {
    prefix: '/plan',
    label: '/plan',
    name: 'Study Roadmap',
    hint: 'Prerequisite foundations mapped to slide milestones',
    template: '/plan Break down the study sequence for: ',
  },
  {
    prefix: '/summary',
    label: '/summary',
    name: 'Key Summary',
    hint: 'Executive exam summary, core formulas, and critical definitions',
    template: '/summary Key exam takeaways for: ',
  },
] as const;

function CodeBlock({ className, children }: { className?: string; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const codeString = String(children).replace(/\n$/, '');
  const langMatch = className?.match(/language-(\w+)/);
  const lang = langMatch ? langMatch[1] : 'code';

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeString);
      setCopied(true);
      toast.success('Code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy code');
    }
  };

  return (
    <div className="my-3.5 rounded-xl overflow-hidden border border-border bg-[#0B1021] text-slate-100 shadow-sm font-mono text-xs not-prose">
      <div className="px-3.5 py-1.5 bg-[#070A15] border-b border-border/40 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="font-bold uppercase tracking-wider text-[#D89A06]">{lang}</span>
        <button
          onClick={onCopy}
          className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-white/10"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto leading-relaxed scrollbar-thin">
        <code>{codeString}</code>
      </pre>
    </div>
  );
}

function formatContentWithSlideLinks(content: string, deck?: ReferencedDeck | null) {
  if (!deck?.courseId || !deck?.lectureId) return content;
  return content.replace(
    /\[Slide\s+(\d+)\]/gi,
    (_match, num) => `[Slide ${num}](/dashboard/courses/${deck.courseId}/lectures/${deck.lectureId}?slide=${num})`
  );
}

function createNewSession(referencedDeck?: ReferencedDeck | null, modelId = 'auto'): ConversationSession {
  return {
    id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: 'New Conversation',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    referencedDeck: referencedDeck || null,
    messages: [],
    selectedModel: modelId,
  };
}

export default function GeneralAiChatPage() {
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [isCoursesLoading, setIsCoursesLoading] = useState(true);
  const [isDeckSelectorOpen, setIsDeckSelectorOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [deckSearchQuery, setDeckSearchQuery] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelId>('auto');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'offline'>('synced');
  const [isCalibrateDialogOpen, setIsCalibrateDialogOpen] = useState(false);
  const [walletCredits, setWalletCredits] = useState<number | null>(null);
  const [tutorConfig, setTutorConfig] = useState<{ name: string; personality: string; tone: string }>({
    name: 'Alex',
    personality: 'encouraging',
    tone: 'academic',
  });

  useEffect(() => {
    let isMounted = true;
    async function loadTutorConfig() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const [settingsRes, profileRes] = await Promise.all([
          supabase.from('user_settings').select('ai_tutor_name, ai_personality, ai_tone').eq('user_id', user.id).maybeSingle(),
          supabase.from('profiles').select('tutor_name, tutor_personality').eq('id', user.id).maybeSingle(),
        ]);
        if (isMounted) {
          const name = settingsRes.data?.ai_tutor_name || profileRes.data?.tutor_name || 'Alex';
          const personality = settingsRes.data?.ai_personality || profileRes.data?.tutor_personality || 'encouraging';
          const tone = settingsRes.data?.ai_tone || 'academic';
          setTutorConfig({ name, personality, tone });
        }
      } catch {}
    }
    loadTutorConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function fetchCredits() {
      try {
        const res = await fetch('/api/quota/status', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && typeof data.walletBalance === 'number') {
            setWalletCredits(data.walletBalance);
          }
        }
      } catch {
        // Fallback to initial
      }
    }
    fetchCredits();

    const handleCreditsChanged = (e: Event) => {
      const ce = e as CustomEvent<{ balance?: number }>;
      if (typeof ce.detail?.balance === 'number') {
        setWalletCredits(ce.detail.balance);
      }
    };
    window.addEventListener('unistudy-credits-changed', handleCreditsChanged);

    return () => {
      isMounted = false;
      window.removeEventListener('unistudy-credits-changed', handleCreditsChanged);
    };
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHydratedRef = useRef(false);

  // Load and hydrate sessions across 3 tiers: LocalStorage -> IndexedDB -> Cloud Sync
  useEffect(() => {
    let isMounted = true;

    // 1. Request persistent browser storage immunity
    void requestPersistentStorage();

    const hydrateHistory = async () => {
      let initialSessions: ConversationSession[] = [];
      let initialActiveId: string | null = null;

      // Tier 1: Instant local storage read for 0ms visual paint
      try {
        const stored = localStorage.getItem(SESSIONS_STORAGE_KEY);
        const activeId = localStorage.getItem(ACTIVE_SESSION_ID_KEY);
        if (stored) {
          const parsed: ConversationSession[] = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            initialSessions = parsed;
            initialActiveId = activeId;
          }
        }
      } catch (_) {}

      // Tier 2: Check IndexedDB (immune to 5MB localStorage quota limit)
      try {
        const idbRecord = await loadSessionsFromIndexedDB();
        if (idbRecord && Array.isArray(idbRecord.sessions) && idbRecord.sessions.length > 0) {
          if (idbRecord.sessions.length >= initialSessions.length) {
            initialSessions = idbRecord.sessions;
            if (idbRecord.activeSessionId) initialActiveId = idbRecord.activeSessionId;
          }
        }
      } catch (err) {
        console.warn('[ChatPage] IndexedDB hydration notice:', err);
      }

      // If we found local sessions, render them immediately so user sees them at 0ms
      if (isMounted && initialSessions.length > 0) {
        setSessions(initialSessions);
        const matched = initialActiveId && initialSessions.some((s) => s.id === initialActiveId);
        const targetId = matched ? initialActiveId! : initialSessions[0].id;
        setActiveSessionId(targetId);
        const activeSess = initialSessions.find((s) => s.id === targetId);
        if (activeSess?.selectedModel) {
          setSelectedModel((activeSess.selectedModel as ModelId) || 'auto');
        }
      }

      // Tier 3: Reconcile with Cloud Storage (restores conversations across any device or browser)
      try {
        const cloudRecord = await pullSessionsFromCloud();
        if (isMounted && cloudRecord && Array.isArray(cloudRecord.sessions) && cloudRecord.sessions.length > 0) {
          const cloudSessions = cloudRecord.sessions;
          let resolvedSessions: ConversationSession[] = [];

          // If local had NO sessions, or only had an empty placeholder session with 0 user messages:
          const hasLocalUserMessages = initialSessions.some(
            (s) => Array.isArray(s.messages) && s.messages.some((m) => m.role === 'user')
          );

          if (!hasLocalUserMessages) {
            // New browser or empty local cache: adopt full cloud history directly
            resolvedSessions = cloudSessions;
          } else {
            // Merge local and cloud by session id and updatedAt
            const sessionMap = new Map<string, ConversationSession>();
            cloudSessions.forEach((s) => sessionMap.set(s.id, s));
            initialSessions.forEach((s) => {
              const existing = sessionMap.get(s.id);
              if (!existing || new Date(s.updatedAt || 0).getTime() >= new Date(existing.updatedAt || 0).getTime()) {
                sessionMap.set(s.id, s);
              }
            });
            resolvedSessions = Array.from(sessionMap.values()).sort(
              (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
            );
          }

          setSessions(resolvedSessions);

          // Resolve active session
          const cloudActiveId = cloudRecord.activeSessionId;
          const targetActiveId =
            cloudActiveId && resolvedSessions.some((s) => s.id === cloudActiveId)
              ? cloudActiveId
              : resolvedSessions[0].id;

          setActiveSessionId(targetActiveId);
          const activeSess = resolvedSessions.find((s) => s.id === targetActiveId);
          if (activeSess?.selectedModel) {
            setSelectedModel((activeSess.selectedModel as ModelId) || 'auto');
          }
          setSyncStatus('synced');
        } else if (isMounted && initialSessions.length === 0) {
          // Neither local nor cloud has sessions: create a brand new conversation
          const fresh = createNewSession();
          setSessions([fresh]);
          setActiveSessionId(fresh.id);
        }
      } catch (cloudErr) {
        console.warn('[ChatPage] Cloud sync hydration notice:', cloudErr);
        if (isMounted && initialSessions.length === 0) {
          const fresh = createNewSession();
          setSessions([fresh]);
          setActiveSessionId(fresh.id);
        }
      } finally {
        isHydratedRef.current = true;
      }
    };

    void hydrateHistory();

    return () => {
      isMounted = false;
    };
  }, []);

  // Robust Multi-Tier Persistence: LocalStorage + IndexedDB + Debounced Cloud Sync
  useEffect(() => {
    if (!isHydratedRef.current || sessions.length === 0) return;

    // 1. Fast LocalStorage mirror (guarded against quota errors)
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
      if (activeSessionId) {
        localStorage.setItem(ACTIVE_SESSION_ID_KEY, activeSessionId);
      }
    } catch (e) {
      console.warn('LocalStorage quota limit reached, relying on IndexedDB and Cloud Storage', e);
    }

    // 2. Persistent IndexedDB Write (unlimited multi-MB capacity)
    void saveSessionsToIndexedDB(sessions, activeSessionId);

    // 3. Debounced Cloud Backup to Supabase Storage and Postgres
    setSyncStatus('saving');
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(async () => {
      const ok = await pushSessionsToCloud(sessions, activeSessionId);
      setSyncStatus(ok ? 'synced' : 'offline');
    }, 1500);

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [sessions, activeSessionId]);

  // Current active session
  const currentSession = useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) || sessions[0] || null;
  }, [sessions, activeSessionId]);

  const messages = useMemo(() => {
    return currentSession?.messages || [];
  }, [currentSession]);

  const activeDeck = useMemo(() => {
    return currentSession?.referencedDeck || null;
  }, [currentSession]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load user courses and lectures
  useEffect(() => {
    let isMounted = true;
    async function fetchCourses() {
      setIsCoursesLoading(true);
      try {
        const res = await fetch(`/api/courses?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data)) {
            const activeOnly = data
              .filter((c: CourseItem) => !c.is_archived)
              .map((c: CourseItem) => ({
                ...c,
                lectures: (c.lectures || []).filter((l: LectureItem) => !l.title?.startsWith('[FAILED')),
              }));
            setCourses(activeOnly);
            if (activeOnly.length > 0 && !selectedCourseId) {
              setSelectedCourseId(activeOnly[0].id);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch courses for chat deck reference', err);
      } finally {
        if (isMounted) setIsCoursesLoading(false);
      }
    }
    fetchCourses();
    return () => {
      isMounted = false;
    };
  }, [selectedCourseId]);

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputPrompt(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  // Start a new conversation
  const handleStartNewChat = () => {
    const fresh = createNewSession(activeDeck, selectedModel);
    setSessions((prev) => [fresh, ...prev]);
    setActiveSessionId(fresh.id);
    setInputPrompt('');
    toast.success('Started a fresh conversation session');
  };

  // Switch active session
  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    const target = sessions.find((s) => s.id === sessionId);
    if (target?.selectedModel) {
      setSelectedModel((target.selectedModel as ModelId) || 'auto');
    }
    if (window.innerWidth < 768) {
      setIsHistoryOpen(false);
    }
  };

  // Delete a session
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      const fresh = createNewSession();
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
      toast.info('Conversation reset');
      return;
    }
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== sessionId);
      if (activeSessionId === sessionId) {
        setActiveSessionId(remaining[0].id);
      }
      return remaining;
    });
    toast.success('Conversation removed from history');
  };

  // Rename session title
  const handleSaveRename = (sessionId: string, e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editingTitle.trim()) {
      setEditingSessionId(null);
      return;
    }
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, title: editingTitle.trim() } : s))
    );
    setEditingSessionId(null);
    toast.success('Conversation renamed');
  };

  // Attach a deck to current conversation
  const handleAttachDeck = (course: CourseItem, lecture: LectureItem) => {
    const deck: ReferencedDeck = {
      courseId: course.id,
      courseCode: course.course_code || course.title,
      courseTitle: course.title,
      lectureId: lecture.id,
      lectureTitle: lecture.title,
      slideCount: lecture.slide_count,
    };
    if (activeSessionId) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, referencedDeck: deck, updatedAt: new Date().toISOString() }
            : s
        )
      );
    }
    setIsDeckSelectorOpen(false);
    toast.success(`Attached "${lecture.title}" (${deck.courseCode}) as active reference deck`);
  };

  // Detach active deck
  const handleDetachDeck = () => {
    if (activeSessionId) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, referencedDeck: null, updatedAt: new Date().toISOString() }
            : s
        )
      );
    }
    toast.info('Switched back to General Academic Chat (No slide deck attached)');
  };

  // Export conversation as Markdown
  const handleExportChat = () => {
    if (messages.length === 0) {
      toast.error('No conversation to export');
      return;
    }
    const deckInfo = activeDeck
      ? `\n**Referenced Deck:** ${activeDeck.courseCode} · ${activeDeck.lectureTitle}\n`
      : '';
    const transcript = messages
      .map(
        (m) =>
          `### ${m.role === 'user' ? 'Student' : 'UniStudy AI Tutor'} (${new Date(m.timestamp).toLocaleTimeString()})\n\n${m.content}\n`
      )
      .join('\n---\n\n');

    const markdownDoc = `# ${currentSession?.title || 'UniStudy AI Tutor Session'}\nGenerated: ${new Date().toLocaleString()}\n${deckInfo}\n---\n\n${transcript}`;
    const blob = new Blob([markdownDoc], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `unistudy-ai-chat-${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Chat exported as Markdown');
  };

  // Copy message text
  const handleCopyMessage = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(id);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  // Text-to-speech narration
  const handleSpeak = (id: string, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error('Text-to-speech is not supported in this browser.');
      return;
    }

    if (speakingMessageId === id) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanSpeech = text
      .replace(/<[^>]*>?/gm, '')
      .replace(/\[\^.*?\]/g, '')
      .replace(/\[Slide\s+\d+\]/gi, '')
      .replace(/[`#*_~$\\]/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(id);
    window.speechSynthesis.speak(utterance);
  };

  // Handle command shortcut click
  const handleCommandShortcut = (cmd: (typeof COMMAND_SHORTCUTS)[number]) => {
    const trimmed = inputPrompt.trim();
    if (!trimmed) {
      // Empty input: insert template and focus
      setInputPrompt(cmd.template);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(cmd.template.length, cmd.template.length);
        }
      }, 50);
      return;
    }

    // Already has text: check if command prefix already exists
    const existingCmd = COMMAND_SHORTCUTS.find((c) => trimmed.startsWith(c.prefix));
    let newText = trimmed;
    if (existingCmd) {
      // Replace existing prefix with new one
      newText = trimmed.replace(existingCmd.prefix, cmd.prefix).trimStart();
    } else {
      // Prepend prefix to student's typed text
      newText = `${cmd.prefix} ${trimmed}`;
    }
    setInputPrompt(newText);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  // Active command mode detection for visual feedback
  const detectedCommand = useMemo(() => {
    const trimmed = inputPrompt.trim();
    return COMMAND_SHORTCUTS.find((c) => trimmed.startsWith(c.prefix)) || null;
  }, [inputPrompt]);

  // Submit message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputPrompt).trim();
    if (!text || isLoading || !activeSessionId) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      referencedDeck: activeDeck ? { ...activeDeck } : null,
    };

    const newMessages = [...messages, userMessage];

    // Auto-generate title from the first student message
    const isFirstUserMessage = messages.length === 0;
    const computedTitle = isFirstUserMessage
      ? text.replace(/^(\/test|\/plan|\/explain|\/summary)\s*/i, '').slice(0, 48) || 'Study Session'
      : currentSession?.title || 'Study Session';

    // Update current session with user message immediately
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              title: isFirstUserMessage ? computedTitle : s.title,
              messages: newMessages,
              updatedAt: new Date().toISOString(),
              selectedModel,
            }
          : s
      )
    );

    setInputPrompt('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setIsLoading(true);

    try {
      const historyForApi = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const payload: Record<string, any> = {
        messages: historyForApi,
        temperature: 0.55,
        model: selectedModel,
        tutorName: tutorConfig.name,
        tutorPersonality: tutorConfig.personality,
        tutorTone: tutorConfig.tone,
        studentConfig: {
          personality: tutorConfig.personality,
          tone: tutorConfig.tone,
        },
      };

      if (activeDeck) {
        payload.grounding = {
          lectureId: activeDeck.lectureId,
          courseContext: `${activeDeck.courseCode}: ${activeDeck.courseTitle}`,
        };
      }

      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature: 'ai-tutor',
          payload,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        if (res.status === 402 || errJson.code === 'INSUFFICIENT_CREDITS') {
          setWalletCredits(0);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('unistudy-credits-changed', {
                detail: { balance: 0 },
              })
            );
          }
          toast.error('You have 0 AI Credits remaining. Please top up in Billing to continue.');
        }
        throw new Error(errJson.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();

      // Instantly synchronize live deducted credits across the entire application
      if (typeof data.remainingCredits === 'number') {
        setWalletCredits(data.remainingCredits);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('unistudy-credits-changed', {
              detail: { balance: data.remainingCredits },
            })
          );
        }
      }
      const replyContent =
        data.result?.choices?.[0]?.message?.content ||
        'I received your message, but the model did not generate an answer. Please retry.';

      // Parse cited slide numbers from reply
      const citationMatches = replyContent.match(/\[Slide\s+(\d+)\]/gi) || [];
      const citedNumbers: number[] = [];
      const seenCitations = new Set<number>();
      for (const m of citationMatches) {
        const numMatch = m.match(/\d+/);
        if (numMatch) {
          const val = parseInt(numMatch[0], 10);
          if (!Number.isNaN(val) && !seenCitations.has(val)) {
            seenCitations.add(val);
            citedNumbers.push(val);
          }
        }
      }

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        role: 'assistant',
        content: replyContent,
        timestamp: new Date().toISOString(),
        referencedDeck: activeDeck ? { ...activeDeck } : null,
        citations: citedNumbers,
        modelUsed: data.modelUsed || selectedModel,
        provider: data.provider || 'assistant',
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                messages: [...s.messages, assistantMessage],
                updatedAt: new Date().toISOString(),
              }
            : s
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(`AI Error: ${msg}`);
      const errorMessage: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Unable to complete request:** ${msg}\n\nPlease check your connection, switch to another model, or try again shortly.`,
        timestamp: new Date().toISOString(),
        referencedDeck: activeDeck ? { ...activeDeck } : null,
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                messages: [...s.messages, errorMessage],
                updatedAt: new Date().toISOString(),
              }
            : s
        )
      );
    } finally {
      setIsLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  // Handle enter key to send
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Filter lectures in drawer
  const activeCourse = useMemo(() => {
    return courses.find((c) => c.id === selectedCourseId) || courses[0] || null;
  }, [courses, selectedCourseId]);

  const filteredLectures = useMemo(() => {
    if (!activeCourse || !activeCourse.lectures) return [];
    if (!deckSearchQuery.trim()) return activeCourse.lectures;
    const query = deckSearchQuery.toLowerCase();
    return activeCourse.lectures.filter(
      (l) =>
        l.title.toLowerCase().includes(query) ||
        (l.week && `week ${l.week}`.includes(query))
    );
  }, [activeCourse, deckSearchQuery]);

  // Filter previous conversations
  const filteredSessions = useMemo(() => {
    if (!historySearchQuery.trim()) return sessions;
    const q = historySearchQuery.toLowerCase();
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.referencedDeck?.lectureTitle.toLowerCase().includes(q) ||
        s.referencedDeck?.courseCode.toLowerCase().includes(q)
    );
  }, [sessions, historySearchQuery]);

  const activeModelConfig = useMemo(() => {
    return AI_MODELS.find((m) => m.id === selectedModel) || AI_MODELS[0];
  }, [selectedModel]);

  // Markdown component specifications
  const markdownComponents: Components = {
    h1: ({ children }) => (
      <h1 className="text-lg md:text-xl font-black text-[#00004E] dark:text-white mt-5 mb-2.5 pb-1.5 border-b border-border/70 first:mt-0 tracking-tight">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-base md:text-lg font-bold text-[#00004E] dark:text-white mt-4 mb-2 first:mt-0 tracking-tight flex items-center gap-2">
        <span className="w-1.5 h-4 rounded-full bg-[#D89A06] inline-block shrink-0" />
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-sm md:text-base font-bold text-[#00004E] dark:text-[#D89A06] mt-3.5 mb-1.5 first:mt-0">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-xs md:text-sm font-bold text-foreground mt-2.5 mb-1 uppercase tracking-wider">
        {children}
      </h4>
    ),
    p: ({ children }) => (
      <p className="my-2.5 text-xs md:text-sm leading-relaxed text-foreground/90 last:mb-0">
        {children}
      </p>
    ),
    ul: ({ children }) => (
      <ul className="my-3 ml-6 list-disc space-y-1.5 text-xs md:text-sm text-foreground/90 marker:text-[#D89A06]">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="my-3 ml-6 list-decimal space-y-1.5 text-xs md:text-sm text-foreground/90 marker:text-[#00004E] dark:marker:text-[#D89A06] font-semibold">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="leading-relaxed pl-1 font-normal">{children}</li>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-3.5 pl-4 py-2 border-l-4 border-l-[#D89A06] bg-[#FEF8E7]/60 dark:bg-white/5 rounded-r-xl italic text-muted-foreground text-xs md:text-sm shadow-2xs">
        {children}
      </blockquote>
    ),
    strong: ({ children }) => (
      <strong className="font-bold text-[#00004E] dark:text-white">{children}</strong>
    ),
    em: ({ children }) => <em className="italic text-foreground">{children}</em>,
    hr: () => <hr className="my-4 border-border/70" />,
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto rounded-xl border border-border bg-card shadow-2xs not-prose">
        <table className="min-w-full divide-y divide-border text-xs">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-[#00004E]/5 dark:bg-white/5 text-[#00004E] dark:text-[#D89A06] font-bold">
        {children}
      </thead>
    ),
    tbody: ({ children }) => (
      <tbody className="divide-y divide-border/50 bg-transparent">{children}</tbody>
    ),
    tr: ({ children }) => (
      <tr className="hover:bg-muted/40 transition-colors">{children}</tr>
    ),
    th: ({ children }) => (
      <th className="px-4 py-2.5 text-left font-bold tracking-wider uppercase text-[11px] text-[#00004E] dark:text-[#D89A06]">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-2.5 text-foreground/90">{children}</td>
    ),
    code: ({ className, children, ...props }) => {
      const isInline = !className || !className.includes('language-');
      if (isInline) {
        return (
          <code
            className="font-mono text-[11px] md:text-xs font-semibold px-1.5 py-0.5 rounded-md bg-[#FEF8E7] dark:bg-white/10 text-[#00004E] dark:text-[#D89A06] border border-[#D89A06]/30 inline-block align-baseline mx-0.5"
            {...props}
          >
            {children}
          </code>
        );
      }
      return <CodeBlock className={className}>{children}</CodeBlock>;
    },
    a: ({ href, children, ...props }) => {
      const isSlideLink = href?.includes('/lectures/') && href?.includes('slide=');
      if (isSlideLink) {
        return (
          <Link
            href={href || '#'}
            target="_blank"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FEF8E7] dark:bg-white/10 border border-[#D89A06]/40 text-[#00004E] dark:text-[#D89A06] text-[11px] font-bold hover:border-[#D89A06] hover:scale-105 transition-all shadow-2xs mx-1 align-baseline not-prose"
            title="View slide in lecture deck"
          >
            <BookOpen className="h-2.5 w-2.5 text-[#D89A06]" />
            <span>{children}</span>
            <ExternalLink className="h-2.5 w-2.5 opacity-70" />
          </Link>
        );
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#00004E] dark:text-[#D89A06] font-semibold underline underline-offset-2 hover:opacity-80"
          {...props}
        >
          {children}
        </a>
      );
    },
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] max-w-7xl mx-auto pb-3 gap-3">
      {/* Left Sidebar: Conversation History */}
      {isHistoryOpen && (
        <aside className="w-72 flex-shrink-0 flex flex-col bg-card border border-border rounded-2xl shadow-xs overflow-hidden transition-all duration-200">
          {/* History Header */}
          <div className="p-3.5 border-b border-border flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#D89A06]" />
              <h2 className="font-bold text-xs uppercase tracking-wider text-[#00004E] dark:text-white">
                Chat History
              </h2>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-[#FEF8E7] text-[#00004E] dark:bg-white/10 dark:text-[#D89A06]">
                {sessions.length}
              </span>
              <span
                className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground ml-1"
                title={syncStatus === 'synced' ? 'Permanently backed up to cloud & IndexedDB' : 'Saving conversations...'}
              >
                <Cloud className={cn("h-3 w-3", syncStatus === 'synced' ? "text-emerald-500" : "text-[#D89A06] animate-pulse")} />
                <span className="hidden sm:inline text-[9px]">{syncStatus === 'synced' ? 'Saved' : 'Saving...'}</span>
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartNewChat}
              className="h-7 px-2 text-xs font-bold border-[#D89A06]/40 hover:border-[#D89A06] hover:bg-[#FEF8E7] dark:hover:bg-white/5 text-[#00004E] dark:text-[#D89A06]"
              title="Start a new chat session"
            >
              <Plus className="h-3 w-3 mr-1 text-[#D89A06]" />
              New
            </Button>
          </div>

          {/* History Search */}
          <div className="p-2 border-b border-border/60">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
              <Input
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                placeholder="Search past conversations..."
                className="pl-7 h-8 text-xs bg-background"
              />
            </div>
          </div>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
            {filteredSessions.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No conversations found.
              </div>
            ) : (
              filteredSessions.map((s) => {
                const isActive = s.id === activeSessionId;
                const isEditing = editingSessionId === s.id;

                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSession(s.id)}
                    className={cn(
                      'group relative flex flex-col p-2.5 rounded-xl border text-xs cursor-pointer transition-all',
                      isActive
                        ? 'border-[#D89A06] bg-[#FEF8E7] dark:bg-white/10 font-medium shadow-2xs'
                        : 'border-transparent hover:border-border hover:bg-muted/40 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {isEditing ? (
                      <form
                        onSubmit={(e) => handleSaveRename(s.id, e)}
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Input
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className="h-6 text-xs px-1.5 py-0 bg-background"
                          autoFocus
                        />
                        <button
                          type="submit"
                          className="p-1 rounded text-emerald-600 hover:bg-emerald-500/10"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSessionId(null)}
                          className="p-1 rounded text-muted-foreground hover:bg-muted"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </form>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-1.5">
                          <span
                            className={cn(
                              'truncate font-bold',
                              isActive ? 'text-[#00004E] dark:text-[#D89A06]' : 'text-foreground'
                            )}
                          >
                            {s.title}
                          </span>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingSessionId(s.id);
                                setEditingTitle(s.title);
                              }}
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                              title="Rename chat"
                            >
                              <Edit3 className="h-2.5 w-2.5" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteSession(s.id, e)}
                              className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                              title="Delete chat"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                          <span className="font-mono">
                            {new Date(s.updatedAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          {s.referencedDeck && (
                            <span className="truncate max-w-[120px] font-bold text-[#8C6404] dark:text-[#D89A06]">
                              [{s.referencedDeck.courseCode}]
                            </span>
                          )}
                          <span>{s.messages.length} msgs</span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>
      )}

      {/* Main Chat Interface */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header & Context Bar */}
        <header className="flex-shrink-0 bg-card border border-border rounded-2xl p-4 shadow-xs mb-3 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsHistoryOpen((prev) => !prev)}
                className="h-9 w-9 shrink-0 text-[#00004E] dark:text-[#D89A06] border-border hover:border-[#D89A06]"
                title={isHistoryOpen ? 'Collapse chat history' : 'Expand chat history'}
              >
                {isHistoryOpen ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeftOpen className="h-4 w-4" />
                )}
              </Button>

              <UniStudyLogo variant="icon" height={32} className="shrink-0" alt="UniStudy AI Study Tutor" />

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg md:text-xl font-black tracking-tight text-[#00004E] dark:text-white truncate">
                    {currentSession?.title || 'AI Study Tutor & Assistant'}
                  </h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D89A06]/20 text-[#8C6404] dark:text-[#D89A06] border border-[#D89A06]/40 uppercase tracking-wide">
                    {tutorConfig.name} ({tutorConfig.personality})
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  Personalized Tutor {tutorConfig.name} · {tutorConfig.tone === 'casual' ? 'Casual & Relatable' : 'Academic & Scholarly'} · Slide Grounding &amp; Mentoring
                </p>
              </div>
            </div>

            {/* Model Selector & Action Toolbar */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Dynamic Model Selector Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="inline-flex items-center gap-2 rounded-xl border border-[#D89A06]/40 bg-[#FEF8E7] dark:bg-white/10 px-3 py-1.5 text-xs font-bold text-[#00004E] dark:text-[#D89A06] hover:border-[#D89A06] transition-colors cursor-pointer shadow-2xs"
                >
                  <activeModelConfig.icon className={cn('h-3.5 w-3.5', activeModelConfig.color)} />
                  <span>{activeModelConfig.name}</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-1.5 space-y-1">
                  <DropdownMenuLabel className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Select AI Reasoning Engine
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {AI_MODELS.map((model) => {
                    const isSelected = selectedModel === model.id;
                    const Icon = model.icon;
                    return (
                      <DropdownMenuItem
                        key={model.id}
                        onClick={() => {
                          setSelectedModel(model.id);
                          if (activeSessionId) {
                            setSessions((prev) =>
                              prev.map((s) =>
                                s.id === activeSessionId ? { ...s, selectedModel: model.id } : s
                              )
                            );
                          }
                          toast.success(`Switched AI Engine to ${model.name}`);
                        }}
                        className={cn(
                          'flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors',
                          isSelected
                            ? 'bg-[#FEF8E7] dark:bg-white/10 border border-[#D89A06]/50'
                            : 'hover:bg-muted'
                        )}
                      >
                        <div className="mt-0.5 p-1 rounded-md bg-muted shrink-0">
                          <Icon className={cn('h-3.5 w-3.5', model.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-foreground">{model.name}</span>
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground">
                              {model.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                            {model.tagline}
                          </p>
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-1" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              <Link
                href="/dashboard/settings/billing"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#D89A06]/40 bg-[#FEF8E7] dark:bg-white/10 px-2.5 py-1.5 text-xs font-bold text-[#00004E] dark:text-[#D89A06] hover:border-[#D89A06] transition-colors shadow-2xs"
                title="Your AI Credit Fuel. Click to view billing and usage."
              >
                <span className="text-[#D89A06]">⚡</span>
                <span>{walletCredits ?? 20} Credits</span>
              </Link>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCalibrateDialogOpen(true)}
                className="text-xs font-semibold h-8 border-[#D89A06]/40 text-[#00004E] dark:text-[#D89A06] hover:bg-[#FEF8E7]/60 dark:hover:bg-white/5"
                title="Calibrate Tutor Name, Tone & Personality"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 mr-1 text-[#D89A06]" />
                <span className="hidden sm:inline">Calibrate Tutor</span>
                <span className="sm:hidden">Tutor</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportChat}
                disabled={messages.length === 0}
                className="text-xs font-semibold h-8"
                title="Export as Markdown"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Export
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleStartNewChat}
                className="text-xs font-semibold h-8 text-[#00004E] dark:text-[#D89A06] border-[#D89A06]/40 hover:bg-[#FEF8E7]"
                title="Start a fresh chat"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                New Chat
              </Button>
            </div>
          </div>

          {/* Reference Deck Grounding Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-border/60">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-[#D89A06]" />
                Active Grounding:
              </span>

              {activeDeck ? (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#FEF8E7] dark:bg-white/10 border border-[#D89A06]/60 text-xs font-semibold text-[#00004E] dark:text-[#D89A06] shadow-2xs">
                  <span className="font-bold text-[#8C6404] dark:text-[#D89A06]">
                    {activeDeck.courseCode}
                  </span>
                  <span className="text-muted-foreground">/</span>
                  <span className="truncate max-w-[200px] md:max-w-[320px] font-medium text-foreground">
                    {activeDeck.lectureTitle}
                  </span>
                  {typeof activeDeck.slideCount === 'number' && activeDeck.slideCount > 0 && (
                    <span className="text-[11px] text-muted-foreground font-mono">
                      ({activeDeck.slideCount} slides)
                    </span>
                  )}
                  <Link
                    href={`/dashboard/courses/${activeDeck.courseId}/lectures/${activeDeck.lectureId}`}
                    target="_blank"
                    className="text-muted-foreground hover:text-[#00004E] dark:hover:text-white transition-colors"
                    title="Open Slide Viewer"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  <button
                    onClick={handleDetachDeck}
                    className="ml-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/20 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Detach deck"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-xs font-medium text-muted-foreground">
                  <BookOpen className="h-3 w-3 text-[#D89A06]" />
                  General Academic Chat (All subjects &amp; formulas)
                </span>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeckSelectorOpen(true)}
              className="h-8 text-xs font-bold border-[#D89A06]/40 hover:border-[#D89A06] hover:bg-[#FEF8E7] dark:hover:bg-white/5 text-[#00004E] dark:text-[#D89A06]"
            >
              <Paperclip className="h-3.5 w-3.5 mr-1 text-[#D89A06]" />
              {activeDeck ? 'Switch Lecture Deck' : 'Attach Lecture Deck'}
            </Button>
          </div>
        </header>

        {/* Main Chat Message Area */}
        <div className="flex-1 bg-card border border-border rounded-2xl p-4 md:p-6 overflow-y-auto space-y-5 shadow-xs relative">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-8 space-y-5">
              <div className="flex justify-center mb-1">
                <UniStudyLogo variant="icon" height={56} className="shrink-0" alt="UniStudy AI Study Tutor" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl font-black text-[#00004E] dark:text-white">
                  How can I assist your studies today?
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  I am your 24/7 UPSA AI tutor running on <strong className="text-foreground">{activeModelConfig.name}</strong>. Ask any university problem, select a command shortcut, or attach lecture slides.
                </p>
              </div>

              {/* Suggested Starters */}
              <div className="w-full space-y-2 text-left pt-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 px-1">
                  <BookOpen className="h-3.5 w-3.5 text-[#D89A06]" />
                  Suggested Questions
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {(activeDeck
                    ? [
                        `Summarize the main principles of ${activeDeck.lectureTitle}.`,
                        `/test Quiz me on 3 core exam concepts from these slides.`,
                        `/plan Create a milestone roadmap for mastering ${activeDeck.courseCode}.`,
                        `Explain the most challenging formula in this slide deck with derivation.`,
                      ]
                    : [
                        'Explain the difference between working capital and liquidity ratio.',
                        '/test Quiz me on modern portfolio theory and risk metrics.',
                        '/plan Structure a 4-week study sequence for financial accounting.',
                        'Derive the Black-Scholes formula intuition with KaTeX notation.',
                      ]
                  ).map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(prompt)}
                      className="group flex items-center justify-between p-3 rounded-xl border border-border/80 bg-background/60 hover:bg-[#FEF8E7]/60 dark:hover:bg-white/5 hover:border-[#D89A06]/60 transition-all text-xs text-foreground cursor-pointer text-left"
                    >
                      <span className="font-medium group-hover:text-[#00004E] dark:group-hover:text-[#D89A06]">
                        {prompt}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-[#D89A06] transition-all flex-shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const isUser = message.role === 'user';
              return (
                <div
                  key={message.id}
                  className={cn(
                    'flex flex-col space-y-1.5',
                    isUser
                      ? 'ml-auto max-w-[85%] md:max-w-[75%] items-end'
                      : 'w-full max-w-4xl mr-auto items-start'
                  )}
                >
                  {isUser ? (
                    <>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground px-1">
                        <span>
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="font-bold text-[#00004E] dark:text-white">You</span>
                      </div>
                      <div className="rounded-2xl rounded-br-xs p-4 bg-[#00004E] text-white text-xs md:text-sm leading-relaxed shadow-2xs font-medium whitespace-pre-wrap break-words selection:bg-[#D89A06] selection:text-[#00004E]">
                        {message.content}
                      </div>
                    </>
                  ) : (
                    <div className="w-full rounded-2xl border border-border/80 border-l-[4px] border-l-[#D89A06] bg-card text-foreground shadow-xs overflow-hidden transition-all duration-200">
                      {/* Tutor Header Card Banner */}
                      <div className="flex items-center justify-between px-4 md:px-5 py-2.5 bg-[#00004E]/[0.03] dark:bg-white/[0.03] border-b border-border/60">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <UniStudyLogo variant="icon" height={26} className="shrink-0" alt="UniStudy AI Tutor" />
                          <div className="min-w-0 flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-[#00004E] dark:text-white">
                              UniStudy AI Tutor
                            </span>
                            {message.modelUsed && (
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#FEF8E7] text-[#00004E] border border-[#D89A06]/40 dark:bg-white/10 dark:text-[#D89A06]">
                                {message.modelUsed}
                              </span>
                            )}
                            {message.referencedDeck ? (
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground truncate max-w-[200px]">
                                {message.referencedDeck.courseCode} · {message.referencedDeck.lectureTitle}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Actions Toolbar */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSpeak(message.id, message.content)}
                            className={cn(
                              'p-1.5 rounded-lg text-xs transition-colors cursor-pointer',
                              speakingMessageId === message.id
                                ? 'text-[#D89A06] bg-[#FEF8E7] dark:bg-white/10 animate-pulse'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                            )}
                            title={
                              speakingMessageId === message.id
                                ? 'Stop reading'
                                : 'Read explanation aloud'
                            }
                          >
                            {speakingMessageId === message.id ? (
                              <VolumeX className="h-3.5 w-3.5" />
                            ) : (
                              <Volume2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(message.id, message.content)}
                            className="p-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                            title="Copy response"
                          >
                            {copiedMessageId === message.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <span className="text-[11px] text-muted-foreground ml-1 font-mono">
                            {new Date(message.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Enriched Content Body */}
                      <div className="p-4 md:p-6 text-xs md:text-sm leading-relaxed">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={markdownComponents}
                        >
                          {formatContentWithSlideLinks(message.content, message.referencedDeck)}
                        </ReactMarkdown>
                      </div>

                      {/* Referenced Slides Ribbon */}
                      {message.citations &&
                        message.citations.length > 0 &&
                        message.referencedDeck && (
                          <div className="px-4 md:px-6 py-3 border-t border-border/70 bg-[#FEF8E7]/40 dark:bg-white/[0.02] flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                              <BookOpen className="h-3.5 w-3.5 text-[#D89A06]" />
                              Referenced Lecture Slides:
                            </span>
                            {message.citations.map((slideNum) => (
                              <Link
                                key={slideNum}
                                href={`/dashboard/courses/${message.referencedDeck?.courseId}/lectures/${message.referencedDeck?.lectureId}?slide=${slideNum}`}
                                target="_blank"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FEF8E7] dark:bg-white/10 border border-[#D89A06]/50 text-[#00004E] dark:text-[#D89A06] text-xs font-bold hover:border-[#D89A06] hover:bg-[#FDF2D0] hover:scale-105 transition-all shadow-2xs"
                                title={`Jump to Slide ${slideNum}`}
                              >
                                Slide {slideNum}
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            ))}
                          </div>
                        )}

                      {/* Interactive Visual Action Chips */}
                      <div className="px-4 md:px-6 py-2.5 bg-muted/20 border-t border-border/50 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground mr-1">
                          Quick Actions:
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSendMessage('Create 3 high-yield flashcards from this explanation with clear Q&A.')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-card border border-border/80 hover:border-[#D89A06] hover:bg-[#FEF8E7]/50 dark:hover:bg-white/5 text-[11px] font-medium text-foreground transition-all cursor-pointer shadow-2xs active:scale-95"
                        >
                          <span>🎴 Make 3 Flashcards</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendMessage('/test Quiz me on 3 questions testing my understanding of this.')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-card border border-border/80 hover:border-[#D89A06] hover:bg-[#FEF8E7]/50 dark:hover:bg-white/5 text-[11px] font-medium text-foreground transition-all cursor-pointer shadow-2xs active:scale-95"
                        >
                          <span>🎯 Quiz Me</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendMessage('Summarize this into 3 concise high-priority bullet points for rapid revision.')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-card border border-border/80 hover:border-[#D89A06] hover:bg-[#FEF8E7]/50 dark:hover:bg-white/5 text-[11px] font-medium text-foreground transition-all cursor-pointer shadow-2xs active:scale-95"
                        >
                          <span>⚡ 3-Bullet Summary</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendMessage('Simplify this concept step-by-step with an intuitive real-world analogy.')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-card border border-border/80 hover:border-[#D89A06] hover:bg-[#FEF8E7]/50 dark:hover:bg-white/5 text-[11px] font-medium text-foreground transition-all cursor-pointer shadow-2xs active:scale-95"
                        >
                          <span>💡 Simplify with Analogy</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="w-full max-w-4xl mr-auto rounded-2xl border border-border border-l-4 border-l-[#D89A06] bg-card p-4 md:p-5 flex items-center gap-3.5 shadow-2xs">
              <div className="h-8 w-8 rounded-lg bg-[#00004E] text-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E] flex items-center justify-center font-bold shadow-2xs shrink-0">
                <GraduationCap className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[#00004E] dark:text-white">
                    UniStudy AI Tutor ({activeModelConfig.name})
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    · Analyzing material
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-[#00004E] dark:bg-[#D89A06] animate-bounce" />
                  <div className="h-2 w-2 rounded-full bg-[#00004E] dark:bg-[#D89A06] animate-bounce [animation-delay:0.15s]" />
                  <div className="h-2 w-2 rounded-full bg-[#00004E] dark:bg-[#D89A06] animate-bounce [animation-delay:0.3s]" />
                  <span className="text-xs text-muted-foreground ml-2 font-medium">
                    {activeDeck
                      ? `Retrieving slide knowledge for "${activeDeck.lectureTitle}"...`
                      : 'Synthesizing academic derivation...'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form Bar & Intuitive Command Shortcuts */}
        <div className="flex-shrink-0 mt-3 space-y-2">
          {/* Active Command Mode Helper Banner */}
          {detectedCommand && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#FEF8E7] dark:bg-[#00004E]/40 border border-[#D89A06]/40 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold font-mono text-[#00004E] dark:text-[#D89A06]">
                  {detectedCommand.label} Active:
                </span>
                <span className="text-muted-foreground truncate">{detectedCommand.hint}</span>
              </div>
              <button
                onClick={() => setInputPrompt((prev) => prev.replace(detectedCommand.prefix, '').trimStart())}
                className="text-[11px] text-muted-foreground hover:text-foreground font-semibold cursor-pointer underline ml-2 shrink-0"
              >
                Clear mode
              </button>
            </div>
          )}

          {/* Interactive Command Shortcut Toolbar */}
          <div className="flex items-center gap-2 px-1 flex-wrap">
            <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1">
              <SlidersHorizontal className="h-3 w-3 text-[#D89A06]" />
              Mode Shortcuts:
            </span>
            {COMMAND_SHORTCUTS.map((cmd) => {
              const isSelected = detectedCommand?.prefix === cmd.prefix;
              return (
                <button
                  key={cmd.prefix}
                  onClick={() => handleCommandShortcut(cmd)}
                  disabled={isLoading}
                  className={cn(
                    'text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs',
                    isSelected
                      ? 'bg-[#00004E] text-white border-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E]'
                      : 'bg-[#FEF8E7] dark:bg-white/10 text-[#00004E] dark:text-[#D89A06] border-[#D89A06]/30 hover:border-[#D89A06] hover:bg-[#FDF2D0]'
                  )}
                  title={cmd.hint}
                >
                  <span className="font-mono">{cmd.label}</span>
                  <span className="font-medium text-[10px] opacity-80">({cmd.name})</span>
                </button>
              );
            })}
          </div>

          {/* Textarea Input Container */}
          <div className="relative flex items-end gap-2 bg-card border-2 border-border focus-within:border-[#D89A06] rounded-2xl p-2 transition-all shadow-xs">
            <textarea
              ref={textareaRef}
              value={inputPrompt}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={
                activeDeck
                  ? `Ask anything grounded in "${activeDeck.lectureTitle}"... (Type /test for quiz, /plan for roadmap)`
                  : 'Ask anything across your courses, concepts, or formulas... (Shift+Enter for newline)'
              }
              rows={1}
              disabled={isLoading}
              className="flex-1 bg-transparent px-3 py-2 text-xs md:text-sm resize-none focus:outline-none placeholder:text-muted-foreground/60 max-h-44 overflow-y-auto leading-relaxed"
            />

            <Button
              onClick={() => handleSendMessage()}
              disabled={!inputPrompt.trim() || isLoading}
              className="h-10 w-10 p-0 rounded-xl bg-[#00004E] hover:bg-[#000038] text-white dark:bg-[#D89A06] dark:text-[#00004E] dark:hover:bg-[#C28905] transition-all shadow-2xs flex-shrink-0 cursor-pointer disabled:opacity-40"
              title="Send Message (Enter)"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>

      {/* Slide Deck Selector Modal */}
      {isDeckSelectorOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border-2 border-[#D89A06]/40 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 md:p-5 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[#00004E] text-[#D89A06] flex items-center justify-center font-bold">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#00004E] dark:text-white">
                    Attach Lecture Slide Deck
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Select any uploaded slide deck to ground the AI tutor with exact citations.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDeckSelectorOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 md:p-5 flex-1 overflow-y-auto space-y-4">
              {/* Option to clear grounding */}
              {activeDeck && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-[#D89A06]/40 bg-[#FEF8E7] dark:bg-white/5">
                  <div className="text-xs">
                    <span className="font-bold text-[#00004E] dark:text-[#D89A06]">
                      Currently Attached:{' '}
                    </span>
                    <span className="font-medium text-foreground">{activeDeck.lectureTitle}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDetachDeck}
                    className="h-7 text-xs font-bold text-destructive hover:bg-destructive/10"
                  >
                    Detach Deck (Go General)
                  </Button>
                </div>
              )}

              {/* Course Selector Strip */}
              {isCoursesLoading ? (
                <div className="flex items-center justify-center py-10 text-xs text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin mr-2 text-[#D89A06]" />
                  Loading your uploaded courses...
                </div>
              ) : courses.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <BookOpen className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-xs text-muted-foreground">
                    No active courses found. You can chat freely in General Mode, or upload slides under Courses.
                  </p>
                  <Link
                    href="/dashboard/courses"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00004E] dark:text-[#D89A06] hover:underline"
                  >
                    Go to Courses &rarr;
                  </Link>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {courses.map((course) => {
                      const isSelected = course.id === selectedCourseId;
                      return (
                        <button
                          key={course.id}
                          onClick={() => setSelectedCourseId(course.id)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border cursor-pointer',
                            isSelected
                              ? 'bg-[#00004E] text-white border-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E]'
                              : 'bg-background hover:bg-muted text-muted-foreground border-border'
                          )}
                        >
                          {course.course_code || course.title}
                        </button>
                      );
                    })}
                  </div>

                  {/* Search bar inside selected course */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={deckSearchQuery}
                      onChange={(e) => setDeckSearchQuery(e.target.value)}
                      placeholder="Search lecture title in this course..."
                      className="pl-8 text-xs h-9"
                    />
                  </div>

                  {/* Lecture Decks List */}
                  <div className="space-y-2 pt-1">
                    {filteredLectures.length === 0 ? (
                      <div className="text-center py-8 text-xs text-muted-foreground">
                        No slide decks found in this course.
                      </div>
                    ) : (
                      filteredLectures.map((lecture) => {
                        const isCurrentActive = activeDeck?.lectureId === lecture.id;
                        const coverThumb = lecture.cover_image_url
                          ? getSlideThumbnailUrl(lecture.cover_image_url)
                          : '';

                        return (
                          <div
                            key={lecture.id}
                            className={cn(
                              'flex items-center justify-between p-3 rounded-xl border transition-all',
                              isCurrentActive
                                ? 'border-[#D89A06] bg-[#FEF8E7]/80 dark:bg-white/10 shadow-2xs'
                                : 'border-border bg-card hover:border-[#D89A06]/50 hover:bg-muted/30'
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative h-12 w-20 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-border">
                                {coverThumb && !isPlaceholderSlideUrl(coverThumb) ? (
                                  <Image
                                    src={coverThumb}
                                    alt={`Cover for ${lecture.title}`}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground font-mono bg-muted/60">
                                    <BookOpen className="h-4 w-4 text-[#D89A06]" />
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 space-y-0.5">
                                <h4 className="text-xs font-bold text-foreground truncate">
                                  {lecture.title}
                                </h4>
                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                  {lecture.week && <span>Week {lecture.week}</span>}
                                  {lecture.week && <span>·</span>}
                                  <span>{lecture.slide_count || 0} slides</span>
                                </div>
                              </div>
                            </div>

                            <Button
                              size="sm"
                              onClick={() => activeCourse && handleAttachDeck(activeCourse, lecture)}
                              disabled={isCurrentActive}
                              className={cn(
                                'h-8 text-xs font-bold ml-2 cursor-pointer',
                                isCurrentActive
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-[#00004E] text-white hover:bg-[#000038] dark:bg-[#D89A06] dark:text-[#00004E]'
                              )}
                            >
                              {isCurrentActive ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                  Attached
                                </>
                              ) : (
                                'Attach Deck'
                              )}
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-border bg-muted/10 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeckSelectorOpen(false)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Calibrate AI Study Tutor Dialog */}
      <CalibrateTutorDialog
        open={isCalibrateDialogOpen}
        onOpenChange={setIsCalibrateDialogOpen}
        onSaved={(saved) => {
          setTutorConfig({
            name: saved.tutor_name,
            personality: saved.tutor_personality,
            tone: saved.tutor_tone,
          });
        }}
      />
    </div>
  );
}
