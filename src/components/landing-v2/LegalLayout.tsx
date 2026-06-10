import type { ReactNode } from "react";
import { Nav, Footer } from "./LandingV2";
import "./landing-v2.css";

export function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <main className="lv2 lv2-section--g1">
      <Nav />
      <div className="min-h-screen px-6 pt-32 pb-16">
        <div className="max-w-3xl mx-auto">{children}</div>
      </div>
      <Footer />
    </main>
  );
}
