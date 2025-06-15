
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Alert, alertVariants } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { VariantProps } from 'class-variance-authority';

interface DismissibleAlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  children: React.ReactNode;
  storageKey?: string;
}

export function DismissibleAlert({
  children,
  className,
  variant,
  storageKey,
  ...props
}: DismissibleAlertProps) {
  const [isVisible, setIsVisible] = useState(() => {
    if (!storageKey) return true;
    try {
      return localStorage.getItem(storageKey) !== 'true';
    } catch (error) {
      console.warn(`Could not read from localStorage: ${error}`);
      return true;
    }
  });

  const handleDismiss = () => {
    setIsVisible(false);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, 'true');
      } catch (error) {
        console.warn(`Could not write to localStorage: ${error}`);
      }
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="relative">
      <Alert className={cn('pr-12', className)} variant={variant} {...props}>
        {children}
      </Alert>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1/2 right-2 -translate-y-1/2 h-8 w-8 text-foreground/70 hover:text-foreground"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Dismiss</span>
      </Button>
    </div>
  );
}
