import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";

export function TopBar({ children }: { children?: ReactNode }) {
  return (
    <header className="topbar">
      <Link to="/" className="brand">
        Prep
      </Link>
      <div className="topbar-end">
        {children}
        <ThemeToggle />
      </div>
    </header>
  );
}
