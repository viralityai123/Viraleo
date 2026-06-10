import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { retrainThumbnailMl } from "@/routes/api/training/retrain-thumbnail";
import {
  ArrowLeft,
  RefreshCw,
  Database,
  ThumbsUp,
  ThumbsDown,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export const Route = createFileRoute("/retrain-thumbnail")({
  head: () => ({
    meta: [
      { title: "Retrain Thumbnail Model — Viraleo" },
      {
        name: "description",
        content: "Retrain the Viraleo thumbnail scoring ML model with feedback data.",
      },
      { property: "og:title", content: "Retrain Model — Viraleo" },
      { name: "twitter:title", content: "Retrain Model — Viraleo" },
      { name: "twitter:description", content: "Retrain thumbnail ML model." },
      { name: "twitter:image", content: "https://viraleo.pro/vi-logo.png" },
    ],
    links: [{ rel: "canonical", href: "https://viraleo.pro/retrain-thumbnail" }],
  }),
  component: RetrainThumbnailPage,
});

function RetrainThumbnailPage() {
  const [training, setTraining] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  async function handleRetrain() {
    setTraining(true);
    setResult(null);
    setError("");
    try {
      const res = await retrainThumbnailMl();
      setResult(res);
    } catch (e: any) {
      setError(e?.message || "Retrain failed");
    }
    setTraining(false);
  }

  return (
    <div className="min-h-screen bg-white text-ink font-text">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <Link
          to="/account"
          className="text-[13px] text-emerald-600 font-bold hover:underline mb-6 inline-block"
        >
          &larr; Back to account
        </Link>
        <h1 className="font-display text-[26px] font-black text-ink mb-2">
          Retrain Thumbnail Model
        </h1>
        <p className="text-[13px] text-ink-soft mb-8">
          Aggregate user feedback to improve the thumbnail scoring model. Requires training data
          from Cloudflare R2.
        </p>

        <button
          onClick={handleRetrain}
          disabled={training}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 text-white px-5 py-3 text-sm font-bold hover:bg-emerald-600 transition disabled:opacity-50 mb-8"
        >
          <RefreshCw size={16} className={training ? "animate-spin" : ""} />
          {training ? "Training..." : "Retrain model"}
        </button>

        {error && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-200">
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-[13px] text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="bg-white border border-hairline rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                {result.trained ? (
                  <CheckCircle size={18} className="text-emerald-500" />
                ) : (
                  <AlertCircle size={18} className="text-amber-500" />
                )}
                <span
                  className={`text-[15px] font-bold ${result.trained ? "text-emerald-700" : "text-amber-700"}`}
                >
                  {result.trained ? "Training completed" : result.reason || "Training skipped"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-surface-2 rounded-xl p-3 text-center">
                  <Database size={18} className="mx-auto text-ink-soft mb-1" />
                  <span className="text-[20px] font-black text-ink block">
                    {result.recordCount ?? 0}
                  </span>
                  <span className="text-[10px] text-ink-soft uppercase tracking-wider font-bold">
                    Records
                  </span>
                </div>
                <div className="bg-surface-2 rounded-xl p-3 text-center">
                  <ThumbsUp size={18} className="mx-auto text-emerald-500 mb-1" />
                  <span className="text-[20px] font-black text-ink block">
                    {result.positiveCount ?? 0}
                  </span>
                  <span className="text-[10px] text-ink-soft uppercase tracking-wider font-bold">
                    Positive
                  </span>
                </div>
                <div className="bg-surface-2 rounded-xl p-3 text-center">
                  <ThumbsDown size={18} className="mx-auto text-red-400 mb-1" />
                  <span className="text-[20px] font-black text-ink block">
                    {result.negativeCount ?? 0}
                  </span>
                  <span className="text-[10px] text-ink-soft uppercase tracking-wider font-bold">
                    Negative
                  </span>
                </div>
                <div className="bg-surface-2 rounded-xl p-3 text-center">
                  <Clock size={18} className="mx-auto text-ink-soft mb-1" />
                  <span className="text-[20px] font-black text-ink block">
                    {result.timestamp ? new Date(result.timestamp).toLocaleTimeString() : "-"}
                  </span>
                  <span className="text-[10px] text-ink-soft uppercase tracking-wider font-bold">
                    Trained at
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {!result && !error && (
          <div className="text-center py-12 border border-dashed border-hairline rounded-2xl">
            <Database size={36} className="mx-auto text-ink-soft/30 mb-3" />
            <p className="text-[13px] text-ink-soft">
              Click "Retrain model" to aggregate feedback and update weights.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
