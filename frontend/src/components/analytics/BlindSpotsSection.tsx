'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function BlindSpotsSection() {
  const [blindSpots, setBlindSpots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/blind-spots')
      .then(res => res.json())
      .then(data => {
        setBlindSpots(data.blindSpots || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch blind spots:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold tracking-tight mb-4 flex items-center gap-2">
        <AlertTriangle className="text-orange-500" />
        Detected Blind Spots
      </h2>
      <p className="text-muted-foreground mb-6">These are topics where you felt highly confident, but your quiz scores show a gap in knowledge.</p>
      
      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : blindSpots.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent flex flex-col items-center justify-center p-6 text-center text-muted-foreground max-w-xl">
          <AlertTriangle className="w-8 h-8 mb-2 opacity-20" />
          <p>No blind spots detected.</p>
          <p className="text-sm mt-1">Keep studying and taking quizzes to generate more insights!</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {blindSpots.map((bs, i) => (
            <Card key={i} className="border-l-4 border-l-orange-500 shadow-sm bg-card">
              <CardHeader>
                <CardTitle className="text-lg">{bs.title}</CardTitle>
                <CardDescription>Confidence: {bs.avgConf.toFixed(1)}/5 • Quiz Average: {bs.avgScore.toFixed(0)}%</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  {bs.insight}
                </p>
                <Link href="/dashboard/courses/1/quiz">
                  <Button variant="outline" size="sm">Review Weakness</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
