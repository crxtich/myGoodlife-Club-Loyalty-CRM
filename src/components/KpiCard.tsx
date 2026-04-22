import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string | number;
  trend?: string;
  icon: LucideIcon;
  accent?: "primary" | "success" | "warning" | "destructive" | "accent";
}

const accentMap = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  accent: "bg-accent/10 text-accent",
};

export const KpiCard = ({ label, value, trend, icon: Icon, accent = "primary" }: KpiCardProps) => (
  <Card className="p-5 gradient-card border-border/60 hover:shadow-elegant transition-base relative">
    <div className={cn("absolute top-4 right-4 h-10 w-10 rounded-lg flex items-center justify-center", accentMap[accent])}>
      <Icon className="h-5 w-5" />
    </div>
    <div className="pr-14">
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
      <p className="mt-2 text-3xl font-display font-bold text-foreground whitespace-pre-line">{value}</p>
      {trend && <p className="mt-1 text-xs text-muted-foreground">{trend}</p>}
    </div>
  </Card>
);
