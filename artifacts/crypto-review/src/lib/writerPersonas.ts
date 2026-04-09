export interface WriterPersona {
  name: string;
  initials: string;
  role: string;
  credentials: string;
  specialties: string[];
  avatarBg: string;
}

export const WRITER_PERSONAS: Record<string, WriterPersona> = {
  webb: {
    name: "M. Webb",
    initials: "MW",
    role: "Senior Threat Analyst",
    credentials: "Blockchain Forensics · OSINT · Cybercrime Investigation",
    specialties: ["Deepfake Detection", "AI Fraud", "Social Engineering", "Identity Theft"],
    avatarBg: "bg-indigo-900",
  },
  nair: {
    name: "P. Nair",
    initials: "PN",
    role: "Financial Crime Researcher",
    credentials: "Forensic Accounting · Market Manipulation · Regulatory Compliance",
    specialties: ["Fake Dashboards", "Ponzi Schemes", "Trading Scams", "Money Laundering"],
    avatarBg: "bg-emerald-900",
  },
  ortiz: {
    name: "D. Ortiz",
    initials: "DO",
    role: "Digital Forensics Specialist",
    credentials: "Smart Contract Auditing · DeFi Security · Penetration Testing",
    specialties: ["Rug Pulls", "Token Exploits", "Wallet Drainers", "Flash Loan Attacks"],
    avatarBg: "bg-amber-900",
  },
};
