'use client';

import { useModelStore } from '@/lib/stores/modelStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap, BrainCircuit, Layers } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface ModelSelectorProps {
  isCollapsed?: boolean;
}

export function ModelSelector({ isCollapsed = false }: ModelSelectorProps) {
  const { selectedTier, setTier } = useModelStore();

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'fast':
        return <Zap className="w-3.5 h-3.5 text-[#D89A06]" />;
      case 'smart':
        return <BrainCircuit className="w-3.5 h-3.5 text-[#D89A06]" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-[#00004E] dark:text-[#D89A06]" />;
    }
  };

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case 'fast':
        return 'Fast Response';
      case 'smart':
        return 'Deep Analysis';
      default:
        return 'Balanced Model';
    }
  };

  if (isCollapsed) {
    return (
      <div className="flex justify-center w-full mb-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <div className="inline-flex">
                <Select value={selectedTier} onValueChange={(val) => { if (val) setTier(val); }}>
                  <SelectTrigger
                    className="w-9 h-9 p-0 justify-center rounded-xl bg-background border border-border/70 hover:border-[#D89A06]/60 transition-colors [&>svg:last-child]:hidden cursor-pointer"
                    aria-label={`Model: ${getTierLabel(selectedTier)}`}
                  >
                    {getTierIcon(selectedTier)}
                  </SelectTrigger>
                  <SelectContent side="right" align="end" className="z-50">
                    <SelectItem value="fast">
                      <div className="flex items-center gap-2 text-xs">
                        <Zap className="w-3.5 h-3.5 text-[#D89A06]" />
                        <span>Fast Response</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="default">
                      <div className="flex items-center gap-2 text-xs">
                        <Layers className="w-3.5 h-3.5 text-[#00004E] dark:text-[#D89A06]" />
                        <span>Balanced Model</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="smart">
                      <div className="flex items-center gap-2 text-xs">
                        <BrainCircuit className="w-3.5 h-3.5 text-[#D89A06]" />
                        <span>Deep Analysis</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
          />
          <TooltipContent side="right" sideOffset={12}>
            Model: {getTierLabel(selectedTier)}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="w-full px-0.5">
      <Select value={selectedTier} onValueChange={(val) => { if (val) setTier(val); }}>
        <SelectTrigger className="w-full h-8 text-xs bg-muted/30 border-border/60 hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground cursor-pointer">
          <SelectValue placeholder="Balanced Model" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="fast">
            <div className="flex items-center gap-2 text-xs">
              <Zap className="w-3.5 h-3.5 text-[#D89A06]" />
              <span>Fast Response</span>
            </div>
          </SelectItem>
          <SelectItem value="default">
            <div className="flex items-center gap-2 text-xs">
              <Layers className="w-3.5 h-3.5 text-[#00004E] dark:text-[#D89A06]" />
              <span>Balanced Model</span>
            </div>
          </SelectItem>
          <SelectItem value="smart">
            <div className="flex items-center gap-2 text-xs">
              <BrainCircuit className="w-3.5 h-3.5 text-[#D89A06]" />
              <span>Deep Analysis</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
