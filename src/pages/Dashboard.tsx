import { useEffect, useState } from "react";
import { Users, TrendingUp, AlertTriangle, Activity, Megaphone, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { KpiCard } from "@/components/KpiCard";
import { Card } from "@/components/ui/card";
import { SegmentBadge } from "@/components/SegmentBadge";
import { MemberSegment, SEGMENT_LABELS, formatKES } from "@/lib/segments";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from "recharts";

const Dashboard = () => {
  const [stats, setStats] = useState({
    total: 0, active: 0, atRisk: 0, churned: 0, lifetimeValue: 0, campaigns: 0, exports: 0,
  });
  const [segmentData, setSegmentData] = useState<{ segment: MemberSegment; count: number }[]>([]);

  useEffect(() => {
    (async () => {
      const { count: total } = await supabase.from("members").select("*", { count: "exact", head: true });
      const { data: members } = await supabase.from("members").select("segment, total_spend");
      const { count: campaigns } = await supabase.from("campaigns").select("*", { count: "exact", head: true });
      const { count: exports } = await supabase.from("campaign_exports").select("*", { count: "exact", head: true });

      const counts: Record<string, number> = {};
      let ltv = 0;
      members?.forEach((m) => {
        if (m.segment) counts[m.segment] = (counts[m.segment] || 0) + 1;
        ltv += Number(m.total_spend || 0);
      });

      const segs: MemberSegment[] = ["active", "new", "at_risk", "churned_60_90", "churned_90_180", "churned_180_plus"];
      setSegmentData(segs.map((s) => ({ segment: s, count: counts[s] || 0 })));

      setStats({
        total: total ?? 0,
        active: counts.active || 0,
        atRisk: counts.at_risk || 0,
        churned: (counts.churned_60_90 || 0) + (counts.churned_90_180 || 0) + (counts.churned_180_plus || 0),
        lifetimeValue: ltv,
        campaigns: campaigns ?? 0,
        exports: exports ?? 0,
      });
    })();
  }, []);

  const segColors: Record<MemberSegment, string> = {
    active: "hsl(var(--seg-active))",
    new: "hsl(var(--seg-new))",
    at_risk: "hsl(var(--seg-at-risk))",
    churned_60_90: "hsl(var(--seg-churn-1))",
    churned_90_180: "hsl(var(--seg-churn-2))",
    churned_180_plus: "hsl(var(--seg-churn-3))",
  };

  const activeRate = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Overview</p>
        <h1 className="font-display text-3xl font-bold mt-1">Programme health</h1>
        <p className="text-muted-foreground mt-1">Live snapshot of the myGoodlife Club member base.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Members" value={stats.total.toLocaleString()} icon={Users} accent="primary" trend={`${activeRate}% active rate`} />
        <KpiCard label="Active (30d)" value={stats.active.toLocaleString()} icon={Activity} accent="success" trend="Purchased recently" />
        <KpiCard label="At Risk" value={stats.atRisk.toLocaleString()} icon={AlertTriangle} accent="warning" trend="30–60 days inactive" />
        <KpiCard label="Churned" value={stats.churned.toLocaleString()} icon={TrendingUp} accent="destructive" trend="60+ days inactive" />
        <KpiCard label="Lifetime Value" value={formatKES(stats.lifetimeValue)} icon={TrendingUp} accent="accent" />
        <KpiCard label="Campaigns Run" value={stats.campaigns} icon={Megaphone} accent="primary" />
        <KpiCard label="CSV Exports" value={stats.exports} icon={FileDown} accent="primary" />
        <KpiCard label="Health Score" value={`${activeRate}/100`} icon={Activity} accent={activeRate >= 40 ? "success" : "warning"} trend="Active member rate" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 gradient-card">
          <h3 className="font-display text-lg font-semibold">Members by segment</h3>
          <p className="text-sm text-muted-foreground mb-4">Lifecycle distribution across the member base.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={segmentData.map((d) => ({ name: SEGMENT_LABELS[d.segment], count: d.count, fill: segColors[d.segment] }))}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {segmentData.map((d, i) => <Cell key={i} fill={segColors[d.segment]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 gradient-card">
          <h3 className="font-display text-lg font-semibold">Segment breakdown</h3>
          <p className="text-sm text-muted-foreground mb-4">Share of total members.</p>
          {stats.total === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
              No data yet — upload members to see breakdown.
            </div>
          ) : (
            <div className="h-48">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={segmentData} dataKey="count" nameKey="segment" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {segmentData.map((d, i) => <Cell key={i} fill={segColors[d.segment]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-3 space-y-1.5">
            {segmentData.filter((s) => s.count > 0).map((s) => (
              <div key={s.segment} className="flex items-center justify-between text-sm">
                <SegmentBadge segment={s.segment} />
                <span className="font-medium">{s.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {stats.total === 0 && (
        <Card className="p-8 gradient-card border-dashed border-2 text-center">
          <h3 className="font-display text-xl font-semibold">No members yet</h3>
          <p className="text-muted-foreground mt-2">Head to the Data Upload page to import your first Excel or CSV export.</p>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
