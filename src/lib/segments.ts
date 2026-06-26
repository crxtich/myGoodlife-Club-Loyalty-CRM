import { Database } from "@/integrations/supabase/types";

export type MemberSegment = Database["public"]["Enums"]["member_segment"];
export type ChannelType = Database["public"]["Enums"]["channel_type"];

export const SEGMENT_LABELS: Record<MemberSegment, string> = {
  active: "Active",
  new: "Never Activated",
  at_risk: "At Risk",
  churned_60_90: "Churned (Early)",
  churned_90_180: "Churned (Deep)",
  churned_180_plus: "Lapsed 1 Year+",
};

export const SEGMENT_COLORS: Record<MemberSegment, string> = {
  active: "bg-seg-active/15 text-seg-active border-seg-active/30",
  new: "bg-seg-new/15 text-seg-new border-seg-new/30",
  at_risk: "bg-seg-atrisk/15 text-seg-atrisk border-seg-atrisk/30",
  churned_60_90: "bg-seg-churn1/15 text-seg-churn1 border-seg-churn1/30",
  churned_90_180: "bg-seg-churn2/15 text-seg-churn2 border-seg-churn2/30",
  churned_180_plus: "bg-seg-churn3/15 text-seg-churn3 border-seg-churn3/30",
};

export const SEGMENT_DESCRIPTIONS: Record<MemberSegment, string> = {
  active: "Purchased within 30 days",
  new: "Signed up, no purchase recorded",
  at_risk: "31–59 days since last purchase",
  churned_60_90: "60–89 days since last purchase",
  churned_90_180: "90–364 days since last purchase",
  churned_180_plus: "365+ days since last purchase",
};

export const SEGMENT_ACTIONS: Record<MemberSegment, string> = {
  active: "Engagement campaign — reward and upsell",
  new: "Activation campaign — first purchase incentive",
  at_risk: "Retention campaign — personalised reminder",
  churned_60_90: "Reactivation — moderate incentive offer",
  churned_90_180: "Reactivation — high priority, strong offer",
  churned_180_plus: "Win-back or remove from active list",
};

export const COUNTRY_LABELS: Record<"Kenya" | "Uganda", string> = {
  Kenya: "Kenya",
  Uganda: "Uganda",
};

export const CHANNEL_LABELS: Record<ChannelType, string> = {
  in_store: "In-store",
  online: "Online",
  whatsapp: "WhatsApp",
};

export interface MemberRow {
  member_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  join_date: string | null;
  store_location: string | null;
  preferred_channel: ChannelType | null;
  total_purchases: number;
  total_spend: number;
  last_purchase_date: string | null;
}

export function classifyMember(
  lastPurchase: string | null,
  joinDate: string | null,
  totalPurchases: number,
  today = new Date()
): { segment: MemberSegment; priority: number } {
  if (!lastPurchase) {
    if (joinDate) {
      const joinDays = Math.floor((today.getTime() - new Date(joinDate).getTime()) / 86400000);
      if (joinDays <= 30) return { segment: "new", priority: 30 };
    }
    return { segment: "churned_180_plus", priority: 100 };
  }
  const days = Math.floor((today.getTime() - new Date(lastPurchase).getTime()) / 86400000);
  if (days <= 30) {
    if (joinDate) {
      const joinDays = Math.floor((today.getTime() - new Date(joinDate).getTime()) / 86400000);
      if (joinDays <= 30 && totalPurchases <= 1) return { segment: "new", priority: 25 };
    }
    return { segment: "active", priority: 10 };
  }
  if (days <= 60) return { segment: "at_risk", priority: 50 };
  if (days <= 90) return { segment: "churned_60_90", priority: 70 };
  if (days <= 180) return { segment: "churned_90_180", priority: 85 };
  return { segment: "churned_180_plus", priority: 100 };
}

export function formatKES(amount: number): string {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(amount);
}
