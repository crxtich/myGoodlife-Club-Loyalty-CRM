import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { SegmentBadge } from "@/components/SegmentBadge";
import { MemberSegment, SEGMENT_LABELS, CHANNEL_LABELS, formatKES } from "@/lib/segments";
import { Database } from "@/integrations/supabase/types";
import { Search, FileDown } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type Member = Database["public"]["Tables"]["members"]["Row"];

const Members = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("members").select("*").order("priority_score", { ascending: false }).limit(500);
    setMembers(data || []);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (segmentFilter !== "all" && m.segment !== segmentFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return m.name?.toLowerCase().includes(q) || m.phone?.includes(q) || m.email?.toLowerCase().includes(q) || m.member_id?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [members, search, segmentFilter]);

  async function handleExport() {
    if (filtered.length === 0) { toast.error("No members to export"); return; }
    const rows = filtered.map((m) => ({
      member_id: m.member_id,
      name: m.name,
      phone: m.phone || "",
      email: m.email || "",
      segment: m.segment ? SEGMENT_LABELS[m.segment as MemberSegment] : "",
      priority_score: m.priority_score,
      preferred_channel: m.preferred_channel ? CHANNEL_LABELS[m.preferred_channel] : "",
      last_purchase_date: m.last_purchase_date || "",
      total_purchases: m.total_purchases,
      total_spend: m.total_spend,
      store_location: m.store_location || "",
      campaign_name: "",
      exported_at: new Date().toISOString(),
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mygoodlife_members_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    if (user) {
      await supabase.from("campaign_exports").insert({
        exported_by: user.id,
        member_count: filtered.length,
        file_reference: a.download,
      });
    }
    toast.success(`Exported ${filtered.length} members`);
  }

  const segments: MemberSegment[] = ["active", "new", "at_risk", "churned_60_90", "churned_90_180", "churned_180_plus"];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Member base</p>
          <h1 className="font-display text-3xl font-bold mt-1">Members</h1>
          <p className="text-muted-foreground mt-1">{members.length.toLocaleString()} loaded · sorted by priority</p>
        </div>
        <Button onClick={handleExport} className="gradient-primary">
          <FileDown className="h-4 w-4 mr-2" /> Export filtered ({filtered.length})
        </Button>
      </div>

      <Card className="p-4 gradient-card">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search name, phone, email, ID…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={segmentFilter} onValueChange={setSegmentFilter}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Segment" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All segments</SelectItem>
              {segments.map((s) => (
                <SelectItem key={s} value={s}>{SEGMENT_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Segment</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead className="text-right">Purchases</TableHead>
              <TableHead className="text-right">Spend</TableHead>
              <TableHead>Last Purchase</TableHead>
              <TableHead className="text-right">Priority</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No members found. Upload a file to get started.</TableCell></TableRow>
            ) : filtered.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.member_id} · {m.store_location || "—"}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{m.phone || "—"}</div>
                  <div className="text-xs text-muted-foreground">{m.email || "—"}</div>
                </TableCell>
                <TableCell><SegmentBadge segment={m.segment as MemberSegment | null} /></TableCell>
                <TableCell className="text-sm">{m.preferred_channel ? CHANNEL_LABELS[m.preferred_channel] : "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{m.total_purchases}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">{formatKES(Number(m.total_spend))}</TableCell>
                <TableCell className="text-sm">{m.last_purchase_date || "—"}</TableCell>
                <TableCell className="text-right tabular-nums">
                  <span className={m.priority_score >= 70 ? "text-destructive font-semibold" : m.priority_score >= 50 ? "text-warning font-semibold" : "text-muted-foreground"}>
                    {m.priority_score}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Members;
