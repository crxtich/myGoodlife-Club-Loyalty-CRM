import { Card } from "@/components/ui/card";
import { Megaphone, Sparkles } from "lucide-react";

const Campaigns = () => (
  <div className="space-y-6">
    <div>
      <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Campaigns</p>
      <h1 className="font-display text-3xl font-bold mt-1">Campaign builder</h1>
      <p className="text-muted-foreground mt-1">Design segment-targeted campaigns and export contact lists.</p>
    </div>
    <Card className="p-12 gradient-card text-center border-dashed border-2">
      <div className="h-14 w-14 rounded-full gradient-primary mx-auto flex items-center justify-center shadow-glow">
        <Megaphone className="h-7 w-7 text-primary-foreground" />
      </div>
      <h2 className="font-display text-2xl font-bold mt-4">Coming next</h2>
      <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
        For now, you can build target lists directly from the <strong>Members</strong> page using filters and export. Full campaign builder with multi-segment targeting, channel selection, and A/B audiences arrives in the next iteration.
      </p>
      <div className="inline-flex items-center gap-2 mt-4 text-sm text-primary">
        <Sparkles className="h-4 w-4" /> Tip: filter by segment + export → instant call list
      </div>
    </Card>
  </div>
);

export default Campaigns;
