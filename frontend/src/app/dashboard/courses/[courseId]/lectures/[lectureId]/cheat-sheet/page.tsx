'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Loader2, Printer, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export default function CheatSheetPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string
  const lectureId = params.lectureId as string

  const [loading, setLoading] = useState(true)
  const [cheatSheetData, setCheatSheetData] = useState<any>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const slidesData = await apiFetch(`/lectures/${lectureId}/slides`);
        if (!slidesData || slidesData.length === 0) {
          toast.error("No content to generate a cheat sheet from.");
          setLoading(false);
          return;
        }

        const fullText = slidesData.map((s: any) => s.raw_text).join('\n\n');

        const res = await apiFetch('/ai/ask', {
          method: 'POST',
          body: JSON.stringify({
            feature: 'cheat_sheet',
            payload: { prompt: fullText, stream: false }
          })
        });

        if (res.result) {
          setCheatSheetData(res.result);
        }
      } catch (err) {
        toast.error("Failed to generate cheat sheet.");
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
        <p className="text-lg">Compressing lecture into Cheat Sheet...</p>
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

        <div className="bg-white text-black p-4 min-h-[29.7cm] w-full max-w-[21cm] mx-auto border print:border-none">
          {cheatSheetData ? (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold text-center uppercase border-b border-black pb-2">
                {cheatSheetData.title}
              </h1>
              
              <div className="columns-2 md:columns-3 gap-4 text-[10px] leading-tight">
                {cheatSheetData.columns?.map((col: any, idx: number) => (
                  <div key={idx} className="break-inside-avoid mb-4">
                    <h2 className="font-bold bg-black text-white px-1 uppercase mb-1">{col.category}</h2>
                    <ul className="list-disc list-inside space-y-0.5">
                      {col.items?.map((item: string, iIdx: number) => (
                        <li key={iIdx} className="pl-1 -indent-2 ml-2">{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-gray-500">
              Could not load cheat sheet data.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
