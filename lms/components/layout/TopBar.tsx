"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TopBarProps {
  title: string;
  userName: string;
  userRole: string;
}

export function TopBar({ title, userName, userRole }: TopBarProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="h-14 border-b bg-card/80 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-6">
      <h1 className="font-sora font-semibold text-base">{title}</h1>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-8 w-8"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Bell className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2 ml-2 pl-2 border-l">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-xs font-semibold text-primary">
              {userName?.charAt(0)?.toUpperCase() ?? "U"}
            </span>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-medium leading-none">{userName}</p>
            <p className="text-xs text-muted-foreground capitalize">{userRole?.toLowerCase()}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
