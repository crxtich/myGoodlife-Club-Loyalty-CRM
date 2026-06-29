import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Upload, Megaphone, FileDown, LogOut,
  ChevronLeft, ChevronRight, Menu, Settings, User,
} from "lucide-react";
import logo from "@/assets/goodlife-logo.svg";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/members", icon: Users, label: "Members" },
  { to: "/upload", icon: Upload, label: "Data Upload" },
  { to: "/campaigns", icon: Megaphone, label: "Campaigns" },
  { to: "/exports", icon: FileDown, label: "Exports" },
];

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-destructive/20 text-destructive",
  manager: "bg-primary/20 text-primary",
  analyst: "bg-success/20 text-success",
};

interface SidebarBodyProps {
  collapsed: boolean;
  onNavClick?: () => void;
  onToggleCollapsed?: () => void;
}

const SidebarBody = ({ collapsed, onNavClick, onToggleCollapsed }: SidebarBodyProps) => {
  const { user, signOut, role } = useAuth();
  const showLabels = !collapsed;
  const initial = user?.email?.[0]?.toUpperCase() ?? "?";
  const roleColor = role ? (ROLE_COLORS[role] ?? "bg-sidebar-primary/20 text-sidebar-primary-foreground") : "";

  return (
    <>
      {/* Header */}
      <div className={cn("border-b border-sidebar-border", collapsed ? "px-3 py-4" : "px-6 py-6")}>
        {showLabels ? (
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="bg-white rounded-lg p-3 inline-flex">
                <img src={logo} alt="Goodlife Pharmacy" className="h-8 w-auto" />
              </div>
              <p className="mt-3 text-xs uppercase tracking-widest text-sidebar-foreground/60">My Goodlife Club</p>
              <p className="text-sm font-display font-semibold text-sidebar-primary-foreground">Loyalty CRM</p>
            </div>
            {onToggleCollapsed && (
              <button
                onClick={onToggleCollapsed}
                className="mt-1 p-1.5 rounded-md text-sidebar-foreground/50 hover:text-sidebar-primary-foreground hover:bg-sidebar-accent transition-colors flex-shrink-0"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="bg-white rounded-lg p-2 inline-flex">
              <img src={logo} alt="Goodlife Pharmacy" className="h-6 w-auto" />
            </div>
            {onToggleCollapsed && (
              <button
                onClick={onToggleCollapsed}
                className="p-1.5 rounded-md text-sidebar-foreground/50 hover:text-sidebar-primary-foreground hover:bg-sidebar-accent transition-colors"
                aria-label="Expand sidebar"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className={cn("flex-1 py-4 space-y-1", collapsed ? "px-1" : "px-3")}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={onNavClick}
            className={({ isActive }) =>
              cn(
                "flex items-center rounded-lg text-sm font-medium transition-base",
                collapsed ? "justify-center px-3 py-3" : "gap-3 px-3 py-2.5",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-primary-foreground"
              )
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {showLabels && label}
          </NavLink>
        ))}
      </nav>

      {/* User footer — avatar chip opens dropdown */}
      <div className={cn("border-t border-sidebar-border", collapsed ? "p-2" : "p-3")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center rounded-lg transition-colors hover:bg-sidebar-accent group",
                collapsed ? "justify-center p-2" : "gap-3 px-3 py-2.5"
              )}
              title={collapsed ? user?.email ?? "" : undefined}
            >
              <div className="h-8 w-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-semibold text-sm flex-shrink-0 ring-2 ring-sidebar-primary/30 group-hover:ring-sidebar-primary/60 transition-all">
                {initial}
              </div>
              {showLabels && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-sidebar-primary-foreground truncate leading-tight">
                    {user?.email}
                  </p>
                  {role && (
                    <span className={cn("inline-block text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded mt-0.5 capitalize", roleColor)}>
                      {role}
                    </span>
                  )}
                </div>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="top"
            align={collapsed ? "center" : "end"}
            sideOffset={8}
            className="w-56"
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm flex-shrink-0">
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{user?.email}</p>
                  {role && (
                    <p className="text-xs text-muted-foreground capitalize">{role}</p>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 cursor-pointer" disabled>
              <User className="h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer" disabled>
              <Settings className="h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
};

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sidebar-collapsed") === "true"
  );

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  };

  return (
    // h-screen + overflow-hidden = viewport is the scroll root, not the page
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Desktop sidebar — fixed height, never scrolls with content */}
      <aside
        className={cn(
          "hidden md:flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 flex-shrink-0",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <SidebarBody collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </aside>

      {/* Mobile sidebar sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
          <SidebarBody collapsed={false} onNavClick={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Content area — this is the only thing that scrolls */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden h-14 flex items-center gap-3 px-4 border-b border-border bg-background flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="bg-sidebar rounded p-1.5 inline-flex">
              <img src={logo} alt="Goodlife Pharmacy" className="h-5 w-auto" />
            </div>
            <span className="font-display font-semibold text-sm">Loyalty CRM</span>
          </div>
        </header>

        {/* Only the main content scrolls — sidebar stays pinned */}
        <main className="flex-1 overflow-y-auto">
          <div
            className={cn("max-w-7xl mx-auto animate-fade-in", isMobile ? "px-4 py-4" : "px-8 py-8")}
            key={location.pathname}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
