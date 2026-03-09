import { useContext, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Separator } from "../components/ui/separator";
import { Input } from "../components/ui/input";
import { AuthContext, ThemeContext } from "../App";
import FounderBadge from "../components/FounderBadge";
import { toast } from "sonner";
import { isFounder, getFounderMeta, canUpgrade, nextTier, TIER_META, formatPurchaseDate } from "../lib/founder";
import { themes } from "../lib/themes";
import { fonts } from "../lib/fonts";
import PageHeader from "../components/PageHeader";
import { 
  Bell, 
  Shield, 
  Palette,
  LogOut,
  Crown,
  BadgeCheck,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Receipt,
  ArrowUpCircle,
  Lock,
  Check,
  Type,
} from "lucide-react";

const PREVIEW_PLACEHOLDER = "The quick brown fox jumps over the lazy dog";

export default function Settings() {
  const { user, logout } = useContext(AuthContext);
  const { activeTheme, setTheme, activeFont, setFont } = useContext(ThemeContext);
  const [themeSearch, setThemeSearch] = useState("");
  const [fontPreview, setFontPreview] = useState(PREVIEW_PLACEHOLDER);

  const filteredThemes = useMemo(() => {
    const q = themeSearch.trim().toLowerCase();
    if (!q) return themes;
    return themes.filter((t) => t.name.toLowerCase().includes(q));
  }, [themeSearch]);

  const founder       = isFounder(user);
  const founderMeta   = getFounderMeta(user);
  const purchaseDate  = formatPurchaseDate(user?.founder_paid_at);
  const upgradeTier   = canUpgrade(user) ? nextTier(user) : null;

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
  };

  return (
    <div data-testid="settings-page">
      <PageHeader title="Settings" subtitle="Manage your preferences" />

        <div className="max-w-2xl space-y-6">

          {/* ── Membership (Founder Pass) ───────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className={`border-2 ${founder && founderMeta ? founderMeta.border : "border-border"} relative overflow-hidden`}>
              {founder && founderMeta && (
                <div className={`absolute inset-0 bg-gradient-to-br ${founderMeta.gradient} opacity-5 pointer-events-none`} />
              )}

              <CardHeader className="relative z-10">
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <Crown className={`w-5 h-5 ${founder && founderMeta ? founderMeta.text : "text-muted-foreground"}`} />
                  Membership
                </CardTitle>
                <CardDescription>
                  {founder ? "Your founder pass details and upgrade options" : "Support the project and lock in lifetime access"}
                </CardDescription>
              </CardHeader>

              <CardContent className="relative z-10 space-y-5">
                {founder && founderMeta ? (
                  <>
                    {/* Active pass row */}
                    <div className={`flex items-center gap-4 p-4 rounded-xl ${founderMeta.bg} border ${founderMeta.border}`}>
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${founderMeta.gradient} flex items-center justify-center text-white shadow-lg flex-shrink-0`}>
                        <span className="text-2xl leading-none">{founderMeta.emoji}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className={`font-semibold ${founderMeta.text}`}>{founderMeta.label}</p>
                          <FounderBadge user={user} size="xs" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {purchaseDate ? `Purchased on ${purchaseDate}` : "Lifetime access"} · Never expires
                        </p>
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-green-500 bg-green-500/10 border border-green-500/30 px-2 py-1 rounded-full">
                        Active
                      </span>
                    </div>

                    {/* Benefits list */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                        Your benefits
                      </p>
                      <ul className="space-y-2">
                        {founderMeta.perks.map((perk, i) => (
                          <li key={i} className="flex items-center gap-2.5 text-sm">
                            <BadgeCheck className={`w-4 h-4 flex-shrink-0 ${founderMeta.text}`} />
                            {perk}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Separator />

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      {upgradeTier && (
                        <Link to="/pricing" className="flex-1">
                          <Button
                            variant="outline"
                            className={`w-full gap-2 ${founderMeta.border} ${founderMeta.text}`}
                          >
                            <ArrowUpCircle className="w-4 h-4" />
                            Upgrade to {TIER_META[upgradeTier].label}
                          </Button>
                        </Link>
                      )}
                      {!upgradeTier && (
                        <div className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium ${founderMeta.text} py-2`}>
                          <Lock className="w-4 h-4" />
                          Top tier — you have everything 🎉
                        </div>
                      )}
                      <a
                        href="mailto:support@visionaryacademy.com?subject=Founder+Pass+Invoice"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1"
                      >
                        <Button variant="ghost" className="w-full gap-2 text-muted-foreground">
                          <Receipt className="w-4 h-4" />
                          Request Invoice
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </a>
                    </div>
                  </>
                ) : (
                  /* Non-founder CTA */
                  <div className="flex flex-col items-center gap-4 py-4 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <Sparkles className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold mb-1">No Founder Pass yet</p>
                      <p className="text-sm text-muted-foreground">
                        Lock in lifetime access at a one-time price — only available for a limited time.
                      </p>
                    </div>
                    <Link to="/pricing">
                      <Button className="bg-gradient-to-r from-violet-600 to-purple-600 text-white gap-2 hover:from-violet-500 hover:to-purple-500">
                        View Founder Passes
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Theme ───────────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <Palette className="w-5 h-5" /> Theme
                </CardTitle>
                <CardDescription>Choose a color scheme for TaskFlow</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Search themes..."
                  value={themeSearch}
                  onChange={(e) => setThemeSearch(e.target.value)}
                  className="max-w-xs"
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {filteredThemes.map((t) => {
                    const isActive = activeTheme === t.id;
                    const h = t.hex;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTheme(t.id)}
                        className={`relative rounded-xl border-2 overflow-hidden transition-all hover:scale-[1.02] hover:shadow-md ${
                          isActive ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div
                          className="h-16 w-full flex flex-col"
                          style={{
                            background: h.background,
                            color: h.text1,
                          }}
                        >
                          <div className="flex-1 flex gap-0.5 p-1.5">
                            <div style={{ background: h.surface }} className="flex-1 rounded" />
                            <div style={{ background: h.surface2 }} className="flex-1 rounded" />
                          </div>
                          <div className="px-2 py-0.5 text-[10px] font-medium truncate" style={{ color: h.text2 }}>
                            {t.name}
                          </div>
                        </div>
                        {isActive && (
                          <span className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Font ─────────────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <Type className="w-5 h-5" /> Font
                </CardTitle>
                <CardDescription>Choose your preferred typeface</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Preview text"
                  value={fontPreview}
                  onChange={(e) => setFontPreview(e.target.value)}
                  className="max-w-md"
                />
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1">
                  {fonts.map((f) => {
                    const isActive = activeFont === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFont(f.id)}
                        className={`shrink-0 rounded-xl border-2 px-4 py-3 min-w-[140px] text-left transition-all hover:scale-[1.02] hover:shadow-md ${
                          isActive ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"
                        }`}
                        style={{ fontFamily: `"${f.family}", sans-serif` }}
                      >
                        <span className="text-sm block truncate">{fontPreview || PREVIEW_PLACEHOLDER}</span>
                        <span className="text-xs text-muted-foreground mt-1 block">{f.name}</span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Notifications ───────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5" /> Notifications
                </CardTitle>
                <CardDescription>Manage your notification preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive updates about your tasks
                    </p>
                  </div>
                  <Switch defaultChecked data-testid="email-notifications-switch" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Streak Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Get reminded to maintain your streaks
                    </p>
                  </div>
                  <Switch defaultChecked data-testid="streak-reminders-switch" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Community Messages</Label>
                    <p className="text-sm text-muted-foreground">
                      Notifications for new messages
                    </p>
                  </div>
                  <Switch defaultChecked data-testid="community-messages-switch" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Account ─────────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5" /> Account
                </CardTitle>
                <CardDescription>Manage your account settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-lg bg-secondary/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{user?.name}</p>
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                      </div>
                    </div>
                    {founder && <FounderBadge user={user} size="sm" showLabel />}
                  </div>
                </div>
                
                <div className="pt-4 border-t border-border">
                  <Button 
                    variant="destructive" 
                    onClick={handleLogout}
                    className="w-full"
                    data-testid="logout-btn"
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Log Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

        </div>
    </div>
  );
}
