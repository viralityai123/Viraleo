import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/payouts")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
