import type { WriterPersona } from "./writerPersonas";

const BASE = "https://cryptokiller.org";
const ORG_ID = `${BASE}/#organization`;
const WEBSITE_ID = `${BASE}/#website`;
const LEGAL_ENTITY_ID = `${BASE}/#legal-entity`;

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

function clean(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function organizationSameAs(): string[] {
  const envUrls = [
    process.env.CRYPTOKILLER_LINKEDIN_URL,
    process.env.CRYPTOKILLER_TWITTER_URL,
    process.env.CRYPTOKILLER_CRUNCHBASE_URL,
    process.env.CRYPTOKILLER_GITHUB_URL,
    process.env.CRYPTOKILLER_WIKIDATA_URL,
  ]
    .map(clean)
    .filter((u) => u.startsWith("https://"));

  if (envUrls.length > 0) return envUrls;

  // Canonical Twitter handle is @cryptokiller — matches index.html
  // twitter:site/twitter:creator. The earlier `@cryptokiller_org` value
  // was an entity-disambiguation divergence flagged in the 2026-05-03
  // audit. CRYPTOKILLER_TWITTER_URL env var override remains supported.
  return [
    "https://www.linkedin.com/company/cryptokiller/",
    "https://twitter.com/cryptokiller",
    "https://www.crunchbase.com/organization/cryptokiller",
    "https://github.com/madrank8",
  ];
}

export function legalEntityNode(): Record<string, unknown> {
  return {
    "@type": "Organization",
    "@id": LEGAL_ENTITY_ID,
    name: "DEX Algo Technologies Pte Ltd.",
    legalName: "DEX Algo Technologies Pte Ltd.",
    address: {
      "@type": "PostalAddress",
      addressCountry: "SG",
      addressLocality: "Singapore",
    },
  };
}

export function organizationNode(): Record<string, unknown> {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: "CryptoKiller",
    url: BASE,
    logo: `${BASE}/logo.png`,
    description:
      "Independent crypto scam investigation platform that tracks 22,000+ brands across 84+ countries with evidence-based threat scores.",
    foundingDate: "2025",
    parentOrganization: { "@id": LEGAL_ENTITY_ID },
    knowsAbout: KNOWS_ABOUT,
    sameAs: organizationSameAs(),
    email: "corrections@cryptokiller.org",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "editorial corrections",
      email: "corrections@cryptokiller.org",
      availableLanguage: ["English"],
      hoursAvailable: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          opens: "09:00",
          closes: "17:00",
        },
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Saturday", "Sunday"],
          opens: "11:00",
          closes: "15:00",
        },
      ],
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
    memberOf: { "@id": ORG_ID },
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

export function globalSiteSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      legalEntityNode(),
      organizationNode(),
      websiteNode(),
    ],
  };
}
