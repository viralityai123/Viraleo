/**
 * Best-selling / top-rated Fiverr reference per lead category.
 * Used to surface a benchmark gig on each queue card so the user knows
 * what the top of the market charges (and to sell against).
 */

export interface FiverrGig {
  seller: string;
  gig: string;
  rating: string;
  reviews: string;
  price: string;
  note: string;
}

export const FIVERR_GIGS: Record<string, FiverrGig> = {
  "web-design": {
    seller: "Skydesigner",
    gig: "Custom UI/UX website design",
    rating: "5.0",
    reviews: "45,000+",
    price: "$385+",
    note: "Fiverr Pro studio, conversion-driven web design, 5-day homepages",
  },
  "landing-page": {
    seller: "Poki Studios",
    gig: "High-converting landing page design",
    rating: "4.9",
    reviews: "400+",
    price: "$245+",
    note: "Fiverr Pro agency, clean modern landing pages for startups",
  },
  branding: {
    seller: "Skydesigner",
    gig: "Logo & brand identity",
    rating: "5.0",
    reviews: "44,000+",
    price: "$120–$250",
    note: "Top Rated + Pro seller, 100% handcrafted, 3-day delivery",
  },
  "social-media": {
    seller: "mehadi84",
    gig: "Social media manager / posting",
    rating: "5.0",
    reviews: "low-volume",
    price: "$35/mo",
    note: "2 platforms, 15 posts/mo with graphics; full-service $1,500–$3,000/mo model",
  },
  copywriting: {
    seller: "ghostwriting/email pros",
    gig: "Sales copy & email sequences",
    rating: "4.9+",
    reviews: "top-tier",
    price: "$150–$400",
    note: "High-margin 2026 niche: LinkedIn essays, email sequences, landing copy",
  },
  video: {
    seller: "UGC / shorts editors",
    gig: "Short-form & UGC video editing",
    rating: "4.9+",
    reviews: "top-tier",
    price: "$40–$150/clip",
    note: "Biggest demand category; top UGC editors clear $5k–$15k/mo",
  },
  "ai-automation": {
    seller: "automation builders",
    gig: "AI agents / no-code automation",
    rating: "4.9+",
    reviews: "growing",
    price: "$150–$400",
    note: "Make.com/n8n/Zapier workflows, custom GPTs, AI agents",
  },
  ecommerce: {
    seller: "Shopify store builders",
    gig: "Shopify store design & dev",
    rating: "4.9+",
    reviews: "top-tier",
    price: "$200–$500",
    note: "Quick-launch stores ~$350/2 days; product pages + conversion focus",
  },
  systems: {
    seller: "ops/systems pros",
    gig: "Notion/CRM/SOP setup",
    rating: "4.9+",
    reviews: "top-tier",
    price: "$100–$300",
    note: "Notion workspaces, CRM setup, SOPs, business systems",
  },
  "saas-app": {
    seller: "MVP/app devs",
    gig: "MVP & app development",
    rating: "4.9+",
    reviews: "top-tier",
    price: "$500–$2,500",
    note: "Highest-paying dev work; web/mobile/no-code MVPs",
  },
  other: {
    seller: "Fiverr top-rated",
    gig: "Matching service (search category)",
    rating: "4.9+",
    reviews: "top-tier",
    price: "varies",
    note: "Lead didn't map to a core category — match by their exact need",
  },
};

export function recommendFiverrGig(category: string): string {
  const gig = FIVERR_GIGS[category] || FIVERR_GIGS.other;
  return `${gig.gig} — ${gig.seller} (${gig.rating}, ${gig.reviews} reviews, ${gig.price}). ${gig.note}`;
}
