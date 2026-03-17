"use client"

import * as React from "react"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { Separator } from "./separator"
import { Button } from "./button"

interface ControlExplanationProps {
  shortExplanation: string;
  longExplanation: React.ReactNode;
  className?: string;
}

export function ControlExplanation({ shortExplanation, longExplanation, className }: ControlExplanationProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref, isOpen]);

  return (
    <div ref={ref} className={cn("text-sm text-muted-foreground", className)}>
        <p>
          {shortExplanation}{' '}
          {!isOpen && (
            <button onClick={() => setIsOpen(true)} className="text-primary underline-offset-4 hover:underline text-sm font-medium">
              Read more
            </button>
          )}
        </p>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent forceMount className="space-y-2 pt-2 data-[state=closed]:hidden data-[state=open]:animate-accordion-down">
            <Separator className="my-2"/>
            <div className="p-3 bg-muted/30 rounded-md text-xs space-y-2">
                <div>{longExplanation}</div>
                <Button variant="link" size="sm" onClick={() => setIsOpen(false)} className="p-0 h-auto text-xs">Close</Button>
            </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
