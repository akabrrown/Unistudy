'use client'

import { useState, useRef } from 'react'
import { UploadCloud, FileText, Trash2, Loader2, Plus, CheckCircle2, AlertCircle, RefreshCw, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api/client'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function extractWeekFromFilename(filename: string): string {
  const match = filename.match(/(?:week|w|lecture|lec|session)[\s._-]*(\d{1,2})/i);
  if (match && match[1]) {
    const val = parseInt(match[1], 10);
    if (val >= 1 && val <= 52) return String(val);
  }
  return '';
}

function sortUploadFilesByWeek(files: UploadFileItem[]): UploadFileItem[] {
  return [...files].sort((a, b) => {
    const wA = a.week && !isNaN(parseInt(a.week, 10)) ? parseInt(a.week, 10) : 9999;
    const wB = b.week && !isNaN(parseInt(b.week, 10)) ? parseInt(b.week, 10) : 9999;
    if (wA !== wB) return wA - wB;
    return a.file.name.localeCompare(b.file.name, undefined, { numeric: true });
  });
}

export interface UploadFileItem {
  id: string;
  file: File;
  week: string;
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface UploadLectureDialogProps {
  courseId: string;
  courseCode: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function UploadLectureDialog({
  courseId,
  courseCode,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess
}: UploadLectureDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const [uploadFiles, setUploadFiles] = useState<UploadFileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  const handleOpenChange = (newOpen: boolean) => {
    if (isUploading) return; // Prevent closing mid-upload
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    controlledOnOpenChange?.(newOpen);
    if (!newOpen) {
      // Clear out on modal close
      setUploadFiles([]);
    }
  };

  const handleFilesAdded = (incomingFiles: File[]) => {
    if (isUploading) return;
    const items: UploadFileItem[] = incomingFiles.map((file, idx) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${idx}`,
      file,
      week: extractWeekFromFilename(file.name),
      status: 'idle',
      progress: 0,
    }));
    setUploadFiles(prev => sortUploadFilesByWeek([...prev, ...items].slice(0, 10))); // max 10
  };

  const handleUpload = async () => {
    // Sort all files strictly by week (1, 2, 3, 4...) before uploading so execution and UI follow order
    const sortedAll = sortUploadFilesByWeek(uploadFiles);
    setUploadFiles(sortedAll);

    const queue = sortedAll.filter(f => f.status === 'idle' || f.status === 'error');
    if (queue.length === 0) return;

    setIsUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (const item of queue) {
      // Set status to uploading
      setUploadFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading', progress: 5, error: undefined } : f));

      let newLectureId: string | null = null;
      let uploadedFileUrl: string | null = null;

      try {
        // Pre-flight file size check (100MB limit)
        if (item.file.size > 100 * 1024 * 1024) {
          throw new Error(`File is too large (${(item.file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is 100MB.`);
        }

        const payload: any = {
          course_id: courseId,
          title: item.file.name
        };
        if (item.week) {
          const parsedWeek = parseInt(item.week);
          if (!isNaN(parsedWeek)) {
            payload.week = parsedWeek;
          }
        }
        
        // 1. Insert lecture placeholder
        const newLecture = await apiFetch('/lectures', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        if (!newLecture?.id) {
          throw new Error('Failed to create lecture record in database.');
        }
        newLectureId = newLecture.id;

        // 2. Fetch Cloudinary upload signature
        let signedData: any = null;
        try {
          const signRes = await fetch('/api/upload/sign', { method: 'POST' });
          if (signRes.ok) {
            signedData = await signRes.json();
          }
        } catch (e) {
          console.warn('Could not fetch upload signature, using preset fallback:', e);
        }

        const formDataCloudinary = new FormData();
        formDataCloudinary.append('file', item.file);

        let uploadUrl = '';
        if (signedData?.signed) {
          formDataCloudinary.append('api_key', signedData.apiKey);
          formDataCloudinary.append('timestamp', String(signedData.timestamp));
          formDataCloudinary.append('signature', signedData.signature);
          formDataCloudinary.append('folder', signedData.folder);
          uploadUrl = `https://api.cloudinary.com/v1_1/${signedData.cloudName}/auto/upload`;
        } else {
          if (item.file.size > 10485760) {
            throw new Error(`File size (${(item.file.size / (1024 * 1024)).toFixed(1)}MB) exceeds 10MB unsigned limit. Add CLOUDINARY_API_SECRET to unlock 100MB.`);
          }
          const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
          if (!uploadPreset) throw new Error('Cloudinary upload preset is not configured.');
          formDataCloudinary.append('upload_preset', uploadPreset);
          uploadUrl = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`;
        }

        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadUrl);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && e.total > 0) {
            const pct = Math.min(95, Math.round((e.loaded / e.total) * 100));
            setUploadFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: pct } : f));
          }
        };

        const responsePromise = new Promise<any>((resolve, reject) => {
          xhr.onload = () => {
            try {
              const json = JSON.parse(xhr.responseText);
              if (xhr.status >= 200 && xhr.status < 300) resolve(json);
              else reject(new Error(json.error?.message || 'Upload to storage failed'));
            } catch (err) {
              reject(err);
            }
          };
          xhr.onerror = () => reject(new Error('Network error uploading file to storage'));
        });

        xhr.send(formDataCloudinary);
        const fileData = await responsePromise;
        uploadedFileUrl = fileData.secure_url;

        // Update lecture with Cloudinary URL and set processing to true
        await apiFetch(`/lectures/${newLectureId}`, {
          method: 'PATCH',
          body: JSON.stringify({ file_url: uploadedFileUrl, processing: true })
        });

        // 3. Mark as processing AI conversion
        setUploadFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'processing', progress: 100 } : f));

        // 4. Trigger slide conversion
        const userRes = await supabase.auth.getUser();
        const userId = userRes.data.user?.id || '';

        // Strategy A (Primary): Call Express backend on Render directly via apiFetch.
        // Render web services do not have Vercel's 10-second serverless execution ceiling.
        let convertSuccess = false;
        let lastErrorMsg = '';

        try {
          const res = await apiFetch(`/lectures/${newLectureId}/convert`, {
            method: 'POST',
            body: JSON.stringify({ file_url: uploadedFileUrl }),
          });
          if (res?.status === 'processing started' || res?.lecture_id) {
            convertSuccess = true;
          }
        } catch (apiErr: any) {
          console.warn('Backend /lectures/:id/convert failed, falling back to Next.js proxy route:', apiErr);
          lastErrorMsg = apiErr?.message || '';
        }

        // Strategy B (Fallback): If backend route failed, try /api/convert with file_url
        if (!convertSuccess) {
          const formDataFastAPI = new FormData();
          formDataFastAPI.append('file_url', uploadedFileUrl as string);
          formDataFastAPI.append('lecture_id', newLectureId as string);
          formDataFastAPI.append('user_id', userId);

          const convertRes = await fetch(`/api/convert`, {
            method: 'POST',
            body: formDataFastAPI,
          });

          if (!convertRes.ok) {
            const rawText = await convertRes.text().catch(() => '');
            let errText = '';
            try {
              const errJson = JSON.parse(rawText);
              errText = errJson?.error || errJson?.detail || rawText;
            } catch {
              errText = rawText || `Conversion server returned HTTP ${convertRes.status}`;
            }
            throw new Error(errText || lastErrorMsg || 'Conversion failed');
          }
        }

        // Successfully completed!
        successCount++;
        setUploadFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'success', progress: 100 } : f));
      } catch (err: any) {
        console.error(`Upload error for ${item.file.name}:`, err);
        const errorMsg = err?.message || 'Upload failed';
        failCount++;

        // CRITICAL REQUIREMENT:
        // When an error occurs, the slides should NOT count or show.
        // Purge the lecture placeholder completely from the database so it never shows in lecture lists or counts!
        if (newLectureId) {
          try {
            await apiFetch(`/lectures/${newLectureId}`, { method: 'DELETE' });
          } catch (delErr) {
            try {
              await supabase.from('lectures').delete().eq('id', newLectureId);
            } catch {}
          }
        }

        // Set file status to 'error' (RED status, not green)
        setUploadFiles(prev => prev.map(f => f.id === item.id ? {
          ...f,
          status: 'error',
          progress: 100,
          error: errorMsg
        } : f));
      }
    }

    setIsUploading(false);

    if (successCount > 0 && failCount === 0) {
      toast.success(`Successfully uploaded ${successCount} lecture slide${successCount > 1 ? 's' : ''}!`);
      setUploadFiles([]);
      handleOpenChange(false);
      onSuccess?.();
      router.refresh();
    } else if (successCount > 0 && failCount > 0) {
      toast.warning(`Uploaded ${successCount} file(s), but ${failCount} failed. Failed files have been removed from your course and are marked in red below.`);
      onSuccess?.();
      router.refresh();
    } else if (failCount > 0) {
      toast.error(`Upload failed for ${failCount} file(s). See red error details below.`);
    }
  };

  const hasItems = uploadFiles.length > 0;
  const hasFailedItems = uploadFiles.some(f => f.status === 'error');
  const hasPendingItems = uploadFiles.some(f => f.status === 'idle');
  const hasSuccessItems = uploadFiles.some(f => f.status === 'success');
  const activeCount = uploadFiles.filter(f => f.status === 'uploading' || f.status === 'processing').length;

  return (
    <>
      {trigger ? (
        <span onClick={() => handleOpenChange(true)} className="inline-block cursor-pointer">
          {trigger}
        </span>
      ) : !isControlled ? (
        <Button onClick={() => handleOpenChange(true)}>
          <Plus size={16} className="mr-2" />
          Add Materials
        </Button>
      ) : null}

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[620px] max-h-[85vh] flex flex-col p-5 overflow-hidden gap-0">
          <DialogHeader className="flex-shrink-0 pb-3">
            <DialogTitle>
              Upload Lecture to {courseCode}
            </DialogTitle>
            <DialogDescription>
              Upload PDF or PPTX lecture slides. We will extract the content and prepare it for AI processing.
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable Modal Body */}
          <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-3.5 my-1">
            {/* Adaptive Dropzone: Spacious when empty, compact when files are queued */}
            {!hasItems ? (
              <div
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors bg-muted/20 ${
                  isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50 hover:bg-muted/30 border-border'
                }`}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (isUploading) return;
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleFilesAdded(Array.from(e.dataTransfer.files));
                  }
                }}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                  <UploadCloud size={24} />
                </div>
                <p className="text-sm font-semibold mb-1">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground">PDF or PPTX slides (up to 10 at once)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,application/pdf,.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation,.ppt,application/vnd.ms-powerpoint"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFilesAdded(Array.from(e.target.files));
                      e.target.value = '';
                    }
                  }}
                />
              </div>
            ) : (
              <div
                className={`border border-dashed rounded-xl px-4 py-2.5 flex items-center justify-between transition-colors bg-muted/20 ${
                  isUploading ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'hover:border-primary/50 hover:bg-muted/30 border-border cursor-pointer'
                }`}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (isUploading) return;
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleFilesAdded(Array.from(e.dataTransfer.files));
                  }
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <UploadCloud size={16} />
                  </div>
                  <span className="text-xs font-medium text-foreground">
                    Add more files <span className="text-muted-foreground font-normal">(PDF or PPTX, up to 10)</span>
                  </span>
                </div>
                <Button variant="ghost" size="sm" type="button" className="h-7 text-xs font-medium text-primary hover:bg-primary/10 gap-1 pointer-events-none" disabled={isUploading}>
                  <Plus size={14} /> Browse
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,application/pdf,.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation,.ppt,application/vnd.ms-powerpoint"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFilesAdded(Array.from(e.target.files));
                      e.target.value = '';
                    }
                  }}
                />
              </div>
            )}

            {hasItems && (
              <div className="space-y-2">
                <div className="flex justify-between items-center px-0.5">
                  <span className="text-xs text-muted-foreground font-semibold">
                    {uploadFiles.length} file{uploadFiles.length > 1 ? 's' : ''} queued
                  </span>
                  {uploadFiles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setUploadFiles(prev => sortUploadFilesByWeek(prev))}
                      disabled={isUploading}
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors disabled:opacity-50 cursor-pointer"
                      title="Arrange slides in order: 1, 2, 3, 4..."
                    >
                      <ArrowUpDown size={12} />
                      Arrange in order (1, 2, 3...)
                    </button>
                  )}
                </div>

                {/* File list */}
                <div className="space-y-2">
                  {uploadFiles.map((item) => {
                    const isFailed = item.status === 'error';
                    const isSuccess = item.status === 'success';
                    const isActive = item.status === 'uploading' || item.status === 'processing';

                    return (
                      <div
                        key={item.id}
                        className={`p-3 border rounded-xl transition-all shadow-xs relative overflow-hidden ${
                          isFailed
                            ? 'border-destructive/40 bg-destructive/5'
                            : isSuccess
                            ? 'border-emerald-500/40 bg-emerald-500/5'
                            : isActive
                            ? 'border-primary/40 bg-card ring-1 ring-primary/20'
                            : 'border-border bg-card hover:border-border/80'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* File Icon Badge */}
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                              isFailed
                                ? 'bg-destructive/15 text-destructive'
                                : isSuccess
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : 'bg-primary/10 text-primary'
                            }`}
                          >
                            {isFailed ? (
                              <AlertCircle size={18} />
                            ) : isSuccess ? (
                              <CheckCircle2 size={18} />
                            ) : (
                              <FileText size={18} />
                            )}
                          </div>

                          {/* Center Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-3 mb-1">
                              <p className="text-sm font-semibold text-foreground truncate max-w-[280px] sm:max-w-[360px]" title={item.file.name}>
                                {item.file.name}
                              </p>
                              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap shrink-0 tabular-nums">
                                {formatBytes(item.file.size)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2 text-xs">
                              {/* Inline Week Input */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-medium text-muted-foreground">Week:</span>
                                {item.status === 'idle' ? (
                                  <input
                                    type="number"
                                    min="1"
                                    max="52"
                                    placeholder="-"
                                    value={item.week}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setUploadFiles(prev => prev.map(f => f.id === item.id ? { ...f, week: val } : f));
                                    }}
                                    disabled={isUploading}
                                    className="w-12 h-6 bg-muted/60 border border-border/80 focus:border-primary rounded px-1.5 py-0.5 text-xs text-center font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                                    title="Lecture week number (1-52)"
                                  />
                                ) : (
                                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-muted text-foreground">
                                    {item.week ? `W${item.week}` : 'Auto'}
                                  </span>
                                )}
                              </div>

                              {/* Live Status Pill & Action */}
                              <div className="flex items-center gap-2 shrink-0">
                                {isSuccess && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                    <CheckCircle2 size={12} /> Uploaded
                                  </span>
                                )}
                                {isFailed && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                                    <AlertCircle size={12} /> Failed
                                  </span>
                                )}
                                {item.status === 'uploading' && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                    <Loader2 size={12} className="animate-spin" /> {item.progress}%
                                  </span>
                                )}
                                {item.status === 'processing' && (
                                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full animate-pulse">
                                    <Loader2 size={12} className="animate-spin" /> Processing AI...
                                  </span>
                                )}

                                {!isActive && (
                                  <button
                                    type="button"
                                    onClick={() => setUploadFiles(prev => prev.filter(f => f.id !== item.id))}
                                    className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                                    title={isFailed ? 'Dismiss failed file' : 'Remove file'}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Error Message */}
                            {isFailed && item.error && (
                              <p className="text-xs text-destructive font-medium mt-1.5 bg-destructive/10 rounded px-2 py-1 leading-snug">
                                {item.error}
                              </p>
                            )}

                            {/* Progress Bar */}
                            {item.status !== 'idle' && (
                              <div className="w-full bg-muted/60 rounded-full h-1 overflow-hidden mt-2">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ease-out ${
                                    isFailed
                                      ? 'bg-destructive w-full'
                                      : isSuccess
                                      ? 'bg-emerald-500 w-full'
                                      : item.status === 'processing'
                                      ? 'bg-primary w-full animate-pulse'
                                      : 'bg-primary'
                                  }`}
                                  style={{
                                    width: item.status === 'uploading' ? `${item.progress}%` : '100%'
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          {/* Pinned Dialog Footer */}
          <DialogFooter className="flex-shrink-0 pt-3 border-t border-border mt-3 flex flex-col sm:flex-row gap-2 sm:justify-between items-center w-full bg-popover">
            <div className="flex items-center gap-2 text-xs">
              {hasSuccessItems && (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {uploadFiles.filter(f => f.status === 'success').length} succeeded
                </span>
              )}
              {hasFailedItems && (
                <span className="text-destructive font-medium">
                  {uploadFiles.filter(f => f.status === 'error').length} failed
                </span>
              )}
            </div>

            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                type="button"
                onClick={() => handleOpenChange(false)}
                disabled={isUploading}
              >
                {hasSuccessItems && !hasPendingItems && !hasFailedItems ? 'Done' : 'Cancel'}
              </Button>

              {(hasPendingItems || hasFailedItems) && (
                <Button
                  onClick={handleUpload}
                  disabled={!hasItems || isUploading}
                  className={hasFailedItems && !hasPendingItems ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' : ''}
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : hasFailedItems && !hasPendingItems ? (
                    <>
                      <RefreshCw size={14} className="mr-2" />
                      Retry Failed ({uploadFiles.filter(f => f.status === 'error').length})
                    </>
                  ) : (
                    `Upload ${uploadFiles.filter(f => f.status === 'idle' || f.status === 'error').length} File${
                      uploadFiles.filter(f => f.status === 'idle' || f.status === 'error').length > 1 ? 's' : ''
                    }`
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  </>
)
}
