import { Link } from "@tanstack/react-router";
import { ViraleoLogo } from "@/components/ViraleoLogo";

export function Header({ onReset }: { onReset?: () => void }) {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-surface/70 border-b border-hairline">
      <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between">
        <ViraleoLogo linkTo="/pre-analysis" size="md" showText className="text-ink" />
        <nav className="flex items-center gap-1 text-[13px]">
          <Link
            to="/pre-analysis" search={{ channel: undefined, activityId: undefined }}
            className="px-3 py-1.5 rounded-full text-ink-soft hover:text-ink hover:bg-surface-2 transition"
          >
            ← Back to Search
          </Link>
          <button 
            onClick={onReset}
            className="px-3 py-1.5 rounded-full bg-ink text-surface font-medium hover:opacity-90 transition"
          >
            Analyse Another
          </button>
        </nav>
      </div>
    </header>
  );
}
