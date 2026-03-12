import { useContext, useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "./ui/hover-card";
import { AuthContext, ThemeContext } from "../App";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./ui/sheet";
import { FounderDot } from "./FounderBadge";
import { isFounder, getFounderMeta } from "../lib/founder";
import {
  LayoutDashboard,
  GraduationCap,
  Target,
  User,
  Settings,
  LogOut,
  Sparkles,
  Moon,
  Sun,
  Menu,
  X,
  Coins,
  Crown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Network,
  ClipboardList,
  BarChart2,
  BookOpen,
  Search,
  Star,
  Briefcase,
  FileText,
  Gamepad2,
  HardDrive,
  Archive,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Brain,
} from "lucide-react";
import { Notebook, Books, Users, Storefront, PencilLine } from "phosphor-react";
import PhosphorIcon from "./icons/PhosphorIcon";

const SIDEBAR_COLLAPSED_KEY = "sidebarCollapsed";
const LEARN_ROUTES = ["/study", "/library", "/notes-studio", "/graph", "/practice", "/strengths"];
const CLASSES_ROUTES = ["/teacher/classes", "/teacher/assignments", "/teacher/gradebook", "/teacher/students", "/teacher/students/intelligence"];

function isLearnRoute(pathname) {
  return LEARN_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

function isClassesRoute(pathname) {
  return CLASSES_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

const STORAGE_DATA = {
  used: 1.4,
  total: 2,
  plan: "Free",
  addedThisMonth: 0.2,
  breakdown: [
    { label: "Notes",       gb: 0.6, Icon: FileText, color: "#007aff" },
    { label: "Whiteboards", gb: 0.4, Icon: Layers,   color: "#af52de" },
    { label: "Files",       gb: 0.4, Icon: Archive,  color: "#ff9500" },
  ],
};

function storageBarColor(pct) {
  if (pct >= 80) return "bg-red-500";
  if (pct >= 60) return "bg-amber-500";
  return "bg-green-500";
}

/** Compact profile card at bottom of sidebar; click opens popover (Profile, Shop, Settings, theme, Log out). */
function ProfileCardWithPopover({
  user,
  founder,
  founderMeta,
  level,
  levelProgress,
  xpInLevel,
  xpForNextLevel,
  collapsed,
  theme,
  toggleTheme,
  onNavigate,
  onLogout,
  onCloseMobile,
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onEscape = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (
        triggerRef.current?.contains(e.target) ||
        popoverRef.current?.contains(e.target)
      )
        return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const handleAction = (fn) => {
    fn?.();
    setOpen(false);
    onCloseMobile?.();
  };

  return (
    <div
      className={`shrink-0 border-t border-border p-3 transition-opacity duration-200 ${
        collapsed ? "flex justify-center py-3" : ""
      }`}
    >
      <div className="relative" ref={triggerRef}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`w-full flex items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-secondary/80 ${
            collapsed ? "justify-center p-2" : ""
          }`}
          aria-expanded={open}
          aria-haspopup="true"
        >
          <div className="relative shrink-0">
            {founder && founderMeta && (
              <div
                className={`absolute -inset-[2px] rounded-full bg-gradient-to-br ${founderMeta.gradient} opacity-75`}
                aria-hidden
              />
            )}
            <Avatar className={`relative ${collapsed ? "h-9 w-9" : "h-9 w-9"}`}>
              <AvatarImage src={user?.avatar} alt={user?.name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {user?.name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {founder ? (
              <FounderDot user={user} className="absolute -bottom-0.5 -right-0.5" />
            ) : user?.is_premium ? (
              <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-orange-500">
                <Crown className="h-2.5 w-2.5 text-white" />
              </div>
            ) : null}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="truncate text-sm font-medium">{user?.name}</p>
                {user?.role === 'student' && (
                  <span className="shrink-0 rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-blue-500 leading-none">Student</span>
                )}
                {user?.role === 'teacher' && (
                  <span className="shrink-0 rounded-full bg-green-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-green-500 leading-none">Teacher</span>
                )}
                {user?.role === 'investor' && (
                  <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-amber-500 leading-none">Investor</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Lvl {level}</span>
                <span className="flex items-center gap-0.5">
                  <Coins className="h-3 w-3" /> {user?.coins ?? 0}
                </span>
              </div>
              <Progress value={levelProgress} className="mt-1 h-1" />
            </div>
          )}
        </button>

        {open && (
          <div
            ref={popoverRef}
            className={`absolute z-50 ${collapsed ? "left-full top-1/2 -translate-y-1/2 ml-2" : "bottom-full left-0 mb-1"}`}
            style={{
              animation: "profilePopoverIn 0.18s ease-out forwards",
              transformOrigin: collapsed ? "left center" : "left bottom",
            }}
          >
            <style>{`
              @keyframes profilePopoverIn {
                from { opacity: 0; transform: translateY(8px) scale(0.97); }
                to { opacity: 1; transform: translateY(0) scale(1); }
              }
            `}</style>
            <div className="w-56 rounded-xl border border-border bg-popover p-1 shadow-lg">
            <div className="px-2 py-2 border-b border-border mb-1">
              <p className="font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={() => handleAction(() => onNavigate("/profile"))}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-secondary"
              data-testid="profile-menu-item"
            >
              <User className="h-4 w-4 shrink-0" />
              Profile
            </button>
            <button
              type="button"
              onClick={() => handleAction(() => onNavigate("/community?tab=shop"))}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-secondary"
              data-testid="store-menu-item"
            >
              <PhosphorIcon icon={Storefront} className="h-4 w-4 shrink-0" />
              Shop
            </button>
            <button
              type="button"
              onClick={() => handleAction(() => onNavigate("/settings"))}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-secondary"
              data-testid="settings-menu-item"
            >
              <Settings className="h-4 w-4 shrink-0" />
              Settings
            </button>
            <button
              type="button"
              onClick={() => handleAction(toggleTheme)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-secondary"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 shrink-0" />
              ) : (
                <Moon className="h-4 w-4 shrink-0" />
              )}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              onClick={() => handleAction(onLogout)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-destructive hover:bg-destructive/10"
              data-testid="logout-menu-item"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Log out
            </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Sidebar() {
  const { user, logout, isStudent, isTeacher, isInvestor } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) ?? "false");
    } catch {
      return false;
    }
  });
  const [learnOpen, setLearnOpen] = useState(false);
  const [classesOpen, setClassesOpen] = useState(false);
  const [storageOpen, setStorageOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(collapsed));
  }, [collapsed]);

  useEffect(() => {
    if (isLearnRoute(location.pathname)) setLearnOpen(true);
    if (isClassesRoute(location.pathname)) setClassesOpen(true);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const founder = isFounder(user);
  const founderMeta = getFounderMeta(user);

  const xp = user?.xp || 0;
  const level = user?.level || 1;
  const xpForCurrentLevel = Array.from({ length: level - 1 }, (_, i) => 100 + i * 50).reduce(
    (a, b) => a + b,
    0
  );
  const xpForNextLevel = 100 + (level - 1) * 50;
  const xpInLevel = xp - xpForCurrentLevel;
  const levelProgress = Math.min(100, (xpInLevel / xpForNextLevel) * 100);

  const studentItems = [
    { icon: <LayoutDashboard className="w-5 h-5 shrink-0" />, label: "Home", href: "/dashboard" },
    {
      key: "learn",
      icon: <PhosphorIcon icon={Notebook} className="w-5 h-5 shrink-0" />,
      label: "Learn",
      sub: [
        { icon: <PhosphorIcon icon={Notebook} />, label: "Study Hub", href: "/study" },
        { icon: <PhosphorIcon icon={Books} />, label: "Library", href: "/library" },
        { icon: <PhosphorIcon icon={PencilLine} />, label: "Notes", href: "/notes-studio" },
        { icon: <Network className="w-4 h-4" />, label: "Graph", href: "/graph" },
        { icon: <GraduationCap className="w-4 h-4" />, label: "SAT / ACT", href: "/practice" },
        { icon: <Target className="w-4 h-4" />, label: "Strengths", href: "/strengths" },
      ],
    },
    { icon: <Trophy className="w-5 h-5 shrink-0" />, label: "Compete", href: "/competitions" },
    { icon: <PhosphorIcon icon={Users} className="w-5 h-5 shrink-0" />, label: "Community", href: "/community" },
  ];

  const teacherItems = [
    { icon: <LayoutDashboard className="w-5 h-5 shrink-0" />, label: "Dashboard", href: "/teacher" },
    {
      key: "classes",
      icon: <PhosphorIcon icon={Users} className="w-5 h-5 shrink-0" />,
      label: "My Classes",
      sub: [
        { icon: <PhosphorIcon icon={Users} className="w-4 h-4" />, label: "Classes", href: "/teacher/classes" },
        { icon: <ClipboardList className="w-4 h-4" />, label: "Assignments", href: "/teacher/assignments" },
        { icon: <BarChart2 className="w-4 h-4" />, label: "Gradebook", href: "/teacher/gradebook" },
        { icon: <GraduationCap className="w-4 h-4" />, label: "Students", href: "/teacher/students" },
        { icon: <Brain className="w-4 h-4" />, label: "Intelligence", href: "/teacher/students/intelligence" },
      ],
    },
    { icon: <Gamepad2 className="w-5 h-5 shrink-0" />, label: "Quiz Creator", href: "/teacher/ai-generator" },
    { icon: <BookOpen className="w-5 h-5 shrink-0" />, label: "Resources", href: "/teacher/resources" },
  ];

  const investorItems = [
    { icon: <LayoutDashboard className="w-5 h-5 shrink-0" />, label: "Dashboard", href: "/investor" },
    { icon: <Search className="w-5 h-5 shrink-0" />, label: "Discover", href: "/investor/discover" },
    { icon: <Star className="w-5 h-5 shrink-0" />, label: "Watchlist", href: "/investor/watchlist" },
    { icon: <Briefcase className="w-5 h-5 shrink-0" />, label: "Opportunities", href: "/investor/opportunities" },
    { icon: <FileText className="w-5 h-5 shrink-0" />, label: "Applications", href: "/investor/applications" },
    { icon: <BarChart2 className="w-5 h-5 shrink-0" />, label: "Analytics", href: "/investor/analytics" },
    { icon: <User className="w-5 h-5 shrink-0" />, label: "Profile", href: "/profile" },
    { icon: <Settings className="w-5 h-5 shrink-0" />, label: "Settings", href: "/settings" },
  ];

  const primaryItems = isTeacher ? teacherItems : isInvestor ? investorItems : studentItems;

  const navLinkClass = (isActive) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors border-l-2 ${
      isActive
        ? "bg-primary/10 border-primary text-primary"
        : "border-transparent hover:bg-secondary text-foreground"
    }`;

  const subLinkClass = (isActive) =>
    `flex items-center gap-2.5 pl-8 pr-3 py-2 rounded-r-lg text-sm border-l-2 ml-3 transition-colors ${
      isActive
        ? "border-primary bg-primary/10 text-primary"
        : "border-border hover:bg-secondary/80 text-muted-foreground hover:text-foreground"
    }`;

  const LearnFlyout = () => (
    <div className="min-w-[180px] py-1">
      {primaryItems.find((i) => i.key === "learn").sub.map((sub) => {
        const isActive = location.pathname === sub.href;
        return (
          <Link
            key={sub.href}
            to={sub.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive ? "bg-primary/10 text-primary" : "hover:bg-secondary text-foreground"
            }`}
          >
            {sub.icon}
            {sub.label}
          </Link>
        );
      })}
    </div>
  );

  const ClassesFlyout = () => (
    <div className="min-w-[180px] py-1">
      {primaryItems.find((i) => i.key === "classes").sub.map((sub) => {
        const isActive = location.pathname === sub.href;
        return (
          <Link
            key={sub.href}
            to={sub.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive ? "bg-primary/10 text-primary" : "hover:bg-secondary text-foreground"
            }`}
          >
            {sub.icon}
            {sub.label}
          </Link>
        );
      })}
    </div>
  );

  const SidebarContent = () => (
    <>
      {/* Logo + collapse */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border p-3">
        <Link
          to="/dashboard"
          className="flex min-w-0 flex-1 items-center gap-2"
          onClick={() => setMobileOpen(false)}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="label font-heading text-lg font-semibold truncate">TaskFlow</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {primaryItems.map((item) => {
          if (item.key === "learn") {
            const isLearnActive = item.sub.some((s) => location.pathname === s.href);
            const isPartiallyActive = isLearnActive && !learnOpen;

            if (collapsed) {
              return (
                <HoverCard key="learn" openDelay={200} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <Link
                      to="/study"
                      className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                        isLearnActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary"
                      }`}
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.icon}
                    </Link>
                  </HoverCardTrigger>
                  <HoverCardContent side="right" align="start" className="w-auto p-0">
                    <LearnFlyout />
                  </HoverCardContent>
                </HoverCard>
              );
            }

            return (
              <Collapsible
                key="learn"
                open={learnOpen}
                onOpenChange={setLearnOpen}
                className="space-y-0.5"
              >
                <CollapsibleTrigger
                  className={`label w-full ${navLinkClass(isPartiallyActive || learnOpen)}`}
                >
                  {item.icon}
                  <span className="flex-1 text-left font-medium">{item.label}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform duration-200 ${learnOpen ? "rotate-180" : ""}`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="overflow-hidden transition-[max-height] duration-250 ease-out data-[state=closed]:max-h-0 data-[state=open]:max-h-[320px]">
                  <div className="space-y-0.5 pt-0.5">
                    {item.sub.map((sub) => (
                      <Link
                        key={sub.href}
                        to={sub.href}
                        onClick={() => setMobileOpen(false)}
                        className={subLinkClass(location.pathname === sub.href)}
                        data-testid={`nav-${sub.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {sub.icon}
                        <span>{sub.label}</span>
                      </Link>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          }

          if (item.key === "classes") {
            const isClassesActive = item.sub.some((s) => location.pathname === s.href);
            const isPartiallyActive = isClassesActive && !classesOpen;

            if (collapsed) {
              return (
                <HoverCard key="classes" openDelay={200} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <Link
                      to="/teacher/classes"
                      className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                        isClassesActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary"
                      }`}
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.icon}
                    </Link>
                  </HoverCardTrigger>
                  <HoverCardContent side="right" align="start" className="w-auto p-0">
                    <ClassesFlyout />
                  </HoverCardContent>
                </HoverCard>
              );
            }

            return (
              <Collapsible
                key="classes"
                open={classesOpen}
                onOpenChange={setClassesOpen}
                className="space-y-0.5"
              >
                <CollapsibleTrigger
                  className={`label w-full ${navLinkClass(isPartiallyActive || classesOpen)}`}
                >
                  {item.icon}
                  <span className="flex-1 text-left font-medium">{item.label}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform duration-200 ${classesOpen ? "rotate-180" : ""}`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="overflow-hidden transition-[max-height] duration-250 ease-out data-[state=closed]:max-h-0 data-[state=open]:max-h-[320px]">
                  <div className="space-y-0.5 pt-0.5">
                    {item.sub.map((sub) => (
                      <Link
                        key={sub.href}
                        to={sub.href}
                        onClick={() => setMobileOpen(false)}
                        className={subLinkClass(location.pathname === sub.href)}
                        data-testid={`nav-${sub.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {sub.icon}
                        <span>{sub.label}</span>
                      </Link>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          }

          const isActive = location.pathname === item.href;
          const link = (
            <Link
              to={item.href}
              onClick={() => setMobileOpen(false)}
              className={navLinkClass(isActive)}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              {item.icon}
              <span className="label font-medium">{item.label}</span>
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href} delayDuration={300}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          }
          return <div key={item.href}>{link}</div>;
        })}
      </nav>

      {/* Storage bar — students and teachers only */}
      {(isStudent || isTeacher) && (() => {
        const pct = Math.round((STORAGE_DATA.used / STORAGE_DATA.total) * 100);
        const barColor = storageBarColor(pct);
        const showUpgrade = pct >= 75;
        if (collapsed) {
          return (
            <div className="shrink-0 px-2 pb-2 flex justify-center">
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setStorageOpen(true)}
                    className={`h-9 w-9 rounded-lg flex items-center justify-center transition-colors hover:bg-secondary ${
                      pct >= 80 ? "text-red-500" : pct >= 60 ? "text-amber-500" : "text-muted-foreground"
                    }`}
                  >
                    <HardDrive className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{STORAGE_DATA.used} GB / {STORAGE_DATA.total} GB used</TooltipContent>
              </Tooltip>
            </div>
          );
        }
        return (
          <div className="shrink-0 px-3 pb-2">
            <button
              type="button"
              onClick={() => setStorageOpen(true)}
              className="w-full rounded-xl border border-border bg-secondary/40 hover:bg-secondary/80 transition-colors p-3 text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <HardDrive className={`h-3.5 w-3.5 ${pct >= 80 ? "text-red-500" : pct >= 60 ? "text-amber-500" : "text-muted-foreground"}`} />
                  <span className="text-[11px] font-medium text-foreground">{STORAGE_DATA.used} GB / {STORAGE_DATA.total} GB</span>
                </div>
                <span className={`text-[10px] font-semibold ${pct >= 80 ? "text-red-500" : pct >= 60 ? "text-amber-500" : "text-muted-foreground"}`}>{pct}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-border overflow-hidden mb-2">
                <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="flex items-center gap-2">
                {STORAGE_DATA.breakdown.map(({ label, gb, color }) => (
                  <div key={label} className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                    <span className="text-[9px] text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
              {showUpgrade && (
                <div className="mt-2 pt-2 border-t border-border">
                  <span className="text-[10px] font-semibold text-amber-500 flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3" /> Upgrade Storage
                  </span>
                </div>
              )}
            </button>
          </div>
        );
      })()}

      {/* Profile card + popover — pinned bottom */}
      <ProfileCardWithPopover
        user={user}
        founder={founder}
        founderMeta={founderMeta}
        level={level}
        levelProgress={levelProgress}
        xpInLevel={xpInLevel}
        xpForNextLevel={xpForNextLevel}
        collapsed={collapsed}
        theme={theme}
        toggleTheme={toggleTheme}
        onNavigate={navigate}
        onLogout={handleLogout}
        onCloseMobile={() => setMobileOpen(false)}
      />
    </>
  );

  return (
    <TooltipProvider delayDuration={300}>
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-border bg-background p-4 md:hidden">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-heading font-semibold">TaskFlow</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        >
          <div
            className="absolute left-0 top-0 bottom-0 flex w-[220px] flex-col border-r border-border bg-card pt-16"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside
        className={`sidebar hidden md:flex h-screen sticky top-0 flex-col border-r border-border bg-card transition-[width] duration-200 ease-out ${collapsed ? "w-16 collapsed" : "w-[220px]"}`}
      >
        <div className="flex h-full flex-col overflow-hidden">
          <SidebarContent />
        </div>
      </aside>

      <div className="md:hidden h-16" aria-hidden />

      {/* Storage detail sheet */}
      {(isStudent || isTeacher) && (
        <Sheet open={storageOpen} onOpenChange={setStorageOpen}>
          <SheetContent side="left" className="w-80 sm:max-w-80 flex flex-col gap-0 p-0">
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-muted-foreground" />
                <SheetTitle className="font-heading text-lg">Storage</SheetTitle>
              </div>
              <SheetDescription>
                {STORAGE_DATA.plan} plan · {STORAGE_DATA.total} GB total
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Big usage meter */}
              {(() => {
                const pct = Math.round((STORAGE_DATA.used / STORAGE_DATA.total) * 100);
                const barColor = storageBarColor(pct);
                return (
                  <div>
                    <div className="flex items-end justify-between mb-2">
                      <div>
                        <span className="text-3xl font-bold">{STORAGE_DATA.used}</span>
                        <span className="text-muted-foreground ml-1 text-sm">/ {STORAGE_DATA.total} GB</span>
                      </div>
                      <span className={`text-sm font-semibold ${pct >= 80 ? "text-red-500" : pct >= 60 ? "text-amber-500" : "text-green-500"}`}>
                        {pct}% used
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-border overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })()}

              {/* Breakdown */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Breakdown</p>
                <div className="space-y-3">
                  {STORAGE_DATA.breakdown.map(({ label, gb, Icon, color }) => {
                    const itemPct = Math.round((gb / STORAGE_DATA.total) * 100);
                    return (
                      <div key={label}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color + "20" }}>
                              <Icon className="h-3.5 w-3.5" style={{ color }} />
                            </div>
                            <span className="text-sm font-medium">{label}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{gb} GB</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${itemPct}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* This month */}
              <div className="rounded-xl border border-border bg-secondary/40 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Added this month</span>
                </div>
                <p className="text-2xl font-bold">{STORAGE_DATA.addedThisMonth} <span className="text-base font-normal text-muted-foreground">GB</span></p>
                <p className="text-xs text-muted-foreground mt-0.5">At this rate, you'll fill your plan in ~2 months.</p>
              </div>
            </div>

            {/* Upgrade card pinned at bottom */}
            <div className="px-6 py-5 border-t border-border">
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 mb-3">
                <p className="text-sm font-semibold mb-0.5">You're running out of room.</p>
                <p className="text-xs text-muted-foreground">Upgrade to keep everything safe.</p>
                <div className="mt-3 flex flex-col gap-1.5 text-xs text-muted-foreground">
                  <div className="flex justify-between"><span>Lite plan</span><span className="font-medium text-foreground">10 GB</span></div>
                  <div className="flex justify-between"><span>Pro plan</span><span className="font-medium text-foreground">50 GB</span></div>
                </div>
              </div>
              <Link
                to="/pricing"
                onClick={() => setStorageOpen(false)}
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary text-primary-foreground text-sm font-medium py-2.5 hover:bg-primary/90 transition-colors"
              >
                Upgrade Storage <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </TooltipProvider>
  );
}
