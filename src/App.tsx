import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/AppShell";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import RfmSegments from "./pages/RfmSegments";
import Members from "./pages/Members";
import Upload from "./pages/Upload";
import Campaigns from "./pages/Campaigns";
import Exports from "./pages/Exports";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

// analyst: Dashboard + Members + Exports only
// manager: above + Upload + Campaigns
// admin: full access
const Shell = ({
  children,
  requiredRoles,
}: {
  children: React.ReactNode;
  requiredRoles?: ("admin" | "manager" | "analyst")[];
}) => (
  <ProtectedRoute requiredRoles={requiredRoles}>
    <AppShell>{children}</AppShell>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider delayDuration={300}>
      <Toaster />
      <Sonner />
      <BrowserRouter basename="/myGoodlife-Club-Loyalty-CRM">
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Shell><Dashboard /></Shell>} />
            <Route path="/rfm-segments" element={<Shell><RfmSegments /></Shell>} />
            <Route path="/members" element={<Shell><Members /></Shell>} />
            <Route path="/upload" element={<Shell requiredRoles={["admin", "manager"]}><Upload /></Shell>} />
            <Route path="/campaigns" element={<Shell requiredRoles={["admin", "manager"]}><Campaigns /></Shell>} />
            <Route path="/exports" element={<Shell><Exports /></Shell>} />
            <Route path="/reports" element={<Shell><Reports /></Shell>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
