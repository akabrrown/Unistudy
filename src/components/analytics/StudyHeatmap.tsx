'use client';

import * as d3 from 'd3';
import { useEffect, useRef } from 'react';

// Color scale for UniStudy Plum
const colourScale = d3.scaleQuantize<string>()
  .domain([0, 100])
  .range(['#EDE7F6', '#D1C4E9', '#B39DDB', '#9B72CF', '#7B4DB5', '#5B2D8E', '#3D1A6E']);

export function StudyHeatmap({ data }: { data: Record<string, number> }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !data) return;

    const svg = d3.select(ref.current);
    svg.selectAll('*').remove(); // Clear on re-render

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31);
    
    // We render up to today + a few weeks for spacing, but standard github uses full year roughly
    const cellSize = 14;
    
    // Setup dimensions based on number of weeks
    const weeksCount = d3.timeWeek.count(startOfYear, endOfYear) + 1;
    const width = weeksCount * cellSize;
    const height = 7 * cellSize;

    svg.attr('width', width)
       .attr('height', height)
       .attr('viewBox', `0 0 ${width} ${height}`);

    const days = d3.timeDays(startOfYear, endOfYear);

    svg.selectAll('rect')
      .data(days)
      .enter().append('rect')
      .attr('width', cellSize - 2)
      .attr('height', cellSize - 2)
      .attr('x', d => d3.timeWeek.count(startOfYear, d) * cellSize)
      .attr('y', d => d.getDay() * cellSize)
      .attr('rx', 3)
      .attr('fill', d => {
        const dateStr = d3.timeFormat('%Y-%m-%d')(d);
        const score = data[dateStr] || 0;
        return score === 0 ? '#F3F4F6' : colourScale(Math.min(score, 100)) as string;
      })
      .append('title')
      .text(d => {
        const dateStr = d3.timeFormat('%Y-%m-%d')(d);
        const score = data[dateStr] || 0;
        return `${d3.timeFormat('%b %d, %Y')(d)}: ${score} activity points`;
      });
  }, [data]);

  return (
    <div className='overflow-x-auto p-4 border border-[var(--border-subtle)] rounded-xl bg-white shadow-sm'>
      <svg ref={ref} className='min-w-max mx-auto' />
      <div className='flex items-center justify-end gap-2 mt-4 text-xs text-[var(--text-muted)]'>
        <span>Less</span>
        <div className='flex gap-1'>
          <div className='w-3 h-3 rounded-sm bg-[#F3F4F6]' />
          <div className='w-3 h-3 rounded-sm bg-[#EDE7F6]' />
          <div className='w-3 h-3 rounded-sm bg-[#B39DDB]' />
          <div className='w-3 h-3 rounded-sm bg-[#5B2D8E]' />
          <div className='w-3 h-3 rounded-sm bg-[#3D1A6E]' />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
