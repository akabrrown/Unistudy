'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DownloadCloud,
  Loader2,
  CheckCircle2,
  FileText,
  Search,
  KeyRound,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api/client';

interface MoodleSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface DiscoveredPaperPreview {
  title: string;
  filename: string;
  year: number;
  examType: string;
  url: string;
}

export function MoodleSyncModal({ isOpen, onClose, onSuccess }: MoodleSyncModalProps) {
  const [activeTab, setActiveTab] = useState<'credentials' | 'manual'>('credentials');
  const [baseUrl, setBaseUrl] = useState('https://join.upsavirtual.site');
  
  // Credentials sync state
  const [indexNumber, setIndexNumber] = useState('10297545');
  const [password, setPassword] = useState('40Baller#1');
  const [isCredentialSyncing, setIsCredentialSyncing] = useState(false);

  // Manual course sync state
  const [courseId, setCourseId] = useState('');
  const [sesskey, setSesskey] = useState('');
  const [moodleSession, setMoodleSession] = useState('');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [previewData, setPreviewData] = useState<{
    courseName: string;
    courseCode: string;
    papers: DiscoveredPaperPreview[];
  } | null>(null);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleCredentialSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!indexNumber.trim() || !password.trim()) {
      toast.error('Please enter your Index Number and Portal Password');
      return;
    }

    setIsCredentialSyncing(true);
    setStatusMessage('Authenticating with UPSA Virtual Portal via secure proxy...');

    try {
      const res: any = await apiFetch('/moodle/sync-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: indexNumber.trim(),
          password: password.trim(),
          baseUrl: baseUrl.trim(),
        }),
      });

      if (res && res.success) {
        toast.success(
          res.message || `Connected as ${res.student?.fullName || indexNumber}! Enrolled courses and question banks synced.`
        );
        setStatusMessage(null);
        setPassword('');
        onClose();
        if (onSuccess) onSuccess();
      } else {
        throw new Error(res?.error || res?.message || 'Failed to authenticate on university portal');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to connect to UPSA portal. Please check your credentials.');
      setStatusMessage(null);
    } finally {
      setIsCredentialSyncing(false);
    }
  };

  const handleManualPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId.trim() || !sesskey.trim() || !moodleSession.trim()) {
      toast.error('Please provide Course ID, Sesskey, and MoodleSession cookie.');
      return;
    }

    setIsPreviewing(true);
    setPreviewData(null);
    setStatusMessage('Connecting to university portal & scanning course folder...');

    try {
      const res: any = await apiFetch('/moodle/preview-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: baseUrl.trim(),
          courseId: parseInt(courseId.trim(), 10),
          sesskey: sesskey.trim(),
          moodleSession: moodleSession.trim(),
        }),
      });

      if (res && res.success) {
        setPreviewData({
          courseName: res.courseName,
          courseCode: res.courseCode,
          papers: res.papers || [],
        });
        toast.success(`Found ${res.papersFound} exam paper(s) for ${res.courseCode}`);
      } else {
        throw new Error(res?.error || 'Failed to inspect course');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to connect to Moodle portal.');
      setStatusMessage(null);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleManualSync = async () => {
    if (!courseId.trim() || !sesskey.trim() || !moodleSession.trim()) {
      toast.error('Missing required credentials.');
      return;
    }

    setIsSyncing(true);
    setStatusMessage('Downloading exam PDFs & extracting questions with AI OCR...');

    try {
      const res: any = await apiFetch('/moodle/sync-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: baseUrl.trim(),
          courseId: parseInt(courseId.trim(), 10),
          sesskey: sesskey.trim(),
          moodleSession: moodleSession.trim(),
        }),
      });

      if (res && res.success) {
        toast.success(res.message || 'Past questions imported successfully!');
        setStatusMessage(null);
        setPreviewData(null);
        onClose();
        if (onSuccess) onSuccess();
      } else {
        throw new Error(res?.error || 'Failed to sync course past questions');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to download and ingest past questions.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <DownloadCloud className="w-5 h-5 text-primary" />
            Sync Past Questions from University Portal
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Authenticate directly with your UPSA credentials or connect via proxy to sync your registered course question banks automatically.
          </DialogDescription>
        </DialogHeader>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-border text-xs font-semibold gap-4 pt-1">
          <button
            type="button"
            onClick={() => setActiveTab('credentials')}
            className={`pb-2 transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'credentials'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Student Portal Login (Recommended)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`pb-2 transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'manual'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            Manual Session Sync
          </button>
        </div>

        {activeTab === 'credentials' ? (
          <form onSubmit={handleCredentialSync} className="space-y-4 py-2">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <ShieldCheck className="w-4 h-4" />
                Secure Proxy Integration
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Enter your UPSA Index Number and portal password. UniStudy connects via the official university mobile service proxy to automatically discover all your enrolled courses and synchronize their past examination question banks.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="moodle-index" className="text-xs font-semibold">
                Student Index Number
              </Label>
              <Input
                id="moodle-index"
                value={indexNumber}
                onChange={(e) => setIndexNumber(e.target.value)}
                placeholder="e.g. 10297545"
                className="text-xs font-mono"
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="moodle-pass" className="text-xs font-semibold">
                Portal Password
              </Label>
              <Input
                id="moodle-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your UPSA LMS password"
                className="text-xs font-mono"
                required
                autoComplete="current-password"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="moodle-url-cred" className="text-xs font-semibold">
                University Portal URL
              </Label>
              <Input
                id="moodle-url-cred"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://join.upsavirtual.site"
                className="text-xs font-mono"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isCredentialSyncing}
              className="w-full h-10 text-xs font-semibold bg-[#00004E] dark:bg-[#D89A06] dark:text-[#00004E] hover:bg-[#00003E] dark:hover:bg-[#C28905] text-white gap-2 cursor-pointer"
            >
              {isCredentialSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Logging in &amp; Syncing All Enrolled Courses...
                </>
              ) : (
                <>
                  <DownloadCloud className="w-4 h-4" />
                  Sync Courses &amp; Past Question Banks
                </>
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleManualPreview} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="moodle-url" className="text-xs font-semibold">
                Portal Base URL
              </Label>
              <Input
                id="moodle-url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://join.upsavirtual.site"
                className="text-xs font-mono"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="course-id" className="text-xs font-semibold">
                  Moodle Course ID
                </Label>
                <Input
                  id="course-id"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  placeholder="e.g. 167 or 1278"
                  className="text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sesskey" className="text-xs font-semibold">
                  Session Key (sesskey)
                </Label>
                <Input
                  id="sesskey"
                  value={sesskey}
                  onChange={(e) => setSesskey(e.target.value)}
                  placeholder="e.g. lHB32Xt2L4"
                  className="text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="moodle-session" className="text-xs font-semibold">
                MoodleSession Cookie
              </Label>
              <Input
                id="moodle-session"
                type="password"
                value={moodleSession}
                onChange={(e) => setMoodleSession(e.target.value)}
                placeholder="Paste MoodleSession cookie value"
                className="text-xs font-mono"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="submit"
                variant="outline"
                size="sm"
                disabled={isPreviewing || isSyncing}
                className="text-xs gap-1.5 cursor-pointer"
              >
                {isPreviewing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Scanning Course...
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    Scan Course Folder
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Manual Preview Results */}
        {activeTab === 'manual' && previewData && (
          <div className="mt-4 pt-4 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-foreground">{previewData.courseName}</h4>
                <p className="text-xs text-primary font-semibold">Detected Code: {previewData.courseCode}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
                {previewData.papers.length} PDF{previewData.papers.length !== 1 ? 's' : ''} found
              </span>
            </div>

            {previewData.papers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                No past exam PDFs were detected in this specific course folder. Check the Course ID or folder link.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {previewData.papers.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-border/80 bg-muted/20 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <div className="truncate">
                        <div className="font-semibold text-foreground truncate">{p.title}</div>
                        <div className="text-[11px] text-muted-foreground">{p.filename} · Year {p.year}</div>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-background border border-border shrink-0">
                      {p.examType}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={handleManualSync}
              disabled={isSyncing || previewData.papers.length === 0}
              className="w-full h-10 text-xs font-semibold bg-[#00004E] dark:bg-[#D89A06] dark:text-[#00004E] hover:bg-[#00003E] dark:hover:bg-[#C28905] text-white gap-2 cursor-pointer"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Downloading &amp; Ingesting Questions with AI...
                </>
              ) : (
                <>
                  <DownloadCloud className="w-4 h-4" />
                  Import All {previewData.papers.length} Past Questions to University Library
                </>
              )}
            </Button>
          </div>
        )}

        {statusMessage && (
          <div className="text-xs text-center text-muted-foreground animate-pulse py-2">
            {statusMessage}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
