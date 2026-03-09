import React from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

interface AppShellProps {
  children: React.ReactNode;
  role: "TEACHER" | "STUDENT";
  userName: string;
  pageTitle: string;
}

export function AppShell({ children, role, userName, pageTitle }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={role} userName={userName} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar title={pageTitle} userName={userName} userRole={role} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
