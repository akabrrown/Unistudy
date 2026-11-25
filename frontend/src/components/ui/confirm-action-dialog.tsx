'use client';

import React from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

export interface ConfirmActionDialogProps {
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'default';
  loading?: boolean;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmActionDialog({
  open,
  isOpen,
  onOpenChange,
  onClose,
  title,
  description,
  confirmLabel,
  confirmText,
  cancelLabel = 'Cancel',
  variant = 'destructive',
  loading,
  isLoading,
  onConfirm,
}: ConfirmActionDialogProps) {
  const isDialogOpen = open ?? isOpen ?? false;
  const handleOpenChange = onOpenChange ?? ((o: boolean) => { if (!o && onClose) onClose(); });
  const resolvedConfirmLabel = confirmLabel ?? confirmText ?? 'Confirm';
  const isBusy = loading ?? isLoading ?? false;

  return (
    <AlertDialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="sm:max-w-md border-border/80 bg-card shadow-xl">
        <AlertDialogHeader>
          <AlertDialogMedia
            className={cn(
              variant === 'destructive'
                ? 'bg-destructive/10 text-destructive'
                : 'bg-[#00004E]/10 text-[#00004E] dark:bg-[#D89A06]/15 dark:text-[#D89A06]'
            )}
          >
            <AlertTriangle className="size-5" />
          </AlertDialogMedia>
          <AlertDialogTitle className="font-bold text-foreground">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-xs leading-relaxed">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isBusy} className="text-xs h-9 cursor-pointer">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isBusy}
            onClick={(e) => {
              e.preventDefault();
              void onConfirm();
            }}
            className={cn(
              'text-xs font-semibold h-9 cursor-pointer',
              variant === 'destructive'
                ? 'bg-destructive text-white hover:bg-destructive/90'
                : 'bg-[#00004E] text-white hover:bg-[#00004E]/90 dark:bg-[#D89A06] dark:text-[#00004E] dark:hover:bg-[#D89A06]/90 border border-[#D89A06]/40'
            )}
          >
            {isBusy ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Processing...
              </>
            ) : (
              resolvedConfirmLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
