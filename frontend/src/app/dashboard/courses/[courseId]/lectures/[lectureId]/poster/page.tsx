'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Loader2, Printer, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export default function StudyPosterPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string
  const lectureId = params.lectureId as string

  const [loading, setLoading] = useState(true)
  const [posterData, setPosterData] = useState<any>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const slidesData = await apiFetch(`/lectures/${lectureId}/slides`);
        if (!slidesData || slidesData.length === 0) {
          toast.error("No content to generate a poster from.");
          setLoading(false);
          return;
        }

        const fullText = slidesData.map((s: any) => s.raw_text).join('\n\n');

        const res = await apiFetch('/ai/ask', {
          method: 'POST',
          body: JSON.stringify({
            feature: 'study_poster',
            payload: { prompt: fullText, stream: false }
          })
        });

        if (res.result) {
          setPosterData(res.result);
        }
      } catch (err) {
        toast.error("Failed to generate poster.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [lectureId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Loader2 size={48} className="animate-spin mb-4 text-primary" />
        <p className="text-lg">Designing your Study Poster...</p>
      </div>
    )
  }

  return (
    <div className="bg-background min-h-[calc(100vh-4rem)] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 print:hidden">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Lecture
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print (A4)
          </Button>
        </div>

        <div className="bg-white text-black p-8 rounded-xl shadow-lg print:shadow-none print:p-0 min-h-[29.7cm] w-full max-w-[21cm] mx-auto border print:border-none">
          {posterData ? (
            <div className="space-y-8">
              <h1 className="text-4xl font-black text-center border-b-4 border-black pb-4 uppercase tracking-tighter">
                {posterData.title}
              </h1>
              
              <div className="grid grid-cols-2 gap-8">
                {posterData.sections?.map((section: any, idx: number) => (
                  <div key={idx} className="bg-gray-50 p-6 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <h2 className="text-2xl font-bold mb-4 uppercase tracking-tight">{section.heading}</h2>
                    <ul className="space-y-2 list-disc list-inside">
                      {section.points?.map((pt: string, pIdx: number) => (
                        <li key={pIdx} className="text-lg leading-snug">{pt}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {posterData.keywords && posterData.keywords.length > 0 && (
                <div className="mt-8 p-4 bg-black text-white rounded-xl text-center">
                  <p className="font-bold uppercase tracking-widest text-sm mb-2">Key Concepts</p>
                  <p className="text-lg">{posterData.keywords.join(' • ')}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-gray-500">
              Could not load poster data.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
