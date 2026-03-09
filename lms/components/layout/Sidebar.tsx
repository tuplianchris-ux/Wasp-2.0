"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  ClipboardList,
  FlaskConical,
  BookOpen,
  Library,
  LogOut,
  GraduationCap,
  Brain,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const teacherNav = [
  { href: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teacher/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/teacher/tests", label: "Tests & Quizzes", icon: FlaskConical },
  { href: "/teacher/grading", label: "Grading", icon: BookOpen },
  { href: "/teacher/library", label: "Library", icon: Library },
];

const studentNav = [
  { href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/student/study-hub", label: "Study Hub", icon: Brain },
  { href: "/student/tests", label: "Tests", icon: FlaskConical },
  { href: "/student/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/student/library", label: "Library", icon: Library },
];

interface SidebarProps {
  role: "TEACHER" | "STUDENT";
  userName: string;
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const nav = role === "TEACHER" ? teacherNav : studentNav;

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen border-r bg-card transition-all duration-300 shrink-0",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-2.5 px-4 py-5 border-b",
        collapsed && "justify-center px-0"
      )}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <GraduationCap className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="font-sora font-semibold text-sm leading-tight">Visionary</p>
            <p className="text-xs text-muted-foreground">Academy</p>
          </div>
        )}
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-4 py-3 border-b">
          <span className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
            role === "TEACHER"
              ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
              : "bg-teal-500/10 text-teal-600 dark:text-teal-400"
          )}>
            {role === "TEACHER" ? "Teacher Portal" : "Student Portal"}
          </span>
        </div>
      )}

      {/* Nav */}
      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "sidebar-item",
                  isActive ? "sidebar-item-active" : "sidebar-item-inactive",
                  collapsed && "justify-center px-0"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-2 space-y-1">
        {!collapsed && (
          <div className="px-3 py-2 text-xs text-muted-foreground truncate">
            {userName}
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn(
            "sidebar-item sidebar-item-inactive w-full text-destructive hover:bg-destructive/5 hover:text-destructive",
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-20 z-10 w-6 h-6 rounded-full border bg-background shadow-sm flex items-center justify-center hover:bg-accent transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>
    </aside>
  );
}
