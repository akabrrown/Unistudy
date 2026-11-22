"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Menu, X, GraduationCap } from "lucide-react";
import { UniStudyLogo } from "@/components/brand/UniStudyLogo";

export function MobileSidebar({ children, profile }: { children: React.ReactNode; profile?: any }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the sheet when the pathname changes (e.g., when a user clicks a link)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[#D89A06]/20 dark:border-white/10 bg-card/95 backdrop-blur-md sticky top-0 z-40 shadow-2xs">
      <div className="flex items-center gap-2.5">
        <UniStudyLogo height={30} />
        <span className="hidden xs:inline-flex items-center gap-1 text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded-full bg-[#FEF8E7] dark:bg-[#00004E] text-[#00004E] dark:text-[#D89A06] border border-[#D89A06]/30">
          <GraduationCap className="w-3 h-3 text-[#D89A06]" />
          UPSA
        </span>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="p-2 rounded-xl text-foreground hover:bg-muted border border-border/70 focus:outline-hidden focus:ring-2 focus:ring-[#D89A06] transition-colors cursor-pointer shadow-2xs">
          <Menu className="w-5 h-5 text-[#00004E] dark:text-white" />
        </SheetTrigger>
        <SheetContent
          side="left"
          className="p-0 flex flex-col w-[85vw] max-w-[340px] bg-[#FFFFFF] dark:bg-[#070720] border-r border-[#D89A06]/30 dark:border-white/10 shadow-2xl"
        >
          <SheetTitle className="sr-only">Student Dashboard Navigation</SheetTitle>

          {/* Drawer Header */}
          <div className="p-4 border-b border-[#D89A06]/20 dark:border-white/10 flex items-center justify-between bg-[#F8F9FD] dark:bg-[#05051C]">
            <div className="flex items-center gap-2">
              <UniStudyLogo height={28} />
              <div className="flex flex-col">
                <span className="text-[10px] font-extrabold uppercase font-mono text-[#D89A06] tracking-wider leading-none">
                  Student Portal
                </span>
                <span className="text-[11px] text-muted-foreground font-medium">
                  {profile?.institutions?.abbreviation || 'UPSA'} · {profile?.year_of_study ? `Level ${profile.year_of_study}` : 'Scholar'}
                </span>
              </div>
            </div>
            <SheetClose className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </SheetClose>
          </div>

          {/* Drawer Scrollable Navigation Area */}
          <div className="h-full flex flex-col overflow-y-auto px-3 py-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
