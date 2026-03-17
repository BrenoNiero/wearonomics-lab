
'use client';

import { cn } from '@/lib/utils';

interface ValidationProfileBadgeProps {
  className?: string;
  showConfirmation?: boolean;
}

export function ValidationProfileBadge({ className }: ValidationProfileBadgeProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-0.5 text-[10px] font-medium text-foreground tracking-wide uppercase transition-colors">
        Human Movement Validation Active
      </div>
    </div>
  );
}
