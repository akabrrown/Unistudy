"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu, Shield } from "lucide-react";
import { UniStudyLogo } from "@/components/brand/UniStudyLogo";
import Link from "next/link";

export function MobileSidebar({ children, profile }: { children: React.ReactNode; profile?: any }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the sheet when the pathname changes (e.g., when a user clicks a link)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card sticky top-0 z-40">
      <div className="flex items-center gap-2">
        <UniStudyLogo height={32} />
        {profile?.role === 'admin' && (
          <Link
            href="/admin"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border-2 border-[#D89A06] bg-[#D89A06]/15 text-[#00004E] dark:text-[#D89A06] hover:bg-[#D89A06] hover:text-[#00004E] transition-colors ml-1"
          >
            <Shield className="w-3.5 h-3.5 text-[#D89A06]" />
            Admin
          </Link>
        )}
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="p-2 text-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary rounded-md">
          <Menu className="w-6 h-6" />
        </SheetTrigger>
        <SheetContent side="left" className="p-0 flex flex-col w-72 bg-card border-r border-border">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="h-full flex flex-col overflow-y-auto pt-4">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
