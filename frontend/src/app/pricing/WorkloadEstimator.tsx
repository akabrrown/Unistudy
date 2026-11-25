'use client';

import React, { useState } from 'react';
import { Calculator } from 'lucide-react';

export function WorkloadEstimator() {
  const [courses, setCourses] = useState(5);
  const [mockPapers, setMockPapers] = useState(8);

  // Each course ~ 30 slide explanations/decks + mockPapers * 8 credits minus free passes
  const estimatedPaidCredits = Math.max(60, courses * 35 + mockPapers * 12);

  const recommended =
    estimatedPaidCredits <= 120
      ? { name: 'Starter (100 Credits)', price: 'GH₵10', rate: 'GH₵0.10 / credit' }
      : estimatedPaidCredits <= 340
      ? { name: 'Standard (300 Credits)', price: 'GH₵25', rate: 'GH₵0.083 / credit' }
      : estimatedPaidCredits <= 750
      ? { name: 'Value (700 Credits)', price: 'GH₵50', rate: 'GH₵0.071 / credit' }
      : { name: 'Bulk (1,600 Credits)', price: 'GH₵100', rate: 'GH₵0.063 / credit' };

  return (
    <section className="max-w-5xl mx-auto mb-14 rounded-2xl border border-border/80 bg-white dark:bg-[#0A0A28] p-6 md:p-8 shadow-2xs">
      <div className="grid md:grid-cols-12 gap-8 items-center">
        <div className="md:col-span-7 space-y-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#00004E] dark:text-[#D89A06]">
            <Calculator className="w-4 h-4 text-[#D89A06]" />
            <span>Semester Revision Estimator</span>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground">Courses this semester</span>
                <span className="font-mono font-bold text-foreground tabular-nums">{courses} courses</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={courses}
                onChange={(e) => setCourses(Number(e.target.value))}
                aria-label="Courses this semester"
                className="w-full accent-[#00004E] dark:accent-[#D89A06] cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground">Timed past papers to practice</span>
                <span className="font-mono font-bold text-foreground tabular-nums">{mockPapers} papers</span>
              </div>
              <input
                type="range"
                min={2}
                max={30}
                value={mockPapers}
                onChange={(e) => setMockPapers(Number(e.target.value))}
                aria-label="Timed past papers to practice"
                className="w-full accent-[#00004E] dark:accent-[#D89A06] cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="md:col-span-5 rounded-xl bg-[#F8F9FD] dark:bg-[#040416] border border-border/80 p-5 space-y-2.5">
          <div className="text-[11px] font-mono text-muted-foreground uppercase">
            Suggested Exam-Season Pack
          </div>
          <div className="text-lg font-bold text-[#00004E] dark:text-white">
            {recommended.name}
          </div>
          <div className="flex items-baseline justify-between pt-1 border-t border-border/60">
            <span className="text-2xl font-black text-[#00004E] dark:text-[#D89A06] font-mono tabular-nums">
              {recommended.price}
            </span>
            <span className="text-xs font-mono text-muted-foreground tabular-nums">
              {recommended.rate}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Plus 8 free passes refilled automatically every 6 hours (~{estimatedPaidCredits} extra actions estimated).
          </p>
        </div>
      </div>
    </section>
  );
}
