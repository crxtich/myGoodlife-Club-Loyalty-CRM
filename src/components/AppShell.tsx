import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Upload, Megaphone, FileDown, LogOut,
  ChevronLeft, ChevronRight, Menu,
} from "lucide-react";
import logo from "@/assets/goodlife-logo.svg";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
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

interface SidebarBodyProps {
  collapsed: boolean;
  onNavClick?: () => void;
  onToggleCollapsed?: () => void;
}

const SidebarBody = ({ collapsed, onNavClick, onToggleCollapsed }: SidebarBodyProps) => {
  const { user, signOut, role } = useAuth();
  const showLabels = !collapsed;

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

      {/* User footer */}
      <div className={cn("border-t border-sidebar-border space-y-3", collapsed ? "p-2" : "p-4")}>
        {showLabels ? (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-semibold text-sm flex-shrink-0">
              {user?.email?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-primary-foreground truncate">{user?.email}</p>
              <p className="text-xs text-sidebar-foreground/60 capitalize">{role ?? "member"}</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="h-9 w-9 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-semibold text-sm" title={user?.email ?? ""}>
              {user?.email?.[0]?.toUpperCase() ?? "?"}
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className={cn(
            "w-full text-sidebar-foreground/80 hover:text-sidebar-primary-foreground hover:bg-sidebar-accent",
            collapsed ? "justify-center px-0" : "justify-start"
          )}
          title={collapsed ? "Sign out" : undefined}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {showLabels && <span className="ml-2">Sign out</span>}
        </Button>
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
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 flex-shrink-0",
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

      {/* Content area */}
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

        <main className="flex-1 overflow-auto">
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
