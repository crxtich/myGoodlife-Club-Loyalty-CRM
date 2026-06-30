import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import {
  RFM_SEGMENTS, RFM_SEGMENT_LABELS, RFM_SEGMENT_COLORS, RFM_SEGMENT_SIGNALS,
  RFM_SEGMENT_MEANINGS, RFM_SEGMENT_ACTIONS, RFM_SEGMENT_TACTICS, RfmSegment,
} from "@/lib/rfmSegments";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const RfmSegments = () => {
  const [counts, setCounts] = useState<Record<RfmSegment, number> | null>(null);

  useEffect(() => {
    (async () => {
      const entries = await Promise.all(
        RFM_SEGMENTS.map(async (seg) => {
          const { count } = await supabase.from("members").select("id", { count: "exact", head: true }).eq("rfm_segment", seg);
          return [seg, count ?? 0] as const;
        })
      );
      setCounts(Object.fromEntries(entries) as Record<RfmSegment, number>);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Behavioural segments</p>
        <h1 className="font-display text-3xl font-bold mt-1">RFM Segments</h1>
        <p className="text-muted-foreground mt-1 max-w-3xl">
          RFM is a framework for segmenting members based on their value and engagement — Recency (how recently they purchased),
          Frequency (how often they purchase), and Monetary (how much they spend) — so the team can personalise communication
          and drive better results. This model powers Campaign targeting; it runs alongside, and does not replace, the
          lifecycle segmentation used on the Dashboard and Members page.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {RFM_SEGMENTS.map((seg) => (
          <Card key={seg} className={cn("p-5 border-l-4", RFM_SEGMENT_COLORS[seg].split(" ")[2])}>
            <div className="flex items-center justify-between mb-3">
              <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-semibold border", RFM_SEGMENT_COLORS[seg])}>
                {RFM_SEGMENT_LABELS[seg]}
              </span>
              <span className="text-2xl font-display font-bold tabular-nums">
                {counts ? counts[seg].toLocaleString() : "—"}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">RFM signal</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                  {RFM_SEGMENT_SIGNALS[seg].map((s) => <li key={s}>{s}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">What it means</p>
                <p>{RFM_SEGMENT_MEANINGS[seg]}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Actions</p>
                <p>{RFM_SEGMENT_ACTIONS[seg]}</p>
              </div>
              <div className="border-t border-border pt-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Example tactics
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                  {RFM_SEGMENT_TACTICS[seg].map((t) => <li key={t}>{t}</li>)}
                </ul>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RfmSegments;
