import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import logo from "@/assets/goodlife-logo.svg";
import { Loader2 } from "lucide-react";

const signInSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

const signUpSchema = signInSchema.extend({
  fullName: z.string().trim().min(2, "Name required").max(100),
});

const AuthPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const [signInData, setSignInData] = useState({ email: "", password: "" });
  const [signUpData, setSignUpData] = useState({ fullName: "", email: "", password: "" });

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signInSchema.safeParse(signInData);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Welcome back");
    navigate("/", { replace: true });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signUpSchema.safeParse(signUpData);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: parsed.data.fullName },
      },
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Account created — you're signed in");
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-1 gradient-hero relative overflow-hidden p-12 flex-col justify-between text-primary-foreground">
        <div className="bg-white rounded-xl p-4 inline-flex w-fit shadow-elegant">
          <img src={logo} alt="Goodlife Pharmacy" className="h-10 w-auto" />
        </div>
        <div className="relative z-10">
          <h1 className="font-display text-5xl font-bold leading-tight">
            My Goodlife Club<br />
            <span className="text-primary-glow">Loyalty CRM</span>
          </h1>
          <p className="mt-6 text-lg text-primary-foreground/80 max-w-md">
            Segment 600,000+ members. Build campaigns in minutes. Export ready-to-call lists — without ever opening Excel.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-6 max-w-md">
            <div>
              <p className="text-3xl font-display font-bold">600K+</p>
              <p className="text-sm text-primary-foreground/70">Registered members</p>
            </div>
            <div>
              <p className="text-3xl font-display font-bold">150+</p>
              <p className="text-sm text-primary-foreground/70">150+ stores across Kenya & Uganda</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-primary-foreground/50 relative z-10">CONFIDENTIAL — Internal use only</p>
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary-glow/20 blur-3xl" />
        <div className="absolute -left-32 -bottom-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md p-8 shadow-elegant border-border/60">
          <div className="lg:hidden mb-6 flex justify-center">
            <img src={logo} alt="Goodlife Pharmacy" className="h-10 w-auto" />
          </div>
          <h2 className="font-display text-2xl font-bold">Sign in to the CRM</h2>
          <p className="text-sm text-muted-foreground mt-1">Internal access only.</p>

          <Tabs defaultValue="signin" className="mt-6">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="si-email">Email</Label>
                  <Input id="si-email" type="email" required value={signInData.email}
                    onChange={(e) => setSignInData({ ...signInData, email: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="si-pwd">Password</Label>
                  <Input id="si-pwd" type="password" required value={signInData.password}
                    onChange={(e) => setSignInData({ ...signInData, password: e.target.value })} />
                </div>
                <Button type="submit" className="w-full gradient-primary" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Sign in
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="su-name">Full name</Label>
                  <Input id="su-name" required value={signUpData.fullName}
                    onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" type="email" required value={signUpData.email}
                    onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="su-pwd">Password</Label>
                  <Input id="su-pwd" type="password" required value={signUpData.password}
                    onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })} />
                </div>
                <Button type="submit" className="w-full gradient-primary" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
