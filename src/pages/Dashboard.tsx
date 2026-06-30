import { useEffect, useState } from "react";
import { Users, TrendingUp, AlertTriangle, Activity, Megaphone, FileDown, Banknote, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { KpiCard } from "@/components/KpiCard";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SegmentBadge } from "@/components/SegmentBadge";
import { RfmSegmentBadge } from "@/components/RfmSegmentBadge";
import { MemberSegment, SEGMENT_LABELS, SEGMENT_DESCRIPTIONS, SEGMENT_ACTIONS, classifyMember } from "@/lib/segments";
import { RfmSegment, RFM_SEGMENTS, RFM_SEGMENT_LABELS, RFM_SEGMENT_MEANINGS, RFM_SEGMENT_ACTIONS } from "@/lib/rfmSegments";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from "recharts";

const RFM_COLORS: Record<RfmSegment, string> = {
  champions: "hsl(var(--seg-active))",
  loyals: "hsl(142 71% 45%)",
  at_risk_rfm: "hsl(var(--seg-at-risk))",
  lapsed: "hsl(var(--seg-churn-2))",
  new_rfm: "hsl(var(--seg-new))",
};

const RfmBarTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, count, segment } = payload[0].payload as { name: string; count: number; segment: RfmSegment };
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-md w-56">
      <p className="font-semibold text-sm">{name}</p>
      <p className="text-xs text-muted-foreground mt-1">{RFM_SEGMENT_MEANINGS[segment]}</p>
      <div className="border-t border-border mt-2 pt-2 space-y-1">
        <p className="text-xs tabular-nums"><span className="font-medium">Members:</span> {count.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Action:</span> {RFM_SEGMENT_ACTIONS[segment]}</p>
      </div>
    </div>
  );
};

const LifecycleBarTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, count, segment } = payload[0].payload as { name: string; count: number; segment: MemberSegment };
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-md w-52">
      <p className="font-semibold text-sm">{name}</p>
      <p className="text-xs text-muted-foreground mt-1">{SEGMENT_DESCRIPTIONS[segment]}</p>
      <div className="border-t border-border mt-2 pt-2 space-y-1">
        <p className="text-xs tabular-nums"><span className="font-medium">Members:</span> {count.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Action:</span> {SEGMENT_ACTIONS[segment]}</p>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState({
    total: 0, active: 0, atRisk: 0, churned: 0, lifetimeValue: 0, campaigns: 0, exports: 0,
    championsLoyals: 0,
  });
  const [rfmData, setRfmData] = useState<{ segment: RfmSegment; count: number }[]>([]);
  const [segmentData, setSegmentData] = useState<{ segment: MemberSegment; count: number }[]>([]);

  useEffect(() => {
    (async () => {
      const { count: total } = await supabase.from("members").select("*", { count: "exact", head: true });
      const { data: members } = await supabase.from("members").select("last_purchase_date, join_date, total_purchases, total_spend, rfm_segment");
      const { count: campaigns } = await supabase.from("campaigns").select("*", { count: "exact", head: true });
      const { count: exports } = await supabase.from("campaign_exports").select("*", { count: "exact", head: true });

      const counts: Record<string, number> = {};
      const rfmCounts: Record<string, number> = {};
      let ltv = 0;
      const today = new Date();
      members?.forEach((m) => {
        const { segment } = classifyMember(m.last_purchase_date, m.join_date, m.total_purchases ?? 0, today);
        counts[segment] = (counts[segment] || 0) + 1;
        if (m.rfm_segment) rfmCounts[m.rfm_segment] = (rfmCounts[m.rfm_segment] || 0) + 1;
        ltv += Number(m.total_spend || 0);
      });

      const segs: MemberSegment[] = ["active", "new", "at_risk", "churned_60_90", "churned_90_180", "churned_180_plus"];
      setSegmentData(segs.map((s) => ({ segment: s, count: counts[s] || 0 })));
      setRfmData(RFM_SEGMENTS.map((s) => ({ segment: s, count: rfmCounts[s] || 0 })));

      const championsLoyals = (rfmCounts.champions || 0) + (rfmCounts.loyals || 0);

      setStats({
        total: total ?? 0,
        active: counts.active || 0,
        atRisk: counts.at_risk || 0,
        churned: (counts.churned_60_90 || 0) + (counts.churned_90_180 || 0) + (counts.churned_180_plus || 0),
        lifetimeValue: ltv,
        campaigns: campaigns ?? 0,
        exports: exports ?? 0,
        championsLoyals,
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

  // Health Score is redefined against the RFM model: % of members who are
  // Champions or Loyals (i.e. high-value, currently engaged) rather than the
  // old lifecycle "purchased in the last 30 days" rate, since RFM is now the
  // programme's primary segmentation lens.
  const healthScore = stats.total > 0 ? Math.round((stats.championsLoyals / stats.total) * 100) : 0;
  const activeRate = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Overview</p>
        <h1 className="font-display text-3xl font-bold mt-1">Programme health</h1>
        <p className="text-muted-foreground mt-1">Live snapshot of the My Goodlife Club member base across Kenya and Uganda.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Members" value={stats.total.toLocaleString()} icon={Users} accent="primary" trend={`${healthScore}% Champions+Loyals`} />
        <KpiCard label="Champions + Loyals" value={stats.championsLoyals.toLocaleString()} icon={Crown} accent="success" trend="High-value & engaged" />
        <KpiCard label="At Risk" value={stats.atRisk.toLocaleString()} icon={AlertTriangle} accent="warning" trend="Lifecycle: 30–60 days inactive" />
        <KpiCard label="Churned" value={stats.churned.toLocaleString()} icon={TrendingUp} accent="destructive" trend="Lifecycle: 60+ days inactive" />
        <KpiCard label="Lifetime Value" value={`KES ${stats.lifetimeValue.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`} icon={Banknote} accent="accent" />
        <KpiCard label="Campaigns Run" value={stats.campaigns} icon={Megaphone} accent="primary" />
        <KpiCard label="CSV Exports" value={stats.exports} icon={FileDown} accent="primary" />
        <KpiCard label="Health Score" value={`${healthScore}/100`} icon={Activity} accent={healthScore >= 40 ? "success" : "warning"} trend="% Champions + Loyals (RFM)" />
      </div>

      <Tabs defaultValue="rfm" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rfm">RFM segmentation</TabsTrigger>
          <TabsTrigger value="lifecycle">Lifecycle (legacy)</TabsTrigger>
        </TabsList>

        <TabsContent value="rfm" className="space-y-4 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-6 gradient-card">
              <h3 className="font-display text-lg font-semibold">Members by RFM segment</h3>
              <p className="text-sm text-muted-foreground mb-4">Recency · Frequency · Monetary distribution — the programme's primary segmentation.</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rfmData.map((d) => ({ name: RFM_SEGMENT_LABELS[d.segment], count: d.count, segment: d.segment }))} margin={{ bottom: 48 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" interval={0} angle={-35} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip content={<RfmBarTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {rfmData.map((d, i) => <Cell key={i} fill={RFM_COLORS[d.segment]} />)}
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
                      <Pie data={rfmData} dataKey="count" nameKey="segment" innerRadius={45} outerRadius={75} paddingAngle={2}>
                        {rfmData.map((d, i) => <Cell key={i} fill={RFM_COLORS[d.segment]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="mt-3 space-y-1.5">
                {rfmData.filter((s) => s.count > 0).map((s) => (
                  <div key={s.segment} className="flex items-center justify-between text-sm">
                    <RfmSegmentBadge segment={s.segment} />
                    <span className="font-medium">{s.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="lifecycle" className="space-y-4 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-6 gradient-card">
              <h3 className="font-display text-lg font-semibold">Members by segment</h3>
              <p className="text-sm text-muted-foreground mb-4">Legacy lifecycle distribution (recency/join-date based), kept as a secondary view.</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={segmentData.map((d) => ({ name: SEGMENT_LABELS[d.segment], count: d.count, segment: d.segment }))} margin={{ bottom: 48 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--muted-foreground))" interval={0} angle={-35} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip content={<LifecycleBarTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
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
        </TabsContent>
      </Tabs>

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
