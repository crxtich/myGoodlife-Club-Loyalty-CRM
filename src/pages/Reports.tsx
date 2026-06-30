import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "@/contexts/AuthContext";
import { SEGMENT_LABELS, MemberSegment, formatKES, classifyMember } from "@/lib/segments";
import { RFM_SEGMENTS, RFM_SEGMENT_LABELS } from "@/lib/rfmSegments";
import logo from "@/assets/goodlife-logo.svg";

type ReportType = "rfm_summary" | "lifecycle_summary" | "campaign_performance" | "member_list";
type Format = "pdf" | "excel";

const REPORT_TYPES: { value: ReportType; label: string; needsDateRange: boolean }[] = [
  { value: "rfm_summary", label: "RFM Segment Summary", needsDateRange: false },
  { value: "lifecycle_summary", label: "Lifecycle Segment Summary", needsDateRange: false },
  { value: "campaign_performance", label: "Campaign Performance", needsDateRange: true },
  { value: "member_list", label: "Member List (filtered)", needsDateRange: true },
];

async function loadLogoAsPng(): Promise<string | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const loaded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("logo load failed"));
    });
    img.src = logo;
    await loaded;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || 200;
    canvas.height = img.naturalHeight || 80;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

function pdfHeader(doc: jsPDF, title: string, logoDataUrl: string | null) {
  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, "PNG", 14, 10, 28, 14); } catch { /* ignore embed failure */ }
  }
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("My Goodlife Club — Loyalty CRM", logoDataUrl ? 48 : 14, 18);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(title, logoDataUrl ? 48 : 14, 25);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated on ${new Date().toLocaleDateString("en-KE", { dateStyle: "long" })}`, logoDataUrl ? 48 : 14, 31);
  doc.setTextColor(0);
}

const Reports = () => {
  const { user } = useAuth();
  const [reportType, setReportType] = useState<ReportType>("rfm_summary");
  const [format, setFormat] = useState<Format>("excel");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [generating, setGenerating] = useState(false);

  const selected = REPORT_TYPES.find((r) => r.value === reportType)!;

  async function buildRfmSummary() {
    const rows = await Promise.all(
      RFM_SEGMENTS.map(async (seg) => {
        const { count } = await supabase.from("members").select("id", { count: "exact", head: true }).eq("rfm_segment", seg);
        return { Segment: RFM_SEGMENT_LABELS[seg], "Member count": count ?? 0 };
      })
    );
    return rows;
  }

  async function buildLifecycleSummary() {
    const segments: MemberSegment[] = ["active", "new", "at_risk", "churned_60_90", "churned_90_180", "churned_180_plus"];
    const rows = await Promise.all(
      segments.map(async (seg) => {
        const { count } = await supabase.from("members").select("id", { count: "exact", head: true }).eq("segment", seg);
        return { Segment: SEGMENT_LABELS[seg], "Member count": count ?? 0 };
      })
    );
    return rows;
  }

  async function buildCampaignPerformance() {
    let query = supabase.from("campaigns").select("*").order("created_at", { ascending: false });
    if (dateFrom) query = query.gte("created_at", dateFrom);
    if (dateTo) query = query.lte("created_at", dateTo);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((c) => ({
      Name: c.name,
      Objective: c.objective || "",
      Channel: c.channel || "",
      "Target segments": c.target_rfm_segments?.map((s) => RFM_SEGMENT_LABELS[s]).join(", ") || "",
      Exports: c.export_count,
      Created: new Date(c.created_at).toLocaleDateString("en-KE"),
    }));
  }

  async function buildMemberList() {
    let query = supabase.from("members").select("*").order("priority_score", { ascending: false }).limit(2000);
    if (dateFrom) query = query.gte("last_purchase_date", dateFrom);
    if (dateTo) query = query.lte("last_purchase_date", dateTo);
    const { data, error } = await query;
    if (error) throw error;
    const today = new Date();
    return (data || []).map((m) => ({
      "Member ID": m.member_id,
      Name: m.name,
      Phone: m.phone || "",
      Email: m.email || "",
      Country: m.country || "",
      "Lifecycle segment": SEGMENT_LABELS[classifyMember(m.last_purchase_date, m.join_date, m.total_purchases ?? 0, today).segment],
      "RFM segment": m.rfm_segment ? RFM_SEGMENT_LABELS[m.rfm_segment] : "",
      "Total purchases": m.total_purchases,
      "Total spend (KES)": m.total_spend,
      "Last purchase": m.last_purchase_date || "",
    }));
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      let rows: Record<string, string | number>[] = [];
      if (reportType === "rfm_summary") rows = await buildRfmSummary();
      else if (reportType === "lifecycle_summary") rows = await buildLifecycleSummary();
      else if (reportType === "campaign_performance") rows = await buildCampaignPerformance();
      else rows = await buildMemberList();

      if (rows.length === 0) { toast.error("No data found for this report"); setGenerating(false); return; }

      const dateStamp = new Date().toISOString().slice(0, 10);
      const filename = `mygoodlife_${reportType}_${dateStamp}.${format === "pdf" ? "pdf" : "xlsx"}`;

      if (format === "excel") {
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Report");
        XLSX.writeFile(wb, filename);
      } else {
        const doc = new jsPDF();
        const logoDataUrl = await loadLogoAsPng();
        pdfHeader(doc, selected.label, logoDataUrl);
        autoTable(doc, {
          startY: 36,
          head: [Object.keys(rows[0])],
          body: rows.map((r) => Object.values(r).map((v) => String(v ?? ""))),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [109, 40, 160] },
        });
        doc.save(filename);
      }

      if (user) {
        await supabase.from("report_exports").insert({
          report_type: reportType,
          format,
          generated_by: user.id,
          row_count: rows.length,
          file_reference: filename,
        }).catch(() => null);
      }

      toast.success(`Generated ${selected.label} (${rows.length} rows)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Report generation failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Curated exports</p>
        <h1 className="font-display text-3xl font-bold mt-1">Reports</h1>
        <p className="text-muted-foreground mt-1">Generate a PDF or Excel report for stakeholders.</p>
      </div>

      <Card className="p-6 gradient-card space-y-5">
        <div>
          <Label className="mb-1.5 block">Report type</Label>
          <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {REPORT_TYPES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {selected.needsDateRange && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rep-from" className="mb-1.5 block">From</Label>
              <Input id="rep-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="rep-to" className="mb-1.5 block">To</Label>
              <Input id="rep-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        )}

        <div>
          <Label className="mb-1.5 block">Output format</Label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setFormat("excel")}
              className={`flex-1 flex items-center gap-2 justify-center rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                format === "excel" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </button>
            <button
              type="button"
              onClick={() => setFormat("pdf")}
              className={`flex-1 flex items-center gap-2 justify-center rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                format === "pdf" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
              }`}
            >
              <FileText className="h-4 w-4" /> PDF
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleGenerate} disabled={generating} className="gradient-primary">
            {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Generate report
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Reports;
