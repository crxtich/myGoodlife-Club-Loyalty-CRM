import { Database } from "@/integrations/supabase/types";

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
 * RFM scoring thresholds — Recency (days since last purchase), Frequency
 * (total_purchases), Monetary (total_spend). Each scored 1-5 via quintile-style
 * fixed thresholds against the existing members columns (no new source data
 * required). Segment assignment follows the reference framework:
 * Champions = high R + high F + high M; Loyals = high F + high M, lower R;
 * At Risk (RFM) = dropping R, previously high F; Lapsed = no purchase 90+ days;
 * New = enrolled within 30 days (overrides other signals for first-time members).
 */
function recencyScore(daysSincePurchase: number | null): number {
  if (daysSincePurchase === null) return 1;
  if (daysSincePurchase <= 14) return 5;
  if (daysSincePurchase <= 30) return 4;
  if (daysSincePurchase <= 60) return 3;
  if (daysSincePurchase <= 90) return 2;
  return 1;
}

function frequencyScore(totalPurchases: number): number {
  if (totalPurchases >= 20) return 5;
  if (totalPurchases >= 10) return 4;
  if (totalPurchases >= 5) return 3;
  if (totalPurchases >= 2) return 2;
  return 1;
}

function monetaryScore(totalSpend: number): number {
  if (totalSpend >= 100000) return 5;
  if (totalSpend >= 50000) return 4;
  if (totalSpend >= 20000) return 3;
  if (totalSpend >= 5000) return 2;
  return 1;
}

export function classifyRfm(
  lastPurchaseDate: string | null,
  joinDate: string | null,
  totalPurchases: number,
  totalSpend: number,
  today = new Date()
): { segment: RfmSegment; recency: number; frequency: number; monetary: number } {
  const daysSincePurchase = lastPurchaseDate
    ? Math.floor((today.getTime() - new Date(lastPurchaseDate).getTime()) / 86400000)
    : null;
  const joinDays = joinDate
    ? Math.floor((today.getTime() - new Date(joinDate).getTime()) / 86400000)
    : null;

  const recency = recencyScore(daysSincePurchase);
  const frequency = frequencyScore(totalPurchases);
  const monetary = monetaryScore(totalSpend);

  if (joinDays !== null && joinDays <= 30 && totalPurchases <= 1) {
    return { segment: "new_rfm", recency, frequency, monetary };
  }
  if (daysSincePurchase === null || daysSincePurchase >= 90) {
    return { segment: "lapsed", recency, frequency, monetary };
  }
  if (recency >= 4 && frequency >= 4 && monetary >= 4) {
    return { segment: "champions", recency, frequency, monetary };
  }
  if (frequency >= 3 && monetary >= 3) {
    return { segment: "loyals", recency, frequency, monetary };
  }
  if (recency <= 2 && frequency >= 3) {
    return { segment: "at_risk_rfm", recency, frequency, monetary };
  }
  return { segment: "at_risk_rfm", recency, frequency, monetary };
}
