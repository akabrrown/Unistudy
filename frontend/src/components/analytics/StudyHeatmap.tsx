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
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31);

    const cellSize = 14;
    const weeksCount = d3.timeWeek.count(startOfYear, endOfYear) + 1;
    const width = weeksCount * cellSize;
    const height = 7 * cellSize;

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const days = d3.timeDays(startOfYear, endOfYear);

    const lightPalette = ['#E9D5FF', '#C084FC', '#9333EA', '#7E22CE', '#581C87'];
    const darkPalette = ['#3B1861', '#5B2D8E', '#7C3AED', '#A855F7', '#D8B4FE'];

    const activePalette = isDark ? darkPalette : lightPalette;
    const emptyFill = isDark ? 'rgba(255, 255, 255, 0.06)' : '#F3F4F6';

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
      .attr('x', (d) => d3.timeWeek.count(startOfYear, d) * cellSize)
      .attr('y', (d) => d.getDay() * cellSize)
      .attr('rx', 3)
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
    <div className="overflow-x-auto p-4 border border-border rounded-xl bg-card shadow-xs transition-colors">
      <svg ref={ref} className="min-w-max mx-auto block" />
      <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-1.5 items-center">
          <div className="w-3 h-3 rounded-xs bg-muted border border-border" />
          <div className="w-3 h-3 rounded-xs bg-[#E9D5FF] dark:bg-[#3B1861]" />
          <div className="w-3 h-3 rounded-xs bg-[#C084FC] dark:bg-[#5B2D8E]" />
          <div className="w-3 h-3 rounded-xs bg-[#9333EA] dark:bg-[#7C3AED]" />
          <div className="w-3 h-3 rounded-xs bg-[#581C87] dark:bg-[#D8B4FE]" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
