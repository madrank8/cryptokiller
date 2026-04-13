export interface WriterPersona {
  name: string;
  slug: string;
  initials: string;
  role: string;
  credentials: string;
  specialties: string[];
  avatarBg: string;
  bio: string;
  fullBio: string;
  yearsExperience: string;
  published: string;
}

export const WRITER_PERSONAS: Record<string, WriterPersona> = {
  webb: {
    name: "M. Webb",
    slug: "webb",
    initials: "MW",
    role: "Senior Threat Analyst",
    credentials: "Blockchain Forensics · OSINT · Cybercrime Investigation",
    specialties: ["Deepfake Detection", "AI Fraud", "Social Engineering", "Identity Theft"],
    avatarBg: "bg-indigo-900",
    bio: "Former cybercrime unit analyst who spent 5 years tracing stolen crypto before joining CryptoKiller to expose scam operations at scale.",
    fullBio: "M. Webb spent over five years working in a national cybercrime unit, tracing stolen cryptocurrency across decentralized networks and helping law enforcement agencies build cases against organized fraud rings. After watching the same scam playbooks get recycled across borders — fake trading platforms, celebrity-endorsed deepfakes, pig-butchering funnels — Webb joined CryptoKiller to move from reactive casework to proactive exposure. Today, Webb leads threat assessment across every platform CryptoKiller tracks, specializing in wallet flow analysis, OSINT-based attribution, and deepfake detection. Webb has published over 340 investigations and developed the internal scam classification framework the team uses to score emerging threats.",
    yearsExperience: "9 years",
    published: "340+ investigations published",
  },
  nair: {
    name: "P. Nair",
    slug: "nair",
    initials: "PN",
    role: "Financial Crime Researcher",
    credentials: "Forensic Accounting · Market Manipulation · Regulatory Compliance",
    specialties: ["Fake Dashboards", "Ponzi Schemes", "Trading Scams", "Money Laundering"],
    avatarBg: "bg-emerald-900",
    bio: "Previously worked in Trust & Safety at a major social media platform, now focused on exposing fraudulent crypto ad campaigns before they reach victims.",
    fullBio: "P. Nair spent four years on the Trust & Safety team at a major social media platform, reviewing flagged ads and building detection rules for financial fraud campaigns. Nair saw first-hand how crypto scam operators exploit ad targeting — spinning up hundreds of lookalike campaigns, impersonating celebrities, and using fabricated dashboards to lure victims. After leaving the platform side, Nair joined CryptoKiller to apply that insider knowledge to ad intelligence and forensic accounting. Nair monitors social media ad platforms across dozens of countries, identifying celebrity impersonation schemes and phishing funnels at scale. Nair has published over 218 investigations and specializes in fake trading dashboards and Ponzi-style payout structures.",
    yearsExperience: "7 years",
    published: "218 investigations published",
  },
  ortiz: {
    name: "D. Ortiz",
    slug: "ortiz",
    initials: "DO",
    role: "Digital Forensics Specialist",
    credentials: "Smart Contract Auditing · DeFi Security · Penetration Testing",
    specialties: ["Rug Pulls", "Token Exploits", "Wallet Drainers", "Flash Loan Attacks"],
    avatarBg: "bg-amber-900",
    bio: "Investigative journalist turned DeFi security researcher, focused on documenting rug pulls and token exploits with evidence everyday investors can understand.",
    fullBio: "D. Ortiz started as an investigative journalist covering financial crime in Latin America, then moved into DeFi security research after watching friends lose savings to a rug pull in 2021. That experience — seeing real people hurt by schemes that could have been spotted with basic on-chain analysis — drove Ortiz to learn smart contract auditing and penetration testing. At CryptoKiller, Ortiz authors long-form investigation reports that break down complex exploits into language everyday investors can follow. Ortiz covers rug pulls, token exploits, wallet drainers, and flash loan attacks, with a focus on consumer protection and regulatory gaps. Ortiz has published over 167 investigations.",
    yearsExperience: "6 years",
    published: "167 investigations published",
  },
  majithia: {
    name: "Y. Majithia",
    slug: "majithia",
    initials: "YM",
    role: "Senior Crypto Journalist & Analyst",
    credentials: "Crypto Journalism · Content & Editorial Strategy · SEO, AEO & GEO",
    specialties: ["FinTech Analysis", "B2B Crypto Content", "Editorial Strategy", "Scam Exposure Reporting"],
    avatarBg: "bg-sky-900",
    bio: "Senior crypto journalist and content strategist who helps B2B tech and FinTech companies build authority — now channeling that expertise into exposing crypto scams at CryptoKiller.",
    fullBio: "Y. Majithia is a senior crypto journalist and analyst based in Mumbai, with deep expertise in content and editorial strategy for B2B tech and FinTech companies. Majithia has spent years helping companies in the crypto and financial technology space connect the dots in their industry — building authority through well-researched, high-impact content. That same skill set now drives CryptoKiller's editorial output: turning complex scam operations into clear, evidence-based reports that rank in search results and reach potential victims before the scammers do. Majithia brings a unique combination of SEO, AEO, and GEO expertise to the team, ensuring CryptoKiller's investigations are not only accurate but discoverable at the moment someone searches for a suspicious platform.",
    yearsExperience: "8 years",
    published: "95+ investigations published",
  },
};
