import React from "react";
import "./Main.css";
import { Toaster } from "./components/ui/sonner";

export default function RootWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
