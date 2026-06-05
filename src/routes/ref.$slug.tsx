import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { createServerFn } from "@tanstack/react-start";
import { trackClick, resolveAlias } from "@/lib/partner-store";

const trackReferralClick = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string; ip: string; userAgent: string; referrerPage: string }) => d)
  .handler(async ({ data }) => {
    const realSlug = (await resolveAlias(data.slug)) || data.slug;
    await trackClick(realSlug, { ip: data.ip, userAgent: data.userAgent, referrerPage: data.referrerPage });
    return { ok: true, slug: realSlug };
  });

export const Route = createFileRoute("/ref/$slug")({
  component: ReferralRedirect,
});

function ReferralRedirect() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (slug) {
      trackReferralClick({
        data: {
          slug,
          ip: "",
          userAgent: navigator.userAgent || "",
          referrerPage: document.referrer || "",
        },
      }).then((res) => {
        const realSlug = res.slug;
        localStorage.setItem("viraleo:referrer", realSlug);
        document.cookie = `viraleo_ref=${encodeURIComponent(realSlug)}; Path=/; Max-Age=2592000; SameSite=Lax`;
      }).finally(() => {
        navigate({ to: "/" });
      });
    } else {
      navigate({ to: "/" });
    }
  }, [slug, navigate]);

  return null;
}
