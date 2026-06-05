import { Link } from "@tanstack/react-router";

const LOGO_SRC = "/vi-logo.png";

const sizes = {
  sm: { img: "h-8 w-auto max-w-[88px]", text: "text-[15px]" },
  md: { img: "h-10 w-auto max-w-[108px]", text: "text-[17px]" },
  lg: { img: "h-12 w-auto max-w-[128px]", text: "text-[19px]" },
  xl: { img: "h-16 w-auto max-w-[168px]", text: "text-[21px]" },
} as const;

type ViraleoLogoProps = {
  showText?: boolean;
  size?: keyof typeof sizes;
  className?: string;
  linkTo?: string;
};

export function ViraleoLogo({
  showText = true,
  size = "md",
  className = "",
  linkTo = "/pre-analysis",
}: ViraleoLogoProps) {
  const s = sizes[size];

  const inner = (
    <>
      <img
        src={LOGO_SRC}
        alt="Viraleo"
        className={`${s.img} object-contain object-left shrink-0`}
        draggable={false}
      />
      {showText && (
        <span className={`font-display font-extrabold tracking-tight text-[#0a0a0a] ${s.text}`}>
          Viraleo
        </span>
      )}
    </>
  );

  if (!linkTo) {
    return <div className={`inline-flex items-center gap-2.5 ${className}`}>{inner}</div>;
  }

  return (
    <Link
      to={linkTo}
      className={`inline-flex items-center gap-2.5 no-underline text-inherit ${className}`}
    >
      {inner}
    </Link>
  );
}
