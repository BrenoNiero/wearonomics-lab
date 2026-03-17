"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Structural skeleton remains same for SSR/CSR to prevent hydration errors
  const isUploadActive = mounted && pathname === "/";
  const isLedgerActive = mounted && pathname === "/ledger";
  const isSystemActive = mounted && (pathname === "/library" || pathname === "/control-center");

  return (
    <header className="w-full border-b border-border bg-background">
      <div className="mx-auto flex max-w-[820px] items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
        <Link href="/" className="text-lg font-semibold tracking-tight text-foreground">
          Wearonomics Lab
        </Link>
        
        <div className="flex items-center gap-6">
          <nav className="hidden items-center space-x-8 md:flex">
            <Link
              href="/"
              className={cn(
                "text-sm font-medium transition-colors text-foreground",
                !isUploadActive && "hover:text-foreground"
              )}
            >
              Upload
            </Link>
            <Link
              href="/ledger"
              className={cn(
                "text-sm font-medium transition-colors text-foreground",
                !isLedgerActive && "hover:text-foreground"
              )}
            >
              Ledger
            </Link>
          </nav>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "h-8 w-8 transition-colors text-foreground",
                  isSystemActive && "bg-accent"
                )}
              >
                <Settings className="h-5 w-5" />
                <span className="sr-only">System Menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => router.push('/library')} className="text-foreground">
                Data Library
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push('/control-center')} className="text-foreground">
                Control Center
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}