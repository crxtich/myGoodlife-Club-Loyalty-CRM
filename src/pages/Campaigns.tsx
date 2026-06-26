import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { SegmentBadge } from "@/components/SegmentBadge";
import { MemberSegment, ChannelType, SEGMENT_LABELS, CHANNEL_LABELS, formatKES, classifyMember } from "@/lib/segments";
import { Database } from "@/integrations/supabase/types";
import { Megaphone, FileDown, Loader2, Plus } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type Campaign = Database["public"]["Tables"]["campaigns"]["Row"];

const ALL_SEGMENTS: MemberSegment[] = ["active", "new", "at_risk", "churned_60_90", "churned_90_180", "churned_180_plus"];
const ALL_CHANNELS: { value: ChannelType; label: string }[] = [
  { value: "in_store", label: "In-store" },
  { value: "online", label: "Online" },
  { value: "whatsapp", label: "WhatsApp" },
];

const EMPTY_FORM = {
  name: "",
  objective: "",
  target_segments: [] as MemberSegment[],
  channel: "" as ChannelType | "",
  notes: "",
};

const Campaigns = () => {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const loadCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(`Could not load campaigns: ${error.message}`);
    setCampaigns(data || []);
    setLoadingCampaigns(false);
  }, []);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  function toggleSegment(seg: MemberSegment) {
    setForm((f) => ({
      ...f,
      target_segments: f.target_segments.includes(seg)
        ? f.target_segments.filter((s) => s !== seg)
        : [...f.target_segments, seg],
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Campaign name is required"); return; }
    if (form.target_segments.length === 0) { toast.error("Select at least one target segment"); return; }
    if (!form.channel) { toast.error("Select a channel"); return; }

    setSaving(true);
    try {
      const { error } = await supabase.from("campaigns").insert({
        name: form.name.trim(),
        objective: form.objective.trim() || null,
        target_segments: form.target_segments,
        channel: form.channel as ChannelType,
        notes: form.notes.trim() || null,
        created_by: user?.id ?? null,
      });
      if (error) { toast.error(`Save failed: ${error.message}`); return; }
      toast.success("Campaign saved");
      setForm(EMPTY_FORM);
      loadCampaigns();
    } finally {
      setSaving(false);
    }
  }

  async function handleExportCampaign(campaign: Campaign) {
    setExportingId(campaign.id);
    try {
      const { data: members, error } = await supabase
        .from("members")
        .select("*")
        .in("segment", campaign.target_segments);

      if (error) { toast.error(`Export failed: ${error.message}`); return; }
      if (!members?.length) { toast.error("No members found for this campaign's segments"); return; }

      const today = new Date();
      const rows = members.map((m) => ({
        member_id: m.member_id,
        name: m.name,
        phone: m.phone || "",
        email: m.email || "",
        segment: SEGMENT_LABELS[classifyMember(m.last_purchase_date, m.join_date, m.total_purchases ?? 0, today).segment],
        preferred_channel: m.preferred_channel ? CHANNEL_LABELS[m.preferred_channel] : "",
        last_purchase_date: m.last_purchase_date || "",
        total_purchases: m.total_purchases,
        total_spend: m.total_spend,
        store_location: m.store_location || "",
        campaign_name: campaign.name,
        exported_at: new Date().toISOString(),
      }));

      const csv = Papa.unparse(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const filename = `campaign_${campaign.name.replace(/\s+/g, "_").toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);

      // Log export + increment campaign export count
      if (user) {
        await supabase.from("campaign_exports").insert({
          campaign_id: campaign.id,
          exported_by: user.id,
          member_count: members.length,
          file_reference: filename,
        }).catch(() => null);
      }
      await supabase
        .from("campaigns")
        .update({ export_count: campaign.export_count + 1 })
        .eq("id", campaign.id)
        .catch(() => null);

      toast.success(`Exported ${members.length} members for "${campaign.name}"`);
      loadCampaigns();
    } finally {
      setExportingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Campaigns</p>
        <h1 className="font-display text-3xl font-bold mt-1">Campaign builder</h1>
        <p className="text-muted-foreground mt-1">Design segment-targeted campaigns and export contact lists.</p>
      </div>

      {/* Section A — Create Campaign */}
      <Card className="p-6 gradient-card">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
            <Plus className="h-4 w-4 text-primary-foreground" />
          </div>
          <h2 className="font-display text-xl font-semibold">Create campaign</h2>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label htmlFor="camp-name">Campaign name <span className="text-destructive">*</span></Label>
              <Input
                id="camp-name"
                placeholder="e.g. June Re-activation Drive"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="camp-objective">Objective</Label>
              <Input
                id="camp-objective"
                placeholder="e.g. Reactivate churned members with 10% voucher"
                value={form.objective}
                onChange={(e) => setForm((f) => ({ ...f, objective: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label className="mb-2 block">Target segments <span className="text-destructive">*</span></Label>
              <div className="space-y-2 border border-border rounded-lg p-3 bg-background">
                {ALL_SEGMENTS.map((seg) => (
                  <label key={seg} className="flex items-center gap-2.5 cursor-pointer group">
                    <Checkbox
                      checked={form.target_segments.includes(seg)}
                      onCheckedChange={() => toggleSegment(seg)}
                    />
                    <SegmentBadge segment={seg} />
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="camp-channel">Channel <span className="text-destructive">*</span></Label>
                <Select value={form.channel} onValueChange={(v) => setForm((f) => ({ ...f, channel: v as ChannelType }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select channel" /></SelectTrigger>
                  <SelectContent>
                    {ALL_CHANNELS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="camp-notes">Notes (optional)</Label>
                <Textarea
                  id="camp-notes"
                  placeholder="Any additional context for this campaign…"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="mt-1 resize-none"
                  rows={4}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" className="gradient-primary" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Megaphone className="h-4 w-4 mr-2" />
              Save campaign
            </Button>
          </div>
        </form>
      </Card>

      {/* Section B — Campaign list */}
      <div>
        <h2 className="font-display text-xl font-semibold mb-4">All campaigns</h2>
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Target segments</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead className="text-right">Exports</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingCampaigns ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No campaigns yet — create your first one above.
                  </TableCell>
                </TableRow>
              ) : campaigns.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-medium">{c.name}</div>
                    {c.objective && <div className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate">{c.objective}</div>}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {c.target_segments.map((s) => (
                        <SegmentBadge key={s} segment={s} />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{c.channel ? CHANNEL_LABELS[c.channel] : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.export_count}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("en-KE", { dateStyle: "medium" })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExportCampaign(c)}
                      disabled={exportingId === c.id}
                    >
                      {exportingId === c.id
                        ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        : <FileDown className="h-3.5 w-3.5 mr-1.5" />}
                      Export contacts
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
};

export default Campaigns;
