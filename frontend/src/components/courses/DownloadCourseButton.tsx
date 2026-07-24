"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DownloadCloud, CheckCircle, Loader2 } from 'lucide-react';
import { downloadCourse, isCourseDownloaded, removeDownloadedCourse } from '@/lib/sync';

export function DownloadCourseButton({ courseId }: { courseId: string }) {
  const [downloaded, setDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    isCourseDownloaded(courseId).then(setDownloaded);
  }, [courseId]);

  const handleToggle = async () => {
    if (downloaded) {
      await removeDownloadedCourse(courseId);
      setDownloaded(false);
    } else {
      setDownloading(true);
      try {
        await downloadCourse(courseId);
        setDownloaded(true);
      } catch (err) {
        console.error(err);
        alert("Failed to download course");
      }
      setDownloading(false);
    }
  };

  return (
    <Button 
      variant={downloaded ? "outline" : "secondary"} 
      onClick={handleToggle}
      disabled={downloading}
      className={downloaded ? "text-green-600 border-green-200 bg-green-50 hover:bg-green-100" : ""}
    >
      {downloading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : downloaded ? (
        <CheckCircle className="w-4 h-4 mr-2" />
      ) : (
        <DownloadCloud className="w-4 h-4 mr-2" />
      )}
      {downloading ? "Downloading..." : downloaded ? "Downloaded" : "Download Offline"}
    </Button>
  );
}
