import { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

export type RfmSegment = Database["public"]["Enums"]["rfm_segment"];

// "at_risk_rfm" / "new_rfm" use distinct internal values from the lifecycle
// member_segment enum's "at_risk" / "new" to avoid confusion between the two
// independent segmentation models. See README "RFM vs Lifecycle Segmentation".
export const RFM_SEGMENT_LABELS: Record<RfmSegment, string> = {
  champions: "Champions",
  loyals: "Loyals",
  at_risk_rfm: "At Risk (RFM)",
  lapsed: "Lapsed",
  new_rfm: "New",
};

export const RFM_SEGMENT_COLORS: Record<RfmSegment, string> = {
  champions: "bg-success/15 text-success border-success/30",
  loyals: "bg-primary/15 text-primary border-primary/30",
  at_risk_rfm: "bg-warning/15 text-warning border-warning/30",
  lapsed: "bg-destructive/15 text-destructive border-destructive/30",
  new_rfm: "bg-accent/15 text-accent-foreground border-accent/30",
};

export const RFM_SEGMENT_SIGNALS: Record<RfmSegment, string[]> = {
  champions: ["High Recency", "High Frequency", "High Spend"],
  loyals: ["High Frequency", "High Spend", "Slightly lower Recency"],
  at_risk_rfm: ["Dropping Recency", "Previously high Frequency"],
  lapsed: ["No purchase in 90+ days"],
  new_rfm: ["Enrolled within 30 days"],
};

export const RFM_SEGMENT_MEANINGS: Record<RfmSegment, string> = {
  champions: "Our best customers, highly engaged and driving value.",
  loyals: "Strong customers with loyalty potential.",
  at_risk_rfm: "Losing engagement and is at risk of churning.",
  lapsed: "Inactive and low engagement.",
  new_rfm: "Newly enrolled and getting familiar with the business and its benefits.",
};

export const RFM_SEGMENT_ACTIONS: Record<RfmSegment, string> = {
  champions: "Recognize. Reward loyalty. Upsell & Cross-sell. Keep them engaged.",
  loyals: "Encourage repeat purchases.",
  at_risk_rfm: "Nurture relationship. Incentivize next purchase.",
  lapsed: "Re-engage and remind them of value. Win them back.",
  new_rfm: "Onboard. Educate on business benefits.",
};

export const RFM_SEGMENT_TACTICS: Record<RfmSegment, string[]> = {
  champions: ["Exclusive Offers", "Thank you SMS", "Loyalty Rewards: VIP events"],
  loyals: ["Personalized Offers", "Product Recommendations", "Unused benefit reminder"],
  at_risk_rfm: ["Re-engagement SMS", "Special Offers", "Surveys/Feedback"],
  lapsed: ["Winback Campaigns", "Last chance offers"],
  new_rfm: ["Personalized welcome", "Follow-up incentive", "Educative SMS"],
};

export const RFM_SEGMENTS: RfmSegment[] = ["champions", "loyals", "at_risk_rfm", "lapsed", "new_rfm"];

/**
 * RFM scoring — LOCKED SPECIFICATION. Do not change without explicit sign-off.
 *
 * The actual scoring runs server-side, in the `recompute_rfm_segments()`
 * Supabase function (see supabase/migrations/20260630000500_rfm_percentile_
 * scoring.sql) — it needs to aggregate the real membership_sales_transactions
 * table (line-item grain, keyed by phone_no) across the whole member base for
 * percentile ranking, which isn't something that can be done correctly
 * client-side without pulling every transaction row into the browser (see the
 * README's Known Limitations on client-side aggregation at scale).
 *
 * This file documents the same methodology for reference/testability and
 * exposes `recomputeRfmSegments()` to trigger the server-side recompute:
 *
 *   Step 1 — overrides, checked in this order, before any scoring:
 *     1. New: member's join_date within the last 30 days -> new_rfm. Stop.
 *     2. Lapsed: not New, and most recent transaction (MAX(business_date) for
 *        that phone_no) is 90+ days ago, or no transaction ever -> lapsed. Stop.
 *   Step 2 — for every remaining member, aggregate from the real transactions
 *     table over a trailing 6-month window, grouped by phone_no:
 *       Frequency = COUNT(DISTINCT transaction_id) in the last 6 months
 *       Monetary  = SUM(pre_tax) across all line items in the last 6 months
 *         (pre_tax is already a line total — never multiply by quantity)
 *       Recency   = days since the most recent transaction (not window-limited)
 *   Step 3 — score each of Recency/Frequency/Monetary 1-5 via percentile rank
 *     against the current eligible member base. Recency inverted (most
 *     recent = 5). Frequency/Monetary not inverted (more = higher).
 *   Step 4 — classify using the exact locked ranges below (all three match):
 *
 *       Segment          Recency   Frequency   Monetary
 *       Champions        4-5       4-5         4-5
 *       Loyals           2-4       4-5         4-5
 *       At Risk (RFM)    1-2       3-5         3-5
 *
 *   Step 5 — RESIDUAL: any member who clears the New/Lapsed overrides but
 *     doesn't match Champions/Loyals/At Risk (RFM) above defaults to LOYALS
 *     as a placeholder. This is NOT part of the original framework — it is
 *     provisional and needs explicit sign-off before being treated as final
 *     logic. See README "MVP Notes".
 *
 * Naming: internal value `at_risk_rfm` / display "At Risk (RFM)", internal
 * value `new_rfm` for New — both intentionally distinct from the lifecycle
 * model's `at_risk` / `new` values (src/lib/segments.ts) to avoid any shared
 * code path or display confusion between the two independent models.
 */

/**
 * Pure mirror of the SQL function's Step 4 classification, given already-
 * computed 1-5 scores. Exposed for unit testing / preview — the live segment
 * value always comes from the database (recompute_rfm_segments), this is not
 * called anywhere in the upload/display path.
 */
export function classifyRfmFromScores(recency: number, frequency: number, monetary: number): RfmSegment {
  if (recency >= 4 && recency <= 5 && frequency >= 4 && frequency <= 5 && monetary >= 4 && monetary <= 5) {
    return "champions";
  }
  if (recency >= 2 && recency <= 4 && frequency >= 4 && frequency <= 5 && monetary >= 4 && monetary <= 5) {
    return "loyals";
  }
  if (recency >= 1 && recency <= 2 && frequency >= 3 && frequency <= 5 && monetary >= 3 && monetary <= 5) {
    return "at_risk_rfm";
  }
  // Step 5 residual default — provisional, needs sign-off.
  return "loyals";
}

/**
 * Triggers the server-side percentile recompute (recompute_rfm_segments) so
 * members.rfm_segment / recency_score / frequency_score / monetary_score
 * reflect the latest transaction data. Call after an Upload batch completes,
 * or whenever transaction data changes.
 */
export async function recomputeRfmSegments(): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("recompute_rfm_segments");
  return { error: error?.message ?? null };
}
