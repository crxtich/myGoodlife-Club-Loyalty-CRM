import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MemberSegment, SEGMENT_LABELS, SEGMENT_COLORS, SEGMENT_DESCRIPTIONS, SEGMENT_ACTIONS } from "@/lib/segments";
import { cn } from "@/lib/utils";

export const SegmentBadge = ({ segment, className }: { segment: MemberSegment | null; className?: string }) => {
  if (!segment) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={cn("font-medium border cursor-help", SEGMENT_COLORS[segment], className)}>
          {SEGMENT_LABELS[segment]}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] p-3 space-y-1.5">
        <p className="font-semibold text-sm">{SEGMENT_LABELS[segment]}</p>
        <p className="text-xs text-muted-foreground">{SEGMENT_DESCRIPTIONS[segment]}</p>
        <div className="border-t border-border pt-1.5">
          <p className="text-xs font-medium">Recommended action</p>
          <p className="text-xs text-muted-foreground">{SEGMENT_ACTIONS[segment]}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
