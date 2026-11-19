'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { toast } from 'sonner';
import {
  BrainCircuit,
  Send,
  Sparkles,
  Paperclip,
  Trash2,
  Download,
  BookOpen,
  Layers,
  ChevronRight,
  X,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Search,
  CheckCircle2,
  HelpCircle,
  Clock,
  ArrowRight,
  GraduationCap,
  FileText,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getSlideThumbnailUrl, isPlaceholderSlideUrl } from '@/lib/images';
import { cn } from '@/lib/utils';

interface SlideItem {
  slide_number?: number | null;
  raw_text?: string | null;
  explanation?: string | null;
  image_url?: string | null;
}

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

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  referencedDeck?: {
    courseId: string;
    courseCode: string;
    courseTitle: string;
    lectureId: string;
    lectureTitle: string;
    slideCount?: number | null;
  } | null;
  citations?: number[];
}

const STORAGE_KEY = 'unistudy_general_ai_chat_history_v1';
const DECK_STORAGE_KEY = 'unistudy_general_ai_chat_active_deck_v1';

const SUGGESTED_PROMPTS_GENERAL = [
  'Explain the difference between working capital and liquidity.',
  'Help me structure an academic essay introduction with a clear thesis.',
  'Summarize the core tenets of modern portfolio theory.',
  'Explain the intuition behind the Black-Scholes formula with math equations.',
];

const SUGGESTED_PROMPTS_DECK = [
  'Summarize the main themes and takeaways from this lecture deck.',
  'What are the 3 most likely exam questions from these slides?',
  '/test - Quiz me with 3 practice questions strictly based on these slides.',
  '/plan - Break down the study sequence for mastering this lecture deck.',
];

export default function GeneralAiChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [isCoursesLoading, setIsCoursesLoading] = useState(true);
  const [isDeckSelectorOpen, setIsDeckSelectorOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [deckSearchQuery, setDeckSearchQuery] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Active referenced lecture deck
  const [activeDeck, setActiveDeck] = useState<{
    courseId: string;
    courseCode: string;
    courseTitle: string;
    lectureId: string;
    lectureTitle: string;
    slideCount?: number | null;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load chat history and active deck from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
      const storedDeck = localStorage.getItem(DECK_STORAGE_KEY);
      if (storedDeck) {
        setActiveDeck(JSON.parse(storedDeck));
      }
    } catch (e) {
      console.warn('Failed to load chat history from localStorage', e);
    }
  }, []);

  // Save chat history to localStorage
  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Failed to save chat history to localStorage', e);
    }
  }, [messages]);

  // Save active deck to localStorage
  useEffect(() => {
    try {
      if (activeDeck) {
        localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(activeDeck));
      } else {
        localStorage.removeItem(DECK_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Failed to save active deck to localStorage', e);
    }
  }, [activeDeck]);

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
  }, []);

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputPrompt(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  // Attach a deck
  const handleAttachDeck = (course: CourseItem, lecture: LectureItem) => {
    const deck = {
      courseId: course.id,
      courseCode: course.course_code || course.title,
      courseTitle: course.title,
      lectureId: lecture.id,
      lectureTitle: lecture.title,
      slideCount: lecture.slide_count,
    };
    setActiveDeck(deck);
    setIsDeckSelectorOpen(false);
    toast.success(`Attached "${lecture.title}" (${deck.courseCode}) as active reference deck`);
  };

  // Detach active deck
  const handleDetachDeck = () => {
    setActiveDeck(null);
    toast.info('Switched back to General Academic Chat (No slide deck attached)');
  };

  // Clear chat
  const handleClearChat = () => {
    if (messages.length === 0) return;
    if (window.confirm('Are you sure you want to start a new chat? Current messages will be cleared.')) {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEY);
      toast.success('Conversation cleared. Starting fresh!');
    }
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

    const markdownDoc = `# UniStudy AI Tutor Session\nGenerated: ${new Date().toLocaleString()}\n${deckInfo}\n---\n\n${transcript}`;
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

  // Submit message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputPrompt).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      referencedDeck: activeDeck ? { ...activeDeck } : null,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
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
        throw new Error(errJson.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();
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
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(`AI Error: ${msg}`);
      const errorMessage: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Unable to complete request:** ${msg}\n\nPlease check your connection, verify your credit balance, or try again shortly.`,
        timestamp: new Date().toISOString(),
        referencedDeck: activeDeck ? { ...activeDeck } : null,
      };
      setMessages((prev) => [...prev, errorMessage]);
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

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-6xl mx-auto pb-4">
      {/* Top Header & Context Bar */}
      <header className="flex-shrink-0 bg-card border border-border rounded-2xl p-4 md:p-5 shadow-xs mb-3 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#00004E] text-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E] flex items-center justify-center font-bold shadow-xs border border-[#D89A06]/40">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-[#00004E] dark:text-white">
                  AI Study Tutor & Assistant
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#FEF8E7] text-[#00004E] border border-[#D89A06]/40 dark:bg-white/10 dark:text-[#D89A06]">
                  Collegiate 24/7
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Ask any academic question, or attach an uploaded lecture slide deck for grounded citations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
              onClick={handleClearChat}
              disabled={messages.length === 0}
              className="text-xs font-semibold h-8 text-destructive hover:bg-destructive/10"
              title="Clear conversation"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
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
                <Sparkles className="h-3 w-3 text-[#D89A06]" />
                General Academic Chat (All subjects & formulas)
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
      <div className="flex-1 bg-card border border-border rounded-2xl p-4 md:p-6 overflow-y-auto space-y-4 shadow-xs relative">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-10 space-y-6">
            <div className="h-16 w-16 rounded-2xl bg-[#FEF8E7] dark:bg-[#00004E] border-2 border-[#D89A06] flex items-center justify-center text-[#00004E] dark:text-[#D89A06] shadow-sm">
              <GraduationCap className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-[#00004E] dark:text-white">
                How can I assist your studies today?
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                I am your 24/7 UPSA AI tutor. I can break down challenging theories, derive formulas, review essay arguments, or explain slide decks uploaded by your lecturers.
              </p>
            </div>

            {/* Suggested Prompts */}
            <div className="w-full space-y-2 text-left">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 px-1">
                <Lightbulb className="h-3.5 w-3.5 text-[#D89A06]" />
                {activeDeck ? `Suggested for "${activeDeck.lectureTitle}"` : 'Suggested Starters'}
              </div>
              <div className="grid grid-cols-1 gap-2">
                {(activeDeck ? SUGGESTED_PROMPTS_DECK : SUGGESTED_PROMPTS_GENERAL).map((prompt, idx) => (
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
                  'flex flex-col space-y-1.5 max-w-[85%] md:max-w-[80%]',
                  isUser ? 'ml-auto items-end' : 'mr-auto items-start'
                )}
              >
                {/* Author & Timestamp Header */}
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground px-1">
                  {isUser ? (
                    <>
                      <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="font-bold text-[#00004E] dark:text-white">You</span>
                    </>
                  ) : (
                    <>
                      <span className="font-bold text-[#00004E] dark:text-[#D89A06] flex items-center gap-1">
                        <BrainCircuit className="h-3 w-3 text-[#D89A06]" />
                        UniStudy AI Tutor
                      </span>
                      <span>·</span>
                      <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={cn(
                    'rounded-2xl p-4 text-xs md:text-sm leading-relaxed shadow-2xs relative group',
                    isUser
                      ? 'bg-[#00004E] text-white rounded-br-xs selection:bg-[#D89A06] selection:text-[#00004E]'
                      : 'bg-background border border-border border-l-4 border-l-[#D89A06] text-foreground rounded-bl-xs w-full'
                  )}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap break-words font-medium">
                      {message.content}
                    </div>
                  ) : (
                    <div className="prose dark:prose-invert max-w-none text-xs md:text-sm prose-p:my-2 prose-headings:font-bold prose-headings:text-[#00004E] dark:prose-headings:text-white prose-pre:bg-muted/60 prose-pre:p-3 prose-pre:rounded-xl prose-code:font-mono prose-code:text-[#00004E] dark:prose-code:text-[#D89A06]">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {message.content}
                      </ReactMarkdown>

                      {/* Cited Slides Ribbon */}
                      {message.citations && message.citations.length > 0 && message.referencedDeck && (
                        <div className="mt-4 pt-3 border-t border-border/80 flex flex-wrap items-center gap-2 not-prose">
                          <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                            <BookOpen className="h-3 w-3 text-[#D89A06]" />
                            Referenced Slides:
                          </span>
                          {message.citations.map((slideNum) => (
                            <Link
                              key={slideNum}
                              href={`/dashboard/courses/${message.referencedDeck?.courseId}/lectures/${message.referencedDeck?.lectureId}?slide=${slideNum}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#FEF8E7] dark:bg-white/10 border border-[#D89A06]/40 text-[#00004E] dark:text-[#D89A06] text-[11px] font-bold hover:border-[#D89A06] hover:scale-105 transition-all shadow-2xs"
                              title={`Jump to Slide ${slideNum}`}
                            >
                              Slide {slideNum}
                              <ExternalLink className="h-2.5 w-2.5" />
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* Copy Action Pill */}
                      <div className="mt-2 flex items-center justify-end not-prose">
                        <button
                          onClick={() => handleCopyMessage(message.id, message.content)}
                          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground p-1 rounded transition-colors cursor-pointer"
                          title="Copy response"
                        >
                          {copiedMessageId === message.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-600" />
                              <span className="text-emerald-600 font-medium">Copied</span>
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
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex flex-col space-y-1.5 max-w-[80%] mr-auto items-start">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground px-1">
              <span className="font-bold text-[#00004E] dark:text-[#D89A06] flex items-center gap-1">
                <BrainCircuit className="h-3 w-3 text-[#D89A06]" />
                UniStudy AI Tutor
              </span>
              <span>·</span>
              <span>Thinking...</span>
            </div>
            <div className="rounded-2xl p-4 bg-background border border-border border-l-4 border-l-[#D89A06] rounded-bl-xs flex items-center gap-3 shadow-2xs">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-[#00004E] dark:bg-[#D89A06] animate-bounce" />
                <div className="h-2 w-2 rounded-full bg-[#00004E] dark:bg-[#D89A06] animate-bounce [animation-delay:0.15s]" />
                <div className="h-2 w-2 rounded-full bg-[#00004E] dark:bg-[#D89A06] animate-bounce [animation-delay:0.3s]" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {activeDeck
                  ? `Retrieving slide knowledge for "${activeDeck.lectureTitle}"...`
                  : 'Synthesizing academic explanation...'}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Bar */}
      <div className="flex-shrink-0 mt-3 space-y-2">
        <div className="flex items-center gap-2 px-1">
          <span className="text-[11px] text-muted-foreground font-medium">Command Shortcuts:</span>
          <button
            onClick={() => handleSendMessage('/test Quiz me with 3 practice exam questions.')}
            disabled={isLoading}
            className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#FEF8E7] dark:bg-white/10 text-[#00004E] dark:text-[#D89A06] border border-[#D89A06]/30 hover:border-[#D89A06] transition-colors cursor-pointer"
          >
            /test (Practice Quiz)
          </button>
          <button
            onClick={() => handleSendMessage('/plan Create a study breakdown for this material.')}
            disabled={isLoading}
            className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#FEF8E7] dark:bg-white/10 text-[#00004E] dark:text-[#D89A06] border border-[#D89A06]/30 hover:border-[#D89A06] transition-colors cursor-pointer"
          >
            /plan (Milestone Plan)
          </button>
        </div>

        <div className="relative flex items-end gap-2 bg-card border-2 border-border focus-within:border-[#D89A06] rounded-2xl p-2 transition-all shadow-xs">
          <textarea
            ref={textareaRef}
            value={inputPrompt}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={
              activeDeck
                ? `Ask anything grounded in "${activeDeck.lectureTitle}"... (Shift+Enter for newline)`
                : 'Ask anything across any university course, topic, or formula... (Shift+Enter for newline)'
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

      {/* Slide Deck Selector Modal / Drawer */}
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

            {/* Modal Body: Course Tabs + Lecture Deck Grid */}
            <div className="p-4 md:p-5 flex-1 overflow-y-auto space-y-4">
              {/* Option to clear grounding */}
              {activeDeck && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-[#D89A06]/40 bg-[#FEF8E7] dark:bg-white/5">
                  <div className="text-xs">
                    <span className="font-bold text-[#00004E] dark:text-[#D89A06]">Currently Attached: </span>
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
                              {/* Slide Deck Thumbnail */}
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
    </div>
  );
}
