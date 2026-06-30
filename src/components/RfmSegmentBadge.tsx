import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RfmSegment, RFM_SEGMENT_LABELS, RFM_SEGMENT_COLORS, RFM_SEGMENT_MEANINGS, RFM_SEGMENT_ACTIONS } from "@/lib/rfmSegments";
import { cn } from "@/lib/utils";

// Parallel component to SegmentBadge (lifecycle) rather than widening its prop
// type — keeps Members.tsx/Dashboard.tsx lifecycle usage untouched while
// reusing the same visual conventions (outline badge + hover tooltip).
export const RfmSegmentBadge = ({ segment, className }: { segment: RfmSegment | null; className?: string }) => {
  if (!segment) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-help">
          <Badge variant="outline" className={cn("font-medium border", RFM_SEGMENT_COLORS[segment], className)}>
            {RFM_SEGMENT_LABELS[segment]}
          </Badge>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] p-3 space-y-1.5">
        <p className="font-semibold text-sm">{RFM_SEGMENT_LABELS[segment]}</p>
        <p className="text-xs text-muted-foreground">{RFM_SEGMENT_MEANINGS[segment]}</p>
        <div className="border-t border-border pt-1.5">
          <p className="text-xs font-medium">Recommended action</p>
          <p className="text-xs text-muted-foreground">{RFM_SEGMENT_ACTIONS[segment]}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
