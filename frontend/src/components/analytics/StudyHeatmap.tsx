'use client';

import * as d3 from 'd3';
import { useEffect, useRef, useState } from 'react';

export function StudyHeatmap({ data }: { data: Record<string, number> }) {
  const ref = useRef<SVGSVGElement>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDark();

    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!ref.current || !data) return;

    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();

    const now = new Date();
    const year = now.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    const cellSize = 13;
    const leftMargin = 28;
    const topMargin = 18;
    const weeksCount = d3.timeWeek.count(startOfYear, endOfYear) + 1;
    const width = leftMargin + weeksCount * cellSize + 8;
    const height = topMargin + 7 * cellSize + 4;

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const labelColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(15,23,42,0.5)';

    // Month labels along top axis
    const months = d3.timeMonths(startOfYear, endOfYear);
    svg
      .selectAll('text.month-label')
      .data(months)
      .enter()
      .append('text')
      .attr('class', 'month-label')
      .attr('x', (d) => leftMargin + d3.timeWeek.count(startOfYear, d) * cellSize)
      .attr('y', 11)
      .attr('fill', labelColor)
      .attr('font-size', '9px')
      .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
      .text((d) => d3.timeFormat('%b')(d));

    // Weekday labels along left axis (Mon, Wed, Fri)
    const dayLabels = [
      { day: 1, text: 'Mon' },
      { day: 3, text: 'Wed' },
      { day: 5, text: 'Fri' },
    ];
    svg
      .selectAll('text.day-label')
      .data(dayLabels)
      .enter()
      .append('text')
      .attr('class', 'day-label')
      .attr('x', 0)
      .attr('y', (d) => topMargin + d.day * cellSize + 8)
      .attr('fill', labelColor)
      .attr('font-size', '9px')
      .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
      .text((d) => d.text);

    const days = d3.timeDays(startOfYear, endOfYear);

    const lightPalette = ['#d1fae5', '#6ee7b7', '#34d399', '#10b981', '#047857'];
    const darkPalette = ['#064e3b', '#047857', '#059669', '#10b981', '#34d399'];

    const activePalette = isDark ? darkPalette : lightPalette;
    const emptyFill = isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9';

    const colourScale = d3
      .scaleQuantize<string>()
      .domain([1, 100])
      .range(activePalette);

    svg
      .selectAll('rect')
      .data(days)
      .enter()
      .append('rect')
      .attr('width', cellSize - 2.5)
      .attr('height', cellSize - 2.5)
      .attr('x', (d) => leftMargin + d3.timeWeek.count(startOfYear, d) * cellSize)
      .attr('y', (d) => topMargin + d.getDay() * cellSize)
      .attr('rx', 2.5)
      .attr('fill', (d) => {
        const dateStr = d3.timeFormat('%Y-%m-%d')(d);
        const score = data[dateStr] || 0;
        return score <= 0 ? emptyFill : (colourScale(Math.min(score, 100)) as string);
      })
      .append('title')
      .text((d) => {
        const dateStr = d3.timeFormat('%Y-%m-%d')(d);
        const score = data[dateStr] || 0;
        return `${d3.timeFormat('%b %d, %Y')(d)}: ${score} study points`;
      });
  }, [data, isDark]);

  return (
    <div className="overflow-x-auto p-3.5 border border-border/80 rounded-xl bg-background/50 transition-colors">
      <svg ref={ref} className="min-w-max mx-auto block" />
      <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-border/60 text-[11px] text-muted-foreground font-mono">
        <span>15 pts = 25m focus session · 25 pts = quiz · 5 pts = slide rating</span>
        <div className="flex items-center gap-1.5">
          <span>Less</span>
          <div className="flex gap-1 items-center">
            <div className="w-2.5 h-2.5 rounded-xs bg-muted border border-border" />
            <div className="w-2.5 h-2.5 rounded-xs bg-[#d1fae5] dark:bg-[#064e3b]" />
            <div className="w-2.5 h-2.5 rounded-xs bg-[#6ee7b7] dark:bg-[#047857]" />
            <div className="w-2.5 h-2.5 rounded-xs bg-[#34d399] dark:bg-[#059669]" />
            <div className="w-2.5 h-2.5 rounded-xs bg-[#10b981] dark:bg-[#10b981]" />
            <div className="w-2.5 h-2.5 rounded-xs bg-[#047857] dark:bg-[#34d399]" />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
