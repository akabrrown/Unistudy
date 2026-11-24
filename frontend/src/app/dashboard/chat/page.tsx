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
  Eye,
  FileText,
  Image as ImageIcon,
  Quote,
  Square,
  Brain,
  Globe,
  Mic,
  MicOff,
  Share2,
  FileDown,
  Printer,
  Play,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { StreamAskError, streamAsk, stripProtocolTags, type AskFinalPayload } from '@/lib/chat/streamAsk';
import { useSpeechInput } from '@/components/chat/useSpeechInput';
import { MemoryDialog } from '@/components/chat/MemoryDialog';
import { FeedbackButtons } from '@/components/chat/FeedbackButtons';
import { SaveFlashcardsDialog } from '@/components/chat/SaveFlashcardsDialog';
import { ContextMeter, CONTEXT_TOKEN_LIMIT, estimateTokens } from '@/components/chat/ContextMeter';
import { downloadAnswerMarkdown, printAnswerAsPdf } from '@/lib/chat/exportAnswer';
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

interface ChatAttachment {
  name: string;
  size: number;
  type: string;
  data: string; // data URL base64
  textContent?: string;
  isImage: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  referencedDeck?: ReferencedDeck | null;
  attachment?: ChatAttachment | null;
  attachments?: ChatAttachment[];
  quotedText?: string;
  followups?: string[];
  sources?: Array<{ title: string; uri: string }>;
  feedback?: 'up' | 'down';
  isSummary?: boolean;
  branches?: ChatMessage[][];
  branchIndex?: number;
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
  const [runState, setRunState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [runOutput, setRunOutput] = useState('');
  const codeString = String(children).replace(/\n$/, '');
  const langMatch = className?.match(/language-(\w+)/);
  const lang = langMatch ? langMatch[1] : 'code';
  const isPython = lang === 'python' || lang === 'py';

  const onRun = async () => {
    setRunState('loading');
    setRunOutput('');
    try {
      const w = window as unknown as { loadPyodide?: (cfg: { indexURL: string }) => Promise<any>; __pyodide?: any };
      if (!w.__pyodide) {
        if (!w.loadPyodide) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('Could not load the Python runtime'));
            document.head.appendChild(s);
          });
        }
        w.__pyodide = await w.loadPyodide!({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/' });
      }
      const py = w.__pyodide;
      let out = '';
      py.setStdout({ batched: (line: string) => (out += `${line}\n`) });
      py.setStderr({ batched: (line: string) => (out += `${line}\n`) });
      const result = await py.runPythonAsync(codeString);
      if (result !== undefined && result !== null) out += `${String(result)}\n`;
      setRunOutput(out.trimEnd() || '(no output)');
    } catch (err) {
      setRunOutput(err instanceof Error ? err.message : 'Run failed');
    } finally {
      setRunState('done');
    }
  };

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
        <div className="flex items-center gap-1">
          {isPython && (
            <button
              type="button"
              onClick={() => void onRun()}
              disabled={runState === 'loading'}
              className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-white/10 disabled:opacity-50"
              title="Run in your browser (Python runtime downloads on first run)"
            >
              <Play className="h-3 w-3" />
              <span>{runState === 'loading' ? 'Running…' : 'Run'}</span>
            </button>
          )}
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
      </div>
      <pre className="p-4 overflow-x-auto leading-relaxed scrollbar-thin">
        <code>{codeString}</code>
      </pre>
      {runState !== 'idle' && (
        <div className="border-t border-border/40 bg-black/30 px-4 py-2.5">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Output</div>
          <pre className="whitespace-pre-wrap break-words text-slate-200">
            {runState === 'loading' ? 'Starting Python…' : runOutput}
          </pre>
        </div>
      )}
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

function cleanChatTitle(raw?: string | null): string {
  if (!raw) return 'AI Study Tutor & Assistant';
  const clean = raw
    .replace(/^(\/test|\/plan|\/explain|\/summary)\s*/i, '')
    .replace(/<!\s*DOCTYPE[^>]*>/gi, '')
    .replace(/<\/?[a-z0-9_-]+[^>]*>/gi, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return clean || 'AI Study Tutor & Assistant';
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
  const [freePasses, setFreePasses] = useState<number | null>(null);
  const [paidCredits, setPaidCredits] = useState<number | null>(null);
  const [secondsUntilRefill, setSecondsUntilRefill] = useState<number | null>(null);
  const [tutorConfig, setTutorConfig] = useState<{ name: string; personality: string; tone: string }>({
    name: 'Alex',
    personality: 'encouraging',
    tone: 'academic',
  });

  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [quotedText, setQuotedText] = useState<string | null>(null);
  const [referencedSessionId, setReferencedSessionId] = useState<string | null>(null);
  const [isRefPickerOpen, setIsRefPickerOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const streamBufferRef = useRef('');
  const [webSearchOn, setWebSearchOn] = useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [flashcardSource, setFlashcardSource] = useState<{ text: string; lectureId?: string } | null>(null);
  const [exportMenuId, setExportMenuId] = useState<string | null>(null);
  const [interimSpeech, setInterimSpeech] = useState('');
  const [isCompacting, setIsCompacting] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [previewModalImage, setPreviewModalImage] = useState<{ src: string; alt: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // Strict 5MB limit

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  const MAX_ATTACHMENTS = 5;

  const readFileAsAttachment = useCallback(
    (file: File): Promise<ChatAttachment | null> =>
      new Promise((resolve) => {
        const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);
        const isTextDoc =
          file.type.startsWith('text/') ||
          /\.(txt|md|csv|json|py|java|cpp|c|r|sql|html|css|js|ts|tsx)$/i.test(file.name);
        const reader = new FileReader();
        reader.onerror = () => resolve(null);
        reader.onload = () => {
          const dataUrl = reader.result as string;
          if (isTextDoc) {
            const textReader = new FileReader();
            textReader.onerror = () => resolve(null);
            textReader.onload = () =>
              resolve({
                name: file.name,
                size: file.size,
                type: file.type || 'text/plain',
                data: dataUrl,
                textContent: textReader.result as string,
                isImage: false,
              });
            textReader.readAsText(file);
          } else {
            resolve({
              name: file.name,
              size: file.size,
              type: file.type || (isImage ? 'image/jpeg' : 'application/pdf'),
              data: dataUrl,
              isImage,
            });
          }
        };
        reader.readAsDataURL(file);
      }),
    []
  );

  const handleProcessFiles = useCallback(
    async (incoming: File[]) => {
      if (incoming.length === 0) return;
      const slots = MAX_ATTACHMENTS - pendingAttachments.length;
      if (slots <= 0) {
        toast.error('You can attach up to 5 files at a time. Remove one to add another.');
        return;
      }
      if (incoming.length > slots) {
        toast.info(`Only ${slots} more file${slots === 1 ? '' : 's'} fit. Keeping the first ${slots}.`);
      }
      const accepted: File[] = [];
      for (const file of incoming.slice(0, slots)) {
        if (file.size > MAX_ATTACHMENT_BYTES) {
          toast.error(`"${file.name}" exceeds the 5MB limit (${formatFileSize(file.size)}).`);
          continue;
        }
        accepted.push(file);
      }
      const results = (await Promise.all(accepted.map(readFileAsAttachment))).filter(
        (a): a is ChatAttachment => a !== null
      );
      if (results.length > 0) {
        setPendingAttachments((prev) => [...prev, ...results].slice(0, MAX_ATTACHMENTS));
        toast.success(`Attached ${results.length} file${results.length === 1 ? '' : 's'}`);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [pendingAttachments.length, MAX_ATTACHMENT_BYTES, formatFileSize, readFileAsAttachment]
  );

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const item of Array.from(items)) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      void handleProcessFiles(files);
    }
  }, [handleProcessFiles]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const dropped = Array.from(e.dataTransfer.files || []);
    if (dropped.length > 0) {
      void handleProcessFiles(dropped);
    }
  };

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
          if (isMounted) {
            if (typeof data.wallet_balance === 'number') setWalletCredits(data.wallet_balance);
            else if (typeof data.walletBalance === 'number') setWalletCredits(data.walletBalance);
            if (typeof data.free_passes === 'number') setFreePasses(data.free_passes);
            if (typeof data.paid_credits === 'number') setPaidCredits(data.paid_credits);
            if (typeof data.seconds_until_refill === 'number') setSecondsUntilRefill(data.seconds_until_refill);
          }
        }
      } catch {
        // Fallback to initial
      }
    }
    fetchCredits();

    const handleCreditsChanged = (e: Event) => {
      const ce = e as CustomEvent<{ balance?: number; freePasses?: number; paidCredits?: number; secondsUntilRefill?: number }>;
      if (typeof ce.detail?.balance === 'number') {
        setWalletCredits(ce.detail.balance);
      }
      if (typeof ce.detail?.freePasses === 'number') {
        setFreePasses(ce.detail.freePasses);
      }
      if (typeof ce.detail?.paidCredits === 'number') {
        setPaidCredits(ce.detail.paidCredits);
      }
      if (typeof ce.detail?.secondsUntilRefill === 'number') {
        setSecondsUntilRefill(ce.detail.secondsUntilRefill);
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
  const abortRef = useRef<AbortController | null>(null);
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

  const buildPreviousSessionsContext = useCallback((): string => {
    const MAX_TOTAL = 40000;
    const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);
    const others = sessions
      .filter((s) => s.id !== activeSessionId && s.messages.some((m) => m.role === 'user'))
      .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());

    const explicit = referencedSessionId ? others.find((s) => s.id === referencedSessionId) : null;
    const recent = others.filter((s) => s.id !== explicit?.id).slice(0, 6);

    const render = (s: ConversationSession, maxMsgs: number, maxChars: number, label: string) => {
      const turns = s.messages
        .slice(-maxMsgs)
        .map((m) => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${clip(m.content.replace(/\s+/g, ' '), maxChars)}`)
        .join('\n');
      const deck = s.referencedDeck ? ` | Deck: ${s.referencedDeck.courseCode} ${s.referencedDeck.lectureTitle}` : '';
      return `### ${label}: "${s.title}" (${new Date(s.updatedAt || Date.now()).toLocaleDateString()})${deck}\n${turns}`;
    };

    const blocks: string[] = [];
    if (explicit) blocks.push(render(explicit, 24, 900, 'EXPLICITLY REFERENCED CONVERSATION'));
    recent.forEach((s) => blocks.push(render(s, 6, 350, 'Recent conversation')));
    return blocks.join('\n\n').slice(0, MAX_TOTAL);
  }, [sessions, activeSessionId, referencedSessionId]);

  // Submit message
  const handleSendMessage = async (
    textToSend?: string,
    opts?: {
      baseMessages?: ChatMessage[];
      attachments?: ChatAttachment[];
      quote?: string | null;
      branches?: ChatMessage[][];
      branchIndex?: number;
    }
  ) => {
    const rawText = (textToSend ?? inputPrompt).trim();
    const attachmentsToSend = opts?.attachments ?? pendingAttachments.map((a) => ({ ...a }));
    if ((!rawText && attachmentsToSend.length === 0) || isLoading || !activeSessionId) return;

    const quote = opts && 'quote' in opts ? opts.quote : textToSend === undefined ? quotedText : null;
    const text = quote
      ? `${quote
          .split('\n')
          .map((l) => `> ${l}`)
          .join('\n')}\n\n${rawText}`.trim()
      : rawText;
    const baseMessages = opts?.baseMessages ?? messages;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      role: 'user',
      content:
        text ||
        `Please analyze and explain the attached file${attachmentsToSend.length === 1 ? '' : 's'} (${attachmentsToSend.map((a) => a.name).join(', ')}).`,
      timestamp: new Date().toISOString(),
      referencedDeck: activeDeck ? { ...activeDeck } : null,
      attachments: attachmentsToSend,
      branches: opts?.branches,
      branchIndex: opts?.branchIndex,
    };

    const newMessages = [...baseMessages, userMessage];

    // Auto-generate title from the first student message
    const isFirstUserMessage = baseMessages.length === 0;
    const computedTitle = isFirstUserMessage
      ? cleanChatTitle(rawText || attachmentsToSend[0]?.name || 'Study Session').slice(0, 60)
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
    setPendingAttachments([]);
    setQuotedText(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setIsLoading(true);

    try {
      const historyForApi: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      let charBudget = CONTEXT_TOKEN_LIMIT * 4;
      for (let i = newMessages.length - 1; i >= 0; i--) {
        const m = newMessages[i];
        const len = m.content.length;
        if (historyForApi.length > 0 && charBudget - len < 0) break;
        charBudget -= len;
        historyForApi.unshift({ role: m.role, content: m.content });
      }

      const payload: Record<string, any> = {
        messages: historyForApi,
        temperature: 0.55,
        model: selectedModel,
        stream: true,
        webSearch: webSearchOn,
        tutorName: tutorConfig.name,
        tutorPersonality: tutorConfig.personality,
        tutorTone: tutorConfig.tone,
        studentConfig: {
          personality: tutorConfig.personality,
          tone: tutorConfig.tone,
        },
      };

      if (attachmentsToSend.length > 0) {
        payload.attachments = attachmentsToSend.map((a) => ({
          name: a.name,
          type: a.type,
          size: a.size,
          data: a.data,
          textContent: a.textContent,
        }));
      }

      const memoryContext = buildPreviousSessionsContext();
      if (memoryContext) {
        payload.previousSessionsContext = memoryContext;
      }

      if (activeDeck) {
        payload.grounding = {
          lectureId: activeDeck.lectureId,
          courseContext: `${activeDeck.courseCode}: ${activeDeck.courseTitle}`,
        };
      }

      const controller = new AbortController();
      abortRef.current = controller;
      streamBufferRef.current = '';
      setStreamingText('');

      let data: AskFinalPayload;
      try {
        data = await streamAsk(
          { feature: 'ai-tutor', payload },
          {
            signal: controller.signal,
            onDelta: (chunk) => {
              streamBufferRef.current += chunk;
              setStreamingText(streamBufferRef.current);
            },
            onReset: () => {
              streamBufferRef.current = '';
              setStreamingText('');
            },
          }
        );
      } catch (streamErr) {
        if (
          streamErr instanceof StreamAskError &&
          (streamErr.status === 402 || streamErr.code === 'INSUFFICIENT_CREDITS')
        ) {
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
        throw streamErr;
      }

      // Instantly synchronize live deducted credits across the entire application
      if (typeof data.remainingCredits === 'number') {
        setWalletCredits(data.remainingCredits);
        if (typeof data.freePasses === 'number') setFreePasses(data.freePasses);
        if (typeof data.paidCredits === 'number') setPaidCredits(data.paidCredits);
        if (typeof data.secondsUntilRefill === 'number') setSecondsUntilRefill(data.secondsUntilRefill);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('unistudy-credits-changed', {
              detail: {
                balance: data.remainingCredits,
                freePasses: data.freePasses,
                paidCredits: data.paidCredits,
                secondsUntilRefill: data.secondsUntilRefill,
              },
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
        followups: data.followups && data.followups.length > 0 ? data.followups : undefined,
        sources: data.sources && data.sources.length > 0 ? data.sources : undefined,
      };

      if (data.memorySaved && data.memorySaved.length > 0) {
        toast.success(`Remembered: ${data.memorySaved[0]}`, {
          description: 'Manage what your tutor remembers from the Memory button.',
        });
      }

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
      if (err instanceof DOMException && err.name === 'AbortError') {
        const partial = stripProtocolTags(streamBufferRef.current).trim();
        if (partial) {
          const partialMessage: ChatMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            role: 'assistant',
            content: `${partial}\n\n*Response stopped.*`,
            timestamp: new Date().toISOString(),
            referencedDeck: activeDeck ? { ...activeDeck } : null,
            modelUsed: selectedModel,
          };
          setSessions((prev) =>
            prev.map((s) =>
              s.id === activeSessionId
                ? { ...s, messages: [...s.messages, partialMessage], updatedAt: new Date().toISOString() }
                : s
            )
          );
        }
        toast.info('Stopped. Edit your message or send a new one.');
        return;
      }
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
      streamBufferRef.current = '';
      setStreamingText('');
      abortRef.current = null;
      setIsLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const getMessageAttachments = (m: ChatMessage): ChatAttachment[] =>
    m.attachments && m.attachments.length > 0 ? m.attachments : m.attachment ? [m.attachment] : [];

  const handleRegenerate = (assistantMessageId: string) => {
    if (isLoading) return;
    const idx = messages.findIndex((m) => m.id === assistantMessageId);
    if (idx < 0) return;
    let userIdx = idx - 1;
    while (userIdx >= 0 && messages[userIdx].role !== 'user') userIdx--;
    if (userIdx < 0) return;
    const userMsg = messages[userIdx];
    void handleSendMessage(userMsg.content, {
      baseMessages: messages.slice(0, userIdx),
      attachments: getMessageAttachments(userMsg),
      quote: null,
    });
  };

  const handleSubmitEdit = (messageId: string) => {
    if (isLoading) return;
    const idx = messages.findIndex((m) => m.id === messageId);
    const edited = editingMessageText.trim();
    if (idx < 0 || !edited) return;
    const original = messages[idx];
    const tail = messages.slice(idx).map((m, i) => (i === 0 ? { ...m, branches: undefined, branchIndex: undefined } : m));
    const variants: ChatMessage[][] = original.branches ? [...original.branches] : [];
    variants[original.branchIndex ?? 0] = tail;
    const newIndex = variants.length;
    variants.push([]);
    setEditingMessageId(null);
    setEditingMessageText('');
    void handleSendMessage(edited, {
      baseMessages: messages.slice(0, idx),
      attachments: getMessageAttachments(original),
      quote: null,
      branches: variants,
      branchIndex: newIndex,
    });
  };

  const handleSwitchBranch = (messageId: string, delta: -1 | 1) => {
    if (isLoading) return;
    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx < 0) return;
    const msg = messages[idx];
    if (!msg.branches) return;
    const variants = [...msg.branches];
    const current = msg.branchIndex ?? 0;
    variants[current] = messages.slice(idx).map((m, i) => (i === 0 ? { ...m, branches: undefined, branchIndex: undefined } : m));
    const target = current + delta;
    if (target < 0 || target >= variants.length || variants[target].length === 0) return;
    const newTail = [...variants[target]];
    newTail[0] = { ...newTail[0], branches: variants, branchIndex: target };
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, messages: [...messages.slice(0, idx), ...newTail], updatedAt: new Date().toISOString() }
          : s
      )
    );
  };

  const contextTokens = useMemo(
    () => messages.reduce((sum, m) => sum + estimateTokens(m.content), 0),
    [messages]
  );

  const handleCompactContext = async () => {
    if (isLoading || isCompacting || messages.length < 6) return;
    let cut = messages.length - 4;
    while (cut > 0 && messages[cut].role !== 'user') cut--;
    if (cut < 2) {
      toast.info('Not enough earlier turns to summarise yet.');
      return;
    }
    const older = messages.slice(0, cut);
    setIsCompacting(true);
    try {
      const transcript = older
        .map((m) => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content.slice(0, 1800)}`)
        .join('\n\n')
        .slice(0, 30000);
      const final = await streamAsk({
        feature: 'chat-utility',
        payload: {
          temperature: 0.2,
          systemPrompt:
            'Summarise this tutoring conversation in under 350 words. Keep: topics covered, key definitions and formulas, conclusions reached, unresolved questions, and what the student struggled with. Use short bullet points. Plain markdown, no preamble.',
          messages: [{ role: 'user', content: transcript }],
        },
      });
      const summary = stripProtocolTags(final.result?.choices?.[0]?.message?.content || '').trim();
      if (!summary) throw new Error('The summary came back empty.');
      const summaryMessage: ChatMessage = {
        id: `msg-summary-${Date.now()}`,
        role: 'assistant',
        content: `**Summary of earlier conversation**\n\n${summary}`,
        timestamp: new Date().toISOString(),
        isSummary: true,
        modelUsed: final.modelUsed,
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, messages: [summaryMessage, ...messages.slice(cut)], updatedAt: new Date().toISOString() }
            : s
        )
      );
      if (typeof final.remainingCredits === 'number') {
        setWalletCredits(final.remainingCredits);
        if (typeof final.freePasses === 'number') setFreePasses(final.freePasses);
        if (typeof final.paidCredits === 'number') setPaidCredits(final.paidCredits);
        window.dispatchEvent(
          new CustomEvent('unistudy-credits-changed', {
            detail: {
              balance: final.remainingCredits,
              freePasses: final.freePasses,
              paidCredits: final.paidCredits,
              secondsUntilRefill: final.secondsUntilRefill,
            },
          })
        );
      }
      toast.success('Earlier turns summarised');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not summarise the conversation');
    } finally {
      setIsCompacting(false);
    }
  };

  const speech = useSpeechInput({
    onFinalText: (t) => setInputPrompt((prev) => (prev ? `${prev} ${t}` : t)),
    onInterim: setInterimSpeech,
    onError: (m) => toast.error(m),
  });

  const handleCopyLink = async (message: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success('Answer copied as text');
    } catch {
      toast.error('Could not copy');
    }
    setExportMenuId(null);
  };

  const handleExportMarkdown = (message: ChatMessage) => {
    downloadAnswerMarkdown(currentSession?.title || 'Tutor answer', message.content);
    setExportMenuId(null);
  };

  const handleExportPdf = (message: ChatMessage) => {
    const el = document.getElementById(`msg-body-${message.id}`);
    const ok = printAnswerAsPdf(currentSession?.title || 'Tutor answer', el?.innerHTML || '');
    if (!ok) toast.error('Allow pop-ups to export as PDF');
    setExportMenuId(null);
  };

  const handleMessageBodyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const katexEl = target.closest('.katex-display, .katex');
    if (!katexEl) return;
    const tex = katexEl.querySelector('annotation[encoding="application/x-tex"]')?.textContent;
    if (!tex) return;
    navigator.clipboard
      .writeText(tex)
      .then(() => toast.success('LaTeX copied'))
      .catch(() => toast.error('Could not copy LaTeX'));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleStartNewChat();
      } else if (mod && e.key === '/') {
        e.preventDefault();
        textareaRef.current?.focus();
      } else if (e.key === 'Escape' && abortRef.current) {
        abortRef.current.abort();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, activeSessionId]);

  const handleQuoteMessage = (content: string) => {
    const clean = content.replace(/\s+/g, ' ').trim();
    setQuotedText(clean.length > 600 ? `${clean.slice(0, 600)}…` : clean);
    setTimeout(() => textareaRef.current?.focus(), 30);
  };

  // Handle enter key to send
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'ArrowUp' && !inputPrompt && !isLoading) {
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      if (lastUser) {
        e.preventDefault();
        setEditingMessageId(lastUser.id);
        setEditingMessageText(lastUser.content);
        return;
      }
    }
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
                            {cleanChatTitle(s.title)}
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
        <header className="flex-shrink-0 bg-card border border-border rounded-2xl p-3 sm:p-4 shadow-xs mb-3 space-y-3">
          <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-3 min-w-0">
            <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsHistoryOpen((prev) => !prev)}
                className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 text-[#00004E] dark:text-[#D89A06] border-border hover:border-[#D89A06]"
                title={isHistoryOpen ? 'Collapse chat history' : 'Expand chat history'}
              >
                {isHistoryOpen ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeftOpen className="h-4 w-4" />
                )}
              </Button>

              <UniStudyLogo variant="icon" height={30} className="shrink-0" alt="UniStudy AI Study Tutor" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <h1
                    className="text-base sm:text-lg md:text-xl font-black tracking-tight text-[#00004E] dark:text-white truncate"
                    title={cleanChatTitle(currentSession?.title)}
                  >
                    {cleanChatTitle(currentSession?.title)}
                  </h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D89A06]/20 text-[#8C6404] dark:text-[#D89A06] border border-[#D89A06]/40 uppercase tracking-wide shrink-0 hidden sm:inline-flex items-center">
                    {tutorConfig.name} ({tutorConfig.personality})
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  Personalized Tutor {tutorConfig.name} · {tutorConfig.tone === 'casual' ? 'Casual & Relatable' : 'Academic & Scholarly'} · Slide Grounding &amp; Mentoring
                </p>
              </div>
            </div>

            {/* Model Selector & Action Toolbar */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0">
              {/* Dynamic Model Selector Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl border border-[#D89A06]/40 bg-[#FEF8E7] dark:bg-white/10 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-[#00004E] dark:text-[#D89A06] hover:border-[#D89A06] transition-colors cursor-pointer shadow-2xs"
                >
                  <activeModelConfig.icon className={cn('h-3.5 w-3.5', activeModelConfig.color)} />
                  <span className="truncate max-w-[85px] sm:max-w-none">{activeModelConfig.name}</span>
                  <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
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
                className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl border border-[#D89A06]/40 bg-[#FEF8E7] dark:bg-white/10 px-2 sm:px-2.5 py-1.5 text-xs font-bold text-[#00004E] dark:text-[#D89A06] hover:border-[#D89A06] transition-colors shadow-2xs group"
                title={`Dual-Pocket Wallet: ${freePasses ?? 8}/8 Free 6h Passes + ${paidCredits ?? 20} Paid Credits (Never expires)`}
              >
                <div className="flex items-center gap-1">
                  <span className="text-[#D89A06]">⚡</span>
                  <span>{freePasses ?? 8}/8 Free</span>
                  {secondsUntilRefill !== null && (freePasses ?? 8) < 8 && secondsUntilRefill > 0 && (
                    <span className="text-[10px] text-muted-foreground font-mono hidden 2xl:inline">
                      ({Math.floor(secondsUntilRefill / 3600)}h {Math.floor((secondsUntilRefill % 3600) / 60)}m)
                    </span>
                  )}
                </div>
                {(paidCredits ?? 0) > 0 && (
                  <div className="flex items-center gap-1 border-l border-[#D89A06]/30 pl-1.5">
                    <span className="text-xs">🪙</span>
                    <span>{paidCredits} Paid</span>
                  </div>
                )}
              </Link>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCalibrateDialogOpen(true)}
                className="text-xs font-semibold h-8 px-2 sm:px-2.5 border-[#D89A06]/40 text-[#00004E] dark:text-[#D89A06] hover:bg-[#FEF8E7]/60 dark:hover:bg-white/5"
                title="Calibrate Tutor Name, Tone & Personality"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 sm:mr-1 text-[#D89A06]" />
                <span className="hidden xl:inline">Calibrate</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMemoryOpen(true)}
                className="text-xs font-semibold h-8 px-2 sm:px-2.5 border-[#D89A06]/40 text-[#00004E] dark:text-[#D89A06] hover:bg-[#FEF8E7]/60 dark:hover:bg-white/5"
                title="See and edit what your tutor remembers"
              >
                <Brain className="h-3.5 w-3.5 sm:mr-1 text-[#D89A06]" />
                <span className="hidden xl:inline">Memory</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportChat}
                disabled={messages.length === 0}
                className="text-xs font-semibold h-8 px-2 sm:px-2.5"
                title="Export as Markdown"
              >
                <Download className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden xl:inline">Export</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleStartNewChat}
                className="text-xs font-semibold h-8 px-2.5 sm:px-3 text-[#00004E] dark:text-[#D89A06] border-[#D89A06]/40 hover:bg-[#FEF8E7]"
                title="Start a fresh chat"
              >
                <Plus className="h-3.5 w-3.5 sm:mr-1 text-[#D89A06]" />
                <span className="hidden sm:inline">New Chat</span>
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
                  <span className="font-medium text-foreground break-words">
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
                        {getMessageAttachments(message).length > 0 && (
                          <div className="mb-2.5 flex flex-wrap gap-2">
                            {getMessageAttachments(message).map((att, attIdx) =>
                              att.isImage ? (
                                <div
                                  key={`${att.name}-${attIdx}`}
                                  onClick={() => setPreviewModalImage({ src: att.data, alt: att.name })}
                                  className="relative rounded-xl overflow-hidden border border-white/20 bg-black/20 cursor-pointer hover:opacity-95 transition-opacity group shadow-xs"
                                  style={{ width: getMessageAttachments(message).length > 1 ? 120 : 280 }}
                                  title="Click to view full image"
                                >
                                  <img
                                    src={att.data}
                                    alt={att.name}
                                    className={cn(
                                      'w-full object-cover rounded-xl',
                                      getMessageAttachments(message).length > 1 ? 'h-24' : 'h-auto max-h-60 object-contain'
                                    )}
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold gap-1.5">
                                    <Eye className="h-3.5 w-3.5" /> View
                                  </div>
                                </div>
                              ) : (
                                <div
                                  key={`${att.name}-${attIdx}`}
                                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/10 border border-white/20 max-w-[220px]"
                                >
                                  <FileText className="h-4 w-4 text-[#D89A06] shrink-0" />
                                  <div className="min-w-0">
                                    <div className="font-bold truncate text-white text-xs">{att.name}</div>
                                    <div className="text-[10px] text-white/70">{formatFileSize(att.size)}</div>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        )}
                        {editingMessageId === message.id ? (
                          <div className="space-y-2 min-w-[240px] md:min-w-[420px]">
                            <textarea
                              value={editingMessageText}
                              onChange={(e) => setEditingMessageText(e.target.value)}
                              rows={Math.min(8, Math.max(2, editingMessageText.split('\n').length))}
                              autoFocus
                              className="w-full rounded-lg bg-white/10 border border-white/30 p-2 text-white text-xs md:text-sm focus:outline-none focus:border-[#D89A06] resize-none"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMessageId(null);
                                  setEditingMessageText('');
                                }}
                                className="px-3 py-1 rounded-lg text-[11px] font-bold border border-white/30 hover:bg-white/10 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSubmitEdit(message.id)}
                                disabled={!editingMessageText.trim() || isLoading}
                                className="px-3 py-1 rounded-lg text-[11px] font-bold bg-[#D89A06] text-[#00004E] hover:bg-[#C28905] cursor-pointer disabled:opacity-40"
                              >
                                Save &amp; resend
                              </button>
                            </div>
                          </div>
                        ) : (
                          message.content
                        )}
                      </div>
                      {editingMessageId !== message.id && (
                        <div className="flex items-center gap-1 px-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMessageId(message.id);
                              setEditingMessageText(message.content);
                            }}
                            disabled={isLoading}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-40"
                            title="Edit and resend"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuoteMessage(message.content)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                            title="Quote in reply"
                          >
                            <Quote className="h-3.5 w-3.5" />
                          </button>
                          {message.branches && message.branches.length > 1 && (
                            <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground font-mono">
                              <button
                                type="button"
                                onClick={() => handleSwitchBranch(message.id, -1)}
                                disabled={isLoading || (message.branchIndex ?? 0) === 0}
                                className="p-1 rounded hover:bg-muted disabled:opacity-30 cursor-pointer"
                                title="Previous version"
                              >
                                <ChevronLeft className="h-3.5 w-3.5" />
                              </button>
                              {(message.branchIndex ?? 0) + 1}/{message.branches.length}
                              <button
                                type="button"
                                onClick={() => handleSwitchBranch(message.id, 1)}
                                disabled={
                                  isLoading ||
                                  (message.branchIndex ?? 0) >= message.branches.length - 1 ||
                                  message.branches[(message.branchIndex ?? 0) + 1]?.length === 0
                                }
                                className="p-1 rounded hover:bg-muted disabled:opacity-30 cursor-pointer"
                                title="Next version"
                              >
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          )}
                        </div>
                      )}
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
                          <button
                            type="button"
                            onClick={() => handleQuoteMessage(message.content)}
                            className="p-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                            title="Ask about this answer"
                          >
                            <Quote className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRegenerate(message.id)}
                            disabled={isLoading}
                            className="p-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-40"
                            title="Regenerate response"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                          <FeedbackButtons
                            sessionId={activeSessionId || ''}
                            messageId={message.id}
                            modelUsed={message.modelUsed}
                            initialRating={message.feedback}
                            onRated={(rating) =>
                              setSessions((prev) =>
                                prev.map((s) =>
                                  s.id === activeSessionId
                                    ? {
                                        ...s,
                                        messages: s.messages.map((m) =>
                                          m.id === message.id ? { ...m, feedback: rating } : m
                                        ),
                                      }
                                    : s
                                )
                              )
                            }
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setFlashcardSource({
                                text: message.content,
                                lectureId: message.referencedDeck?.lectureId,
                              })
                            }
                            className="p-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                            title="Save as flashcards"
                          >
                            <Layers className="h-3.5 w-3.5" />
                          </button>
                          <span className="relative inline-flex">
                            <button
                              type="button"
                              onClick={() => setExportMenuId((cur) => (cur === message.id ? null : message.id))}
                              className="p-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                              title="Share or export this answer"
                              aria-haspopup="menu"
                              aria-expanded={exportMenuId === message.id}
                            >
                              <Share2 className="h-3.5 w-3.5" />
                            </button>
                            {exportMenuId === message.id && (
                              <div
                                role="menu"
                                className="absolute top-full right-0 mt-1 z-20 w-44 rounded-xl border border-border bg-card shadow-lg p-1.5"
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => void handleCopyLink(message)}
                                  className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-lg text-xs hover:bg-[#FEF8E7] dark:hover:bg-white/10 cursor-pointer"
                                >
                                  <Copy className="h-3.5 w-3.5" /> Copy as text
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => handleExportMarkdown(message)}
                                  className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-lg text-xs hover:bg-[#FEF8E7] dark:hover:bg-white/10 cursor-pointer"
                                >
                                  <FileDown className="h-3.5 w-3.5" /> Download .md
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => handleExportPdf(message)}
                                  className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-lg text-xs hover:bg-[#FEF8E7] dark:hover:bg-white/10 cursor-pointer"
                                >
                                  <Printer className="h-3.5 w-3.5" /> Print / save PDF
                                </button>
                              </div>
                            )}
                          </span>
                          <span className="text-[11px] text-muted-foreground ml-1 font-mono">
                            {new Date(message.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Enriched Content Body */}
                      <div
                        id={`msg-body-${message.id}`}
                        onClick={handleMessageBodyClick}
                        className="p-4 md:p-6 text-xs md:text-sm leading-relaxed"
                      >
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={markdownComponents}
                        >
                          {formatContentWithSlideLinks(message.content, message.referencedDeck)}
                        </ReactMarkdown>
                      </div>

                      {message.sources && message.sources.length > 0 && (
                        <div className="px-4 md:px-6 py-3 border-t border-border/70 flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                            <Globe className="h-3.5 w-3.5 text-[#D89A06]" />
                            Web sources:
                          </span>
                          {message.sources.map((src, srcIdx) => {
                            let host = src.uri;
                            try {
                              host = new URL(src.uri).hostname.replace(/^www\./, '');
                            } catch {}
                            return (
                              <a
                                key={`${src.uri}-${srcIdx}`}
                                href={src.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 max-w-[220px] px-2 py-1 rounded-lg bg-muted/50 border border-border text-[11px] font-medium text-foreground hover:border-[#D89A06] transition-colors"
                                title={src.title}
                              >
                                <span className="font-mono text-[10px] text-muted-foreground">{srcIdx + 1}</span>
                                <span className="truncate">{src.title || host}</span>
                                <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                              </a>
                            );
                          })}
                        </div>
                      )}

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

                      {message.followups &&
                        message.followups.length > 0 &&
                        !isLoading &&
                        message.id === messages[messages.length - 1]?.id && (
                          <div className="px-4 md:px-6 py-3 border-t border-border/50 flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground">
                              Ask next:
                            </span>
                            {message.followups.map((q, qIdx) => (
                              <button
                                key={`${q}-${qIdx}`}
                                type="button"
                                onClick={() => void handleSendMessage(q)}
                                className="text-left px-3 py-1.5 rounded-full bg-card border border-[#D89A06]/50 hover:bg-[#FEF8E7] dark:hover:bg-white/10 text-[11px] font-medium text-[#00004E] dark:text-[#D89A06] transition-all cursor-pointer active:scale-95"
                              >
                                {q}
                              </button>
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

          {/* Live streaming reply */}
          {isLoading && streamingText.trim().length > 0 && (
            <div className="w-full max-w-4xl mr-auto rounded-2xl border border-border/80 border-l-[4px] border-l-[#D89A06] bg-card shadow-xs overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 md:px-5 py-2.5 bg-[#00004E]/[0.03] dark:bg-white/[0.03] border-b border-border/60">
                <UniStudyLogo variant="icon" height={26} className="shrink-0" alt="UniStudy AI Tutor" />
                <span className="font-bold text-xs text-[#00004E] dark:text-white">UniStudy AI Tutor</span>
                <span className="inline-flex gap-1" aria-hidden="true">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#D89A06] animate-pulse" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#D89A06] animate-pulse [animation-delay:0.2s]" />
                </span>
              </div>
              <div className="p-4 md:p-6 text-xs md:text-sm leading-relaxed" aria-live="polite">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={markdownComponents}
                >
                  {stripProtocolTags(streamingText)}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && streamingText.trim().length === 0 && (
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

          {speech.isListening && interimSpeech && (
            <p className="px-2 text-[11px] italic text-muted-foreground" aria-live="polite">
              Listening: {interimSpeech}
            </p>
          )}

          <ContextMeter
            usedTokens={contextTokens}
            canCompact={messages.length >= 6}
            isBusy={isLoading || isCompacting}
            onCompact={() => void handleCompactContext()}
          />

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

          {/* Context chips: quoted reply + referenced past chat */}
          {(quotedText || referencedSessionId) && (
            <div className="flex flex-wrap items-start gap-2">
              {quotedText && (
                <div className="flex items-start gap-2 flex-1 min-w-[220px] p-2.5 rounded-xl bg-muted/40 border border-border border-l-4 border-l-[#D89A06]">
                  <Quote className="h-3.5 w-3.5 mt-0.5 text-[#D89A06] shrink-0" />
                  <p className="flex-1 text-[11px] text-muted-foreground line-clamp-2 break-words">{quotedText}</p>
                  <button
                    type="button"
                    onClick={() => setQuotedText(null)}
                    className="p-0.5 rounded hover:bg-muted text-muted-foreground cursor-pointer"
                    title="Remove quote"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              {referencedSessionId && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FEF8E7] dark:bg-white/10 border border-[#D89A06]/40 max-w-full">
                  <Clock className="h-3.5 w-3.5 text-[#D89A06] shrink-0" />
                  <span className="text-[11px] font-semibold text-[#00004E] dark:text-white truncate max-w-[240px]">
                    Using chat: {sessions.find((s) => s.id === referencedSessionId)?.title || 'Past chat'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setReferencedSessionId(null)}
                    className="p-0.5 rounded hover:bg-black/10 text-muted-foreground cursor-pointer"
                    title="Stop referencing this chat"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Attachment Preview Strip (up to 5) */}
          {pendingAttachments.length > 0 && (
            <div className="p-2.5 rounded-xl bg-[#FEF8E7] dark:bg-[#00004E]/50 border border-[#D89A06]/40 shadow-xs animate-in fade-in duration-150 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-[#00004E] dark:text-white">
                  {pendingAttachments.length}/{MAX_ATTACHMENTS} files attached
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPendingAttachments([]);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {pendingAttachments.map((att, attIdx) => (
                  <div
                    key={`${att.name}-${attIdx}`}
                    className="relative flex items-center gap-2 pr-7 p-1.5 rounded-lg bg-card border border-[#D89A06]/40 max-w-[220px]"
                  >
                    {att.isImage ? (
                      <div
                        onClick={() => setPreviewModalImage({ src: att.data, alt: att.name })}
                        className="h-9 w-9 rounded-md overflow-hidden bg-black/10 shrink-0 cursor-pointer"
                        title="Click to preview image"
                      >
                        <img src={att.data} alt={att.name} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-9 w-9 rounded-md bg-[#00004E] text-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E] flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-[11px] text-[#00004E] dark:text-white truncate">{att.name}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{formatFileSize(att.size)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPendingAttachments((prev) => prev.filter((_, i) => i !== attIdx))}
                      className="absolute top-1 right-1 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer"
                      title={`Remove ${att.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Textarea Input Container */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'relative flex items-end gap-2 bg-card border-2 rounded-2xl p-2 transition-all shadow-xs',
              isDraggingOver
                ? 'border-[#D89A06] bg-[#FEF8E7]/40 dark:bg-white/5 ring-2 ring-[#D89A06]/30'
                : 'border-border focus-within:border-[#D89A06]'
            )}
          >
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.txt,.docx,.csv,.md,.json,.py,.java,.cpp,.c,.r,.sql"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length > 0) void handleProcessFiles(files);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="hidden"
            />

            {/* Attach Files/Images Button (up to 5 at a time, 5MB each) */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || pendingAttachments.length >= MAX_ATTACHMENTS}
              className={cn(
                'h-10 w-10 p-0 rounded-xl shrink-0 cursor-pointer transition-all relative',
                pendingAttachments.length > 0
                  ? 'bg-[#FEF8E7] text-[#00004E] border border-[#D89A06] dark:bg-white/10 dark:text-[#D89A06]'
                  : 'text-muted-foreground hover:text-[#00004E] hover:bg-[#FEF8E7] dark:hover:text-[#D89A06] dark:hover:bg-white/10'
              )}
              title="Attach up to 5 images or files at a time (5MB each)"
            >
              <Paperclip className="h-4 w-4" />
              {pendingAttachments.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-[#D89A06] text-[#00004E] text-[10px] font-bold flex items-center justify-center">
                  {pendingAttachments.length}
                </span>
              )}
            </Button>

            {/* Reference a past chat */}
            <div className="relative shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsRefPickerOpen((v) => !v)}
                disabled={isLoading}
                className={cn(
                  'h-10 w-10 p-0 rounded-xl cursor-pointer transition-all',
                  referencedSessionId
                    ? 'bg-[#FEF8E7] text-[#00004E] border border-[#D89A06] dark:bg-white/10 dark:text-[#D89A06]'
                    : 'text-muted-foreground hover:text-[#00004E] hover:bg-[#FEF8E7] dark:hover:text-[#D89A06] dark:hover:bg-white/10'
                )}
                title="Refer to a previous chat"
              >
                <Clock className="h-4 w-4" />
              </Button>
              {isRefPickerOpen && (
                <div className="absolute bottom-12 left-0 z-30 w-72 max-h-72 overflow-y-auto rounded-xl border border-border bg-card shadow-lg p-1.5 space-y-1">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Refer to a previous chat
                  </div>
                  {sessions.filter((s) => s.id !== activeSessionId && s.messages.some((m) => m.role === 'user')).length === 0 ? (
                    <div className="px-2 py-3 text-xs text-muted-foreground">No earlier conversations yet.</div>
                  ) : (
                    sessions
                      .filter((s) => s.id !== activeSessionId && s.messages.some((m) => m.role === 'user'))
                      .map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setReferencedSessionId(s.id);
                            setIsRefPickerOpen(false);
                            setTimeout(() => textareaRef.current?.focus(), 30);
                          }}
                          className={cn(
                            'w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-[#FEF8E7] dark:hover:bg-white/10 cursor-pointer',
                            referencedSessionId === s.id && 'bg-[#FEF8E7] dark:bg-white/10 font-semibold'
                          )}
                        >
                          <div className="truncate text-[#00004E] dark:text-white">{s.title}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(s.updatedAt || Date.now()).toLocaleDateString()} · {s.messages.length} messages
                          </div>
                        </button>
                      ))
                  )}
                </div>
              )}
            </div>

            {/* Web search toggle */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setWebSearchOn((v) => !v)}
              disabled={isLoading}
              aria-pressed={webSearchOn}
              className={cn(
                'h-10 w-10 p-0 rounded-xl shrink-0 cursor-pointer transition-all',
                webSearchOn
                  ? 'bg-[#00004E] text-white border border-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E]'
                  : 'text-muted-foreground hover:text-[#00004E] hover:bg-[#FEF8E7] dark:hover:text-[#D89A06] dark:hover:bg-white/10'
              )}
              title={webSearchOn ? 'Web search on: answers cite live sources' : 'Turn on web search'}
            >
              <Globe className="h-4 w-4" />
            </Button>

            {/* Voice input */}
            {speech.isSupported && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={speech.toggle}
                disabled={isLoading}
                aria-pressed={speech.isListening}
                className={cn(
                  'h-10 w-10 p-0 rounded-xl shrink-0 cursor-pointer transition-all',
                  speech.isListening
                    ? 'bg-red-500/10 text-red-600 border border-red-500/50 animate-pulse'
                    : 'text-muted-foreground hover:text-[#00004E] hover:bg-[#FEF8E7] dark:hover:text-[#D89A06] dark:hover:bg-white/10'
                )}
                title={speech.isListening ? 'Stop dictation' : 'Dictate your question'}
              >
                {speech.isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            )}

            <textarea
              ref={textareaRef}
              value={inputPrompt}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={
                pendingAttachments.length > 0
                  ? `Ask about ${pendingAttachments.length === 1 ? `"${pendingAttachments[0].name}"` : `these ${pendingAttachments.length} files`}... (e.g. solve, explain, summarize)`
                  : activeDeck
                    ? `Ask anything grounded in "${activeDeck.lectureTitle}"...`
                    : 'Ask anything, or say "refer to our previous conversation"...'
              }
              rows={1}
              disabled={isLoading}
              className="flex-1 bg-transparent px-2 py-2 text-xs md:text-sm resize-none focus:outline-none placeholder:text-muted-foreground/60 max-h-44 overflow-y-auto leading-relaxed"
            />

            <Button
              onClick={() => (isLoading ? abortRef.current?.abort() : handleSendMessage())}
              disabled={!isLoading && !inputPrompt.trim() && pendingAttachments.length === 0}
              className="h-10 w-10 p-0 rounded-xl bg-[#00004E] hover:bg-[#000038] text-white dark:bg-[#D89A06] dark:text-[#00004E] dark:hover:bg-[#C28905] transition-all shadow-2xs flex-shrink-0 cursor-pointer disabled:opacity-40"
              title={isLoading ? 'Stop generating' : 'Send Message (Enter)'}
            >
              {isLoading ? <Square className="h-4 w-4 fill-current" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </main>

      <MemoryDialog open={isMemoryOpen} onClose={() => setIsMemoryOpen(false)} />
      <SaveFlashcardsDialog
        open={flashcardSource !== null}
        sourceText={flashcardSource?.text || ''}
        lectureId={flashcardSource?.lectureId}
        onClose={() => setFlashcardSource(null)}
      />

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

      {/* Full-size Image Lightbox Modal */}
      {previewModalImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewModalImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[92vh] bg-card border-2 border-[#D89A06]/40 rounded-2xl overflow-hidden p-3 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-border mb-2 px-1">
              <span className="text-xs font-bold text-[#00004E] dark:text-white truncate max-w-md">
                {previewModalImage.alt}
              </span>
              <button
                type="button"
                onClick={() => setPreviewModalImage(null)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                title="Close preview"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-auto max-h-[80vh] flex items-center justify-center bg-black/5 dark:bg-black/30 rounded-xl p-1">
              <img
                src={previewModalImage.src}
                alt={previewModalImage.alt}
                className="max-h-[78vh] w-auto max-w-full rounded-lg object-contain shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
