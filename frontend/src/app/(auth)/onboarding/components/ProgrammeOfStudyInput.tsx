'use client';

import { useState, useMemo, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { GraduationCap, Search, Check, ExternalLink } from 'lucide-react';
import { UPSA_PROGRAMMES_CATALOG } from '@/lib/constants/upsa';

interface ProgrammeOfStudyInputProps {
  onProgrammeChange?: (name: string, department?: string, facultyCode?: string) => void;
  initialValue?: string;
  value?: string;
  includeHiddenInputs?: boolean;
}

export function ProgrammeOfStudyInput({
  onProgrammeChange,
  initialValue = '',
  value,
  includeHiddenInputs = true,
}: ProgrammeOfStudyInputProps = {}) {
  const [search, setSearch] = useState(value !== undefined ? value : initialValue);
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  // Sync controlled value prop cleanly inside useEffect (never inside useMemo)
  useEffect(() => {
    if (value !== undefined && value !== search) {
      setSearch(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const filteredProgrammes = useMemo(() => {
    return UPSA_PROGRAMMES_CATALOG.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.department.toLowerCase().includes(search.toLowerCase());
      const matchesTier = selectedTier === 'all' || item.level === selectedTier;
      return matchesSearch && matchesTier;
    });
  }, [search, selectedTier]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [search, selectedTier]);

  const selectItem = (item: (typeof UPSA_PROGRAMMES_CATALOG)[number]) => {
    setSearch(item.name);
    setSelectedDepartment(item.department);
    setIsDropdownOpen(false);
    onProgrammeChange?.(item.name, item.department, item.facultyCode);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsDropdownOpen(true);
      return;
    }
    if (!isDropdownOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        filteredProgrammes.length > 0 ? (prev + 1) % filteredProgrammes.length : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        filteredProgrammes.length > 0
          ? (prev - 1 + filteredProgrammes.length) % filteredProgrammes.length
          : 0
      );
    } else if (e.key === 'Enter' && filteredProgrammes[highlightedIndex]) {
      e.preventDefault();
      selectItem(filteredProgrammes[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  return (
    <div className="space-y-2.5 relative">
      <div className="flex items-center justify-between">
        <Label htmlFor="degree_programme" className="text-xs font-semibold flex items-center gap-1.5">
          <GraduationCap className="w-3.5 h-3.5 text-[#00004E] dark:text-[#D89A06]" />
          UPSA Degree Programme / Major
        </Label>
        <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
          {UPSA_PROGRAMMES_CATALOG.length} Official Programmes
        </span>
      </div>

      {/* Clean segmented tier bar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border/50 pb-1.5">
        {[
          { id: 'all', label: 'All' },
          { id: 'undergraduate', label: 'Undergraduate' },
          { id: 'postgraduate', label: 'Postgraduate' },
          { id: 'diploma', label: 'Diploma' },
          { id: 'professional', label: 'Professional' },
        ].map((tier) => (
          <button
            key={tier.id}
            type="button"
            onClick={() => {
              setSelectedTier(tier.id);
              setIsDropdownOpen(true);
            }}
            className={`text-[11px] px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              selectedTier === tier.id
                ? 'bg-[#00004E] text-white dark:bg-[#D89A06] dark:text-[#00004E] font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            {tier.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          id="degree_programme"
          role="combobox"
          aria-expanded={isDropdownOpen}
          aria-controls="upsa-programme-listbox"
          aria-autocomplete="list"
          {...(includeHiddenInputs ? { name: 'degree_programme' } : {})}
          placeholder="Search programme or department (e.g. Accounting, IT, Law)..."
          className="pl-10 h-11 text-xs rounded-xl bg-background border-border/80 focus:border-[#D89A06] focus:ring-2 focus:ring-[#D89A06]/20"
          value={search}
          onChange={(e) => {
            const val = e.target.value;
            setSearch(val);
            setIsDropdownOpen(true);
            onProgrammeChange?.(val, selectedDepartment);
          }}
          onFocus={() => setIsDropdownOpen(true)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            setTimeout(() => setIsDropdownOpen(false), 200);
          }}
          required
        />
      </div>

      {includeHiddenInputs && <input type="hidden" name="department" value={selectedDepartment} />}

      {isDropdownOpen && (
        <div
          id="upsa-programme-listbox"
          role="listbox"
          className="absolute z-30 w-full mt-1 bg-popover border border-border/80 rounded-xl shadow-xl max-h-72 overflow-y-auto divide-y divide-border/40"
        >
          {filteredProgrammes.length > 0 ? (
            filteredProgrammes.map((item, idx) => {
              const isHighlighted = idx === highlightedIndex;
              return (
                <button
                  key={item.name}
                  type="button"
                  role="option"
                  aria-selected={search === item.name}
                  className={`w-full text-left px-3.5 py-2.5 text-xs text-foreground flex items-start justify-between gap-2 transition-colors cursor-pointer ${
                    isHighlighted ? 'bg-muted/80' : 'hover:bg-muted/50'
                  }`}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onMouseDown={() => selectItem(item)}
                >
                  <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground text-xs leading-snug">
                        {item.name}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">
                        {item.subCategory || item.level}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {item.department}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                    {item.admissionsUrl && (
                      <a
                        href={item.admissionsUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                        title="Official UPSA Admissions Handbook"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {search === item.name && (
                      <Check className="w-4 h-4 text-[#00004E] dark:text-[#D89A06]" />
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="p-4 text-xs text-muted-foreground text-center space-y-1">
              <div>No exact match in catalog.</div>
              <div className="text-[11px]">
                Continue with custom programme:{' '}
                <strong className="text-foreground">&ldquo;{search}&rdquo;</strong>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
