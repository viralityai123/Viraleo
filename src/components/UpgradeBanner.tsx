import { Link } from "@tanstack/react-router";
import { usePlanDisplay } from "@/lib/user-state";

export function UpgradeBanner({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const { tier } = usePlanDisplay();
  if (tier !== "free") return null;

  return (
    <div className="mt-16 mb-6 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 border border-emerald-100/60 p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
        <div className="shrink-0 size-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200/50">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[17px] font-bold text-emerald-900">{title}</h3>
          <p className="text-[13px] text-emerald-700/70 mt-1">{description}</p>
        </div>
        <Link
          to="/select-plan"
          className="rounded-full bg-emerald-500 text-white px-5 py-2.5 text-[14px] font-semibold hover:bg-emerald-600 transition shadow-sm whitespace-nowrap"
        >
          Upgrade →
        </Link>
      </div>
    </div>
  );
}
