import { Badge } from "@/components/ui/badge";
import { MemberSegment, SEGMENT_LABELS, SEGMENT_COLORS } from "@/lib/segments";
import { cn } from "@/lib/utils";

export const SegmentBadge = ({ segment, className }: { segment: MemberSegment | null; className?: string }) => {
  if (!segment) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <Badge variant="outline" className={cn("font-medium border", SEGMENT_COLORS[segment], className)}>
      {SEGMENT_LABELS[segment]}
    </Badge>
  );
};
