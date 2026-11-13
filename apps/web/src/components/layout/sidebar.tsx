"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Logo } from "./logo";
import { NAV_ITEMS, findNavItem } from "./navigation";

interface SidebarNavProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const active = findNavItem(pathname);

  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive = active?.href === item.href;
        const link = (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-sidebar-accent text-foreground"
                : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            {isActive && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary" aria-hidden="true" />}
            <item.icon className={cn("size-[18px] shrink-0", isActive ? "text-primary" : "text-subtle-foreground group-hover:text-muted-foreground")} />
            {collapsed ? <span className="sr-only">{item.label}</span> : <span className="truncate">{item.label}</span>}
          </Link>
        );

        if (!collapsed) return link;

        return (
          <Tooltip key={item.href}>
            <TooltipTrigger render={link} />
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

/** Desktop sidebar (≥ lg). On smaller screens navigation lives in a sheet. */
export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      <div className={cn("flex h-16 items-center border-b border-sidebar-border", collapsed ? "justify-center" : "px-5")}>
        <Link href="/overview" aria-label="Monitra overview" className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Logo collapsed={collapsed} />
        </Link>
      </div>

      <div className={cn("flex-1 overflow-y-auto py-5 scrollbar-thin", collapsed ? "px-3" : "px-3")}>
        {!collapsed && <p className="mb-2 px-3 text-xs font-medium tracking-wider text-subtle-foreground uppercase">Monitoring</p>}
        <SidebarNav collapsed={collapsed} />
      </div>

      <div className={cn("border-t border-sidebar-border p-3", collapsed && "flex justify-center")}>
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className={cn(
            "flex h-9 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring",
            collapsed ? "w-9 justify-center px-0" : "w-full",
          )}
        >
          {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
