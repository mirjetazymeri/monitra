"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, Menu, RefreshCw, Settings } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { useRefreshAll } from "@/hooks/use-monitra";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Logo } from "./logo";
import { SidebarNav } from "./sidebar";
import { findNavItem } from "./navigation";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function Header() {
  const pathname = usePathname();
  const nav = findNavItem(pathname);
  const { user, logout } = useAuth();
  const refreshAll = useRefreshAll();
  const [refreshing, setRefreshing] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isDetail = nav?.href === "/endpoints" && pathname !== "/endpoints";
  const title = isDetail ? "Endpoint details" : (nav?.label ?? "Monitra");
  const description = isDetail ? "Availability and response times recorded for this endpoint." : nav?.description;

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshAll();
    } finally {
      setRefreshing(false);
    }
  }


  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="-ml-1 inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-elevated hover:text-foreground lg:hidden outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-foreground sm:text-xl">{title}</h1>
          {description && <p className="hidden truncate text-xs text-muted-foreground md:block">{description}</p>}
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground disabled:opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Refresh data"
        >
          <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
          <span className="hidden sm:inline">Refresh</span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex h-9 items-center gap-2 rounded-lg pr-2 pl-1 text-sm transition-colors hover:bg-elevated outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Account menu"
          >
            <span className="inline-flex size-7 items-center justify-center rounded-md bg-primary/15 font-heading text-xs font-bold text-primary">
              {initials(user.name)}
            </span>
            <span className="hidden max-w-32 truncate font-medium text-foreground md:inline">{user.name}</span>
            <ChevronDown className="hidden size-4 text-muted-foreground md:block" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <span className="block truncate text-sm font-medium text-foreground">{user.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/settings" />}>
              <Settings />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => void logout()}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0">
          <SheetHeader className="border-b border-sidebar-border px-5 py-4">
            <SheetTitle>
              <Logo />
            </SheetTitle>
            <SheetDescription className="sr-only">Main navigation</SheetDescription>
          </SheetHeader>
          <div className="px-3 py-4">
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
