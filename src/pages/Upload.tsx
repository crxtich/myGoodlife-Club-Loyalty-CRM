import { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload as UploadIcon, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { classifyMember, ChannelType } from "@/lib/segments";
import { useAuth } from "@/contexts/AuthContext";
import { Database } from "@/integrations/supabase/types";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Insert = Database["public"]["Tables"]["members"]["Insert"];
type UploadBatch = Database["public"]["Tables"]["upload_batches"]["Row"];

interface ParsedRow { [key: string]: any }

interface UploadSummary {
  processed: number;
  newMembers: number;
  updatedMembers: number;
  errors: { row: number; reason: string }[];
}

const FIELD_ALIASES: Record<keyof Omit<Insert, "id" | "created_at" | "updated_at" | "segment" | "priority_score" | "total_purchases" | "total_spend">, string[]> = {
  member_id: ["member_id", "memberid", "id", "member id", "customer_id", "customer id"],
  name: ["name", "full_name", "customer_name", "full name", "customer name"],
  phone: ["phone", "phone_number", "mobile", "phone number", "msisdn"],
  email: ["email", "email_address"],
  join_date: ["join_date", "signup_date", "registration_date", "join date"],
  store_location: ["store", "store_location", "branch", "location"],
  preferred_channel: ["channel", "preferred_channel", "preferred channel"],
  last_purchase_date: ["last_purchase_date", "last_purchase", "last purchase", "last purchase date"],
  country: ["country", "country_name", "nation"],
};

function findField(row: ParsedRow, names: string[]): any {
  const keys = Object.keys(row);
  for (const name of names) {
    const key = keys.find((k) => k.toLowerCase().trim().replace(/\s+/g, "_") === name.replace(/\s+/g, "_"));
    if (key && row[key] !== undefined && row[key] !== "") return row[key];
  }
  return null;
}

function normalizeCountry(v: any): "Kenya" | "Uganda" | null {
  if (!v) return null;
  const s = String(v).toLowerCase().trim();
  if (s.includes("kenya") || s === "ke") return "Kenya";
  if (s.includes("uganda") || s === "ug") return "Uganda";
  return null;
}

function normalizeChannel(v: any): ChannelType | null {
  if (!v) return null;
  const s = String(v).toLowerCase().replace(/[\s-]/g, "_");
  if (s.includes("store") || s.includes("instore")) return "in_store";
  if (s.includes("whats")) return "whatsapp";
  if (s.includes("online") || s.includes("web") || s.includes("app")) return "online";
  return null;
}

function normalizeDate(v: any): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number" && v > 25569 && v < 60000) {
    const date = XLSX.SSF.parse_date_code(v);
    if (date) return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
  }
  const d = new Date(v);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function normalizePhone(v: any): string | null {
  if (!v) return null;
  return String(v).replace(/[^\d+]/g, "") || null;
}

const Upload = () => {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<UploadSummary | null>(null);
  const [batches, setBatches] = useState<UploadBatch[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadBatches(); }, []);

  async function loadBatches() {
    const { data } = await supabase
      .from("upload_batches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setBatches(data || []);
  }

  async function parseFile(file: File): Promise<ParsedRow[]> {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "csv") {
      return new Promise((resolve, reject) => {
        Papa.parse<ParsedRow>(file, {
          header: true, skipEmptyLines: true,
          complete: (res) => resolve(res.data),
          error: (err) => reject(err),
        });
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      return XLSX.utils.sheet_to_json<ParsedRow>(sheet, { defval: null });
    }
    throw new Error("Unsupported file type. Use .xlsx, .xls, or .csv");
  }

  async function handleFile(file: File) {
    setBusy(true);
    setSummary(null);
    try {
      const rows = await parseFile(file);
      if (!rows.length) { toast.error("File is empty"); setBusy(false); return; }

      const errors: { row: number; reason: string }[] = [];
      const records: Insert[] = [];
      const seenIds = new Set<string>();

      rows.forEach((row, idx) => {
        const memberId = String(findField(row, FIELD_ALIASES.member_id) || "").trim();
        const name = String(findField(row, FIELD_ALIASES.name) || "").trim();
        const phone = normalizePhone(findField(row, FIELD_ALIASES.phone));
        if (!memberId) { errors.push({ row: idx + 2, reason: "Missing member ID" }); return; }
        if (!name) { errors.push({ row: idx + 2, reason: "Missing name" }); return; }
        if (!phone) { errors.push({ row: idx + 2, reason: "Missing phone" }); return; }
        if (seenIds.has(memberId)) { errors.push({ row: idx + 2, reason: `Duplicate member ID: ${memberId}` }); return; }
        seenIds.add(memberId);

        const lastPurchase = normalizeDate(findField(row, FIELD_ALIASES.last_purchase_date));
        const joinDate = normalizeDate(findField(row, FIELD_ALIASES.join_date));
        const totalPurchases = Number(row.total_purchases || row["total purchases"] || row.purchases || 0);
        const totalSpend = Number(row.total_spend || row["total spend"] || row.spend || 0);

        const { segment, priority } = classifyMember(lastPurchase, joinDate, totalPurchases);

        records.push({
          member_id: memberId,
          name,
          phone,
          email: findField(row, FIELD_ALIASES.email),
          join_date: joinDate,
          store_location: findField(row, FIELD_ALIASES.store_location),
          preferred_channel: normalizeChannel(findField(row, FIELD_ALIASES.preferred_channel)),
          last_purchase_date: lastPurchase,
          total_purchases: totalPurchases,
          total_spend: totalSpend,
          country: normalizeCountry(findField(row, FIELD_ALIASES.country)),
          segment,
          priority_score: priority,
        });
      });

      const ids = records.map((r) => r.member_id);
      const { data: existing } = await supabase.from("members").select("member_id").in("member_id", ids);
      const existingIds = new Set((existing || []).map((m) => m.member_id));
      const newCount = records.filter((r) => !existingIds.has(r.member_id)).length;
      const updateCount = records.length - newCount;

      const BATCH = 500;
      for (let i = 0; i < records.length; i += BATCH) {
        const chunk = records.slice(i, i + BATCH);
        const { error } = await supabase.from("members").upsert(chunk, { onConflict: "member_id" });
        if (error) { toast.error(`Insert error: ${error.message}`); break; }
      }

      if (user) {
        await supabase.from("upload_batches").insert({
          uploaded_by: user.id,
          file_name: file.name,
          records_processed: rows.length,
          new_members: newCount,
          updated_members: updateCount,
          errors: errors.length,
        });
      }

      setSummary({ processed: rows.length, newMembers: newCount, updatedMembers: updateCount, errors });
      toast.success(`Imported ${records.length} members (${newCount} new, ${updateCount} updated)`);
      loadBatches();
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteBatch(id: string) {
    const { error } = await supabase.from("upload_batches").delete().eq("id", id);
    if (error) { toast.error("Could not remove batch log"); return; }
    setBatches((b) => b.filter((x) => x.id !== id));
    toast.success("Batch log removed");
  }

  async function handleClearAll() {
    setClearing(true);
    const { error: membersErr } = await supabase.from("members").delete().not("id", "is", null);
    if (membersErr) { toast.error(`Clear failed: ${membersErr.message}`); setClearing(false); return; }
    await supabase.from("upload_batches").delete().not("id", "is", null);
    setBatches([]);
    setSummary(null);
    setConfirmClear(false);
    setClearing(false);
    toast.success("All member data cleared — system reset to zero");
  }

  function downloadTemplate() {
    const template = [{
      member_id: "M001", name: "Jane Mwangi", phone: "+254712345678", email: "jane@example.com",
      join_date: "2024-06-15", store_location: "Westlands", preferred_channel: "in_store",
      last_purchase_date: "2026-04-01", total_purchases: 12, total_spend: 24500,
    }];
    const csv = Papa.unparse(template);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "mygoodlife_template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Import</p>
        <h1 className="font-display text-3xl font-bold mt-1">Data upload</h1>
        <p className="text-muted-foreground mt-1">Upload an Excel or CSV export. Members are auto-segmented and merged by member ID.</p>
      </div>

      <Card className="p-8 gradient-card border-2 border-dashed border-border">
        <div className="flex flex-col items-center text-center">
          <div className="h-14 w-14 rounded-full gradient-primary flex items-center justify-center mb-4 shadow-glow">
            <UploadIcon className="h-7 w-7 text-primary-foreground" />
          </div>
          <h3 className="font-display text-xl font-semibold">Drop a file or click to browse</h3>
          <p className="text-sm text-muted-foreground mt-1">Supports .xlsx, .xls, .csv · max 50,000 rows recommended per upload</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <div className="flex gap-3 mt-5">
            <Button onClick={() => fileRef.current?.click()} disabled={busy} className="gradient-primary">
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
              {busy ? "Processing…" : "Choose file"}
            </Button>
            <Button variant="outline" onClick={downloadTemplate}>Download template</Button>
          </div>
        </div>
      </Card>

      {summary && (
        <Card className="p-6 gradient-card animate-scale-in">
          <h3 className="font-display text-lg font-semibold mb-4">Upload summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Processed" value={summary.processed} accent="primary" />
            <Stat label="New members" value={summary.newMembers} accent="success" />
            <Stat label="Updated" value={summary.updatedMembers} accent="primary" />
            <Stat label="Errors" value={summary.errors.length} accent={summary.errors.length ? "destructive" : "success"} />
          </div>
          {summary.errors.length > 0 && (
            <div className="mt-5 border-t border-border pt-4">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" /> First {Math.min(10, summary.errors.length)} errors
              </h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {summary.errors.slice(0, 10).map((e, i) => (
                  <li key={i}><span className="font-mono text-xs">Row {e.row}:</span> {e.reason}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {batches.length > 0 && (
        <Card className="p-6">
          <h3 className="font-display font-semibold mb-4">Upload history</h3>
          <div className="space-y-2">
            {batches.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{b.file_name || "Unnamed file"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(b.created_at).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })} ·{" "}
                    {b.new_members} new · {b.updated_members} updated
                    {b.errors > 0 && <span className="text-destructive"> · {b.errors} errors</span>}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteBatch(b.id)} title="Remove log entry">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-6 border-destructive/40">
        <h3 className="font-display font-semibold text-destructive mb-1">Danger zone</h3>
        <p className="text-sm text-muted-foreground mb-4">Permanently delete all member records and reset the programme to zero. This cannot be undone.</p>
        <Button variant="destructive" onClick={() => setConfirmClear(true)}>Clear all member data</Button>
      </Card>

      <Card className="p-6">
        <h3 className="font-display font-semibold mb-3">Expected columns</h3>
        <p className="text-sm text-muted-foreground mb-4">Column names are matched flexibly (case-insensitive, spaces & underscores ignored).</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {[
            ["member_id", "Required · unique identifier"],
            ["name", "Required"],
            ["phone", "Required (validated)"],
            ["email", "Optional"],
            ["join_date", "YYYY-MM-DD or Excel date"],
            ["store_location", "Branch name"],
            ["preferred_channel", "in_store / online / whatsapp"],
            ["last_purchase_date", "Drives segmentation"],
            ["total_purchases", "Number"],
            ["total_spend", "KES amount"],
          ].map(([f, d]) => (
            <div key={f} className="flex items-start gap-2 py-1">
              <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
              <div><span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{f}</span> <span className="text-muted-foreground">{d}</span></div>
            </div>
          ))}
        </div>
      </Card>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all member data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete every member record and all upload history. The Dashboard will reset to zero. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll} disabled={clearing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {clearing ? "Clearing…" : "Yes, clear everything"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const Stat = ({ label, value, accent }: { label: string; value: number; accent: "primary" | "success" | "destructive" }) => {
  const colors = { primary: "text-primary", success: "text-success", destructive: "text-destructive" };
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-2xl font-display font-bold mt-1 ${colors[accent]}`}>{value.toLocaleString()}</p>
    </div>
  );
};

export default Upload;
