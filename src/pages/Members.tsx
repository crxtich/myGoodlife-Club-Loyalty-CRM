import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { SegmentBadge } from "@/components/SegmentBadge";
import { MemberSegment, SEGMENT_LABELS, CHANNEL_LABELS, COUNTRY_LABELS, formatKES, classifyMember } from "@/lib/segments";
import { Database } from "@/integrations/supabase/types";
import { Search, FileDown, ChevronLeft, ChevronRight } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type Member = Database["public"]["Tables"]["members"]["Row"];

const PAGE_SIZES = [20, 50, 100, 200];

const Members = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  const load = useCallback(async (pg: number, seg: string, q: string, ps: number) => {
    setLoading(true);
    try {
      let query = supabase.from("members").select("*", { count: "exact" });

      if (q) {
        query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%,member_id.ilike.%${q}%`);
      }

      if (seg !== "all") {
        query = query.eq("segment", seg);
      }

      const { data, count, error } = await query
        .order("priority_score", { ascending: false })
        .range(pg * ps, pg * ps + ps - 1);

      if (error) { toast.error(`Load error: ${error.message}`); return; }
      setMembers(data || []);
      setTotalCount(count ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(page, segmentFilter, search, pageSize); }, [page, segmentFilter, search, pageSize, load]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleSegmentChange = (val: string) => {
    setSegmentFilter(val);
    setPage(0);
  };

  const handlePageSizeChange = (val: string) => {
    setPageSize(Number(val));
    setPage(0);
  };

  async function handleExport() {
    if (members.length === 0) { toast.error("No members to export"); return; }
    const today = new Date();
    const rows = members.map((m) => ({
      member_id: m.member_id,
      name: m.name,
      phone: m.phone || "",
      email: m.email || "",
      country: (m as any).country || "",
      segment: SEGMENT_LABELS[classifyMember(m.last_purchase_date, m.join_date, m.total_purchases ?? 0, today).segment],
      priority_score: m.priority_score,
      preferred_channel: m.preferred_channel ? CHANNEL_LABELS[m.preferred_channel] : "",
      last_purchase_date: m.last_purchase_date || "",
      total_purchases: m.total_purchases,
      total_spend: m.total_spend,
      store_location: m.store_location || "",
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
        member_count: totalCount,
        file_reference: a.download,
      }).catch(() => null);
    }
    toast.success(`Exported ${members.length} members (page ${page + 1})`);
  }

  const segments: MemberSegment[] = ["active", "new", "at_risk", "churned_60_90", "churned_90_180", "churned_180_plus"];
  const start = page * pageSize + 1;
  const end = Math.min(page * pageSize + members.length, totalCount);
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Member base</p>
          <h1 className="font-display text-3xl font-bold mt-1">Members</h1>
          {!loading && (
            <p className="text-muted-foreground mt-1">
              Showing {totalCount === 0 ? "0" : `${start}–${end}`} of {totalCount.toLocaleString()} members · sorted by priority
            </p>
          )}
        </div>
        <Button onClick={handleExport} className="gradient-primary">
          <FileDown className="h-4 w-4 mr-2" /> Export page ({members.length})
        </Button>
      </div>

      <Card className="p-4 gradient-card">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, phone, email, ID…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={segmentFilter} onValueChange={handleSegmentChange}>
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
              <TableHead>Country</TableHead>
              <TableHead className="text-right">Purchases</TableHead>
              <TableHead className="text-right">Spend</TableHead>
              <TableHead>Last Purchase</TableHead>
              <TableHead className="text-right">Priority</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : members.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">No members found. Upload a file to get started.</TableCell></TableRow>
            ) : members.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.member_id} · {m.store_location || "—"}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{m.phone || "—"}</div>
                  <div className="text-xs text-muted-foreground">{m.email || "—"}</div>
                </TableCell>
                <TableCell><SegmentBadge segment={classifyMember(m.last_purchase_date, m.join_date, m.total_purchases ?? 0).segment} /></TableCell>
                <TableCell className="text-sm">{m.preferred_channel ? CHANNEL_LABELS[m.preferred_channel] : "—"}</TableCell>
                <TableCell className="text-sm">{(m as any).country ? COUNTRY_LABELS[(m as any).country as keyof typeof COUNTRY_LABELS] : "—"}</TableCell>
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

      {/* Pagination footer — always visible when there are members */}
      {totalCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Rows per page */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page:</span>
            <div className="flex gap-1">
              {PAGE_SIZES.map((ps) => (
                <button
                  key={ps}
                  onClick={() => handlePageSizeChange(String(ps))}
                  className={`px-2.5 py-1 rounded text-sm font-medium border transition-colors ${
                    pageSize === ps
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-muted text-foreground"
                  }`}
                >
                  {ps}
                </button>
              ))}
            </div>
          </div>

          {/* Page controls */}
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {totalCount === 0 ? "No results" : `${start}–${end} of ${totalCount.toLocaleString()}`}
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage(0)} disabled={page === 0 || loading} title="First page">
                <ChevronLeft className="h-3.5 w-3.5" /><ChevronLeft className="h-3.5 w-3.5 -ml-2" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 0 || loading}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <span className="flex items-center px-3 text-sm font-medium border border-border rounded-md bg-muted">
                {page + 1} / {totalPages}
              </span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1 || loading}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1 || loading} title="Last page">
                <ChevronRight className="h-3.5 w-3.5" /><ChevronRight className="h-3.5 w-3.5 -ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Members;
