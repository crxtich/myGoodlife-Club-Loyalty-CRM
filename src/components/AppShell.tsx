import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Upload, Megaphone, FileDown, Settings, LogOut,
} from "lucide-react";
import logo from "@/assets/goodlife-logo.svg";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/members", icon: Users, label: "Members" },
  { to: "/upload", icon: Upload, label: "Data Upload" },
  { to: "/campaigns", icon: Megaphone, label: "Campaigns" },
  { to: "/exports", icon: FileDown, label: "Exports" },
];

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const { user, signOut, role } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
        <div className="px-6 py-6 border-b border-sidebar-border">
          <div className="bg-white rounded-lg p-3 inline-flex">
            <img src={logo} alt="Goodlife Pharmacy" className="h-8 w-auto" />
          </div>
          <p className="mt-3 text-xs uppercase tracking-widest text-sidebar-foreground/60">myGoodlife Club</p>
          <p className="text-sm font-display font-semibold text-sidebar-primary-foreground">Loyalty CRM</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-base",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-primary-foreground"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-semibold text-sm">
              {user?.email?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-primary-foreground truncate">{user?.email}</p>
              <p className="text-xs text-sidebar-foreground/60 capitalize">{role ?? "member"}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-primary-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-8 py-8 animate-fade-in" key={location.pathname}>
          {children}
        </div>
      </main>
    </div>
  );
};
