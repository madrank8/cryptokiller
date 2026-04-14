import type { WriterPersona } from "./writerPersonas";

const BASE = "https://cryptokiller.org";
const ORG_ID = `${BASE}/#organization`;
const WEBSITE_ID = `${BASE}/#website`;

const KNOWS_ABOUT = [
  "Cryptocurrency Scam Investigation",
  "Pig Butchering Fraud Detection",
  "Deepfake Celebrity Endorsement Scams",
  "Crypto Ad Surveillance",
  "AI Trading Bot Scam Detection",
  "Fake Trading Platform Identification",
  "Blockchain Forensics",
  "Consumer Protection Intelligence",
  "Financial Crime Research",
  "Rug Pull Investigation",
];

export function organizationNode(): Record<string, unknown> {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: "CryptoKiller",
    url: BASE,
    description:
      "Independent crypto scam investigation platform that tracks 22,000+ brands across 84+ countries with evidence-based threat scores.",
    foundingDate: "2025",
    knowsAbout: KNOWS_ABOUT,
    sameAs: [],
    email: "corrections@cryptokiller.org",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "editorial corrections",
      email: "corrections@cryptokiller.org",
    },
    areaServed: "Worldwide",
  };
}

export function websiteNode(): Record<string, unknown> {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: BASE,
    name: "CryptoKiller",
    description:
      "Check any crypto platform before investing. CryptoKiller tracks 22,000+ scam brands with evidence-based threat scores.",
    publisher: { "@id": ORG_ID },
    inLanguage: "en",
  };
}

export function personNode(persona: WriterPersona): Record<string, unknown> {
  const slugId = persona.slug || persona.name.toLowerCase().replace(/[^a-z]/g, "-");
  return {
    "@type": "Person",
    "@id": `${BASE}/#author-${slugId}`,
    name: persona.name,
    url: `${BASE}/author/${persona.slug}`,
    jobTitle: persona.role,
    description: persona.bio,
    worksFor: { "@id": ORG_ID },
    knowsAbout: persona.specialties,
  };
}

export function personRef(persona: WriterPersona): Record<string, unknown> {
  const slugId = persona.slug || persona.name.toLowerCase().replace(/[^a-z]/g, "-");
  return { "@id": `${BASE}/#author-${slugId}` };
}

export function orgRef(): Record<string, unknown> {
  return { "@id": ORG_ID };
}

export function websiteRef(): Record<string, unknown> {
  return { "@id": WEBSITE_ID };
}
