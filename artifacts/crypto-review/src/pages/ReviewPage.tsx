import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, Link } from "wouter";
import { useGetReview, useGetRelatedReviews } from "@workspace/api-client-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import {
  Shield, AlertTriangle, Flag, X, CheckCircle,
  Calendar, Eye, User, ExternalLink,
  ChevronRight, AlertOctagon,
  Clock, ShieldAlert, Globe, Lock, Scale,
  BookOpen, FileText, ChevronDown, ChevronUp,
  BarChart2, Microscope, MapPin, Phone, ArrowRight,
  Megaphone, Target, TrendingUp, Siren,
  Activity, Share2, Twitter, Facebook, Copy, Code, Users
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import SiteHeader from "@/components/SiteHeader";
import Breadcrumbs, { breadcrumbJsonLd } from "@/components/Breadcrumbs";

const SectionTitle = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2.5 border-b border-slate-800 pb-3">
    <span className="text-red-500">{icon}</span>
    {children}
  </h2>
);

const stageConfig = [
  { iconBg: "bg-orange-600", border: "border-orange-800/40", bgCard: "bg-orange-950/20", labelColor: "text-orange-400", icon: <Megaphone className="h-5 w-5" /> },
  { iconBg: "bg-amber-600", border: "border-amber-800/40", bgCard: "bg-amber-950/20", labelColor: "text-amber-400", icon: <Target className="h-5 w-5" /> },
  { iconBg: "bg-red-600", border: "border-red-800/40", bgCard: "bg-red-950/20", labelColor: "text-red-400", icon: <TrendingUp className="h-5 w-5" /> },
  { iconBg: "bg-rose-700", border: "border-rose-700/50", bgCard: "bg-rose-950/30", labelColor: "text-rose-400", icon: <Siren className="h-5 w-5" /> },
];

const COUNTRY_PATHS: Record<string, string> = {
  US: "M 168,120 l 4,-2 3,1 2,3 -1,3 3,2 1,3 -2,2 -6,1 -3,-1 -4,2 -3,-1 -2,-3 1,-4 3,-2 4,-4z",
  CA: "M 150,80 l 10,-5 8,2 6,4 4,6 -2,5 -8,3 -6,-1 -5,3 -7,-2 -4,-4 2,-6 2,-5z",
  GB: "M 458,98 l 2,-3 3,0 2,2 -1,3 -2,2 -3,-1 -1,-3z",
  DE: "M 478,108 l 3,-1 2,2 1,3 -1,3 -3,1 -2,-2 -1,-3 1,-3z",
  FR: "M 468,114 l 3,-1 3,2 1,3 -2,3 -3,1 -3,-2 -1,-3 2,-3z",
  ES: "M 460,126 l 4,-1 3,2 1,4 -3,3 -4,0 -3,-3 0,-3 2,-2z",
  IT: "M 486,118 l 2,1 1,4 2,3 -1,3 -2,1 -2,-2 -1,-4 -1,-3 2,-3z",
  PT: "M 454,126 l 2,-1 2,2 0,4 -2,2 -2,-1 -1,-3 1,-3z",
  NL: "M 472,102 l 2,-1 2,1 0,2 -2,1 -2,0 0,-3z",
  BE: "M 472,106 l 2,0 1,2 -1,2 -2,0 -1,-2 1,-2z",
  CH: "M 478,114 l 2,0 1,2 -1,2 -2,0 -1,-2 1,-2z",
  AT: "M 484,112 l 3,0 2,2 -1,2 -3,1 -2,-1 0,-2 1,-2z",
  SE: "M 488,76 l 2,-3 2,1 1,5 -1,4 -2,2 -2,-1 -1,-4 1,-4z",
  NO: "M 482,72 l 2,-4 3,0 2,3 -1,5 -2,3 -3,-1 -1,-3 0,-3z",
  FI: "M 498,72 l 2,-2 3,1 1,4 -1,4 -3,1 -2,-2 -1,-3 1,-3z",
  DK: "M 480,94 l 2,-1 2,1 0,2 -2,1 -2,-1 0,-2z",
  PL: "M 494,102 l 3,-1 3,2 1,3 -2,2 -3,0 -2,-2 0,-4z",
  CZ: "M 488,108 l 2,0 2,1 0,2 -2,1 -2,0 -1,-2 1,-2z",
  RO: "M 502,116 l 3,-1 2,2 0,3 -2,2 -3,0 -1,-3 1,-3z",
  HU: "M 494,114 l 2,0 2,2 -1,2 -2,1 -2,-1 0,-2 1,-2z",
  GR: "M 500,128 l 2,-1 2,2 0,3 -2,2 -2,-1 -1,-2 1,-3z",
  BG: "M 504,122 l 2,-1 2,1 0,3 -2,1 -2,0 -1,-2 1,-2z",
  HR: "M 490,118 l 2,0 1,2 -1,2 -2,1 -1,-2 1,-3z",
  RS: "M 496,120 l 2,0 1,2 -1,2 -2,0 -1,-2 1,-2z",
  SI: "M 488,116 l 1,0 1,1 0,2 -1,1 -1,0 -1,-2 1,-2z",
  SK: "M 494,108 l 2,0 2,1 0,2 -2,1 -2,0 -1,-2 1,-2z",
  IE: "M 450,100 l 2,-1 2,1 0,3 -2,1 -2,-1 0,-3z",
  AU: "M 720,260 l 8,-2 6,3 4,5 2,6 -2,5 -6,3 -5,-1 -4,2 -6,-2 -3,-5 1,-6 2,-5 3,-3z",
  NZ: "M 758,272 l 2,-2 2,1 1,3 -1,3 -2,1 -2,-2 0,-4z",
  JP: "M 720,130 l 1,-3 2,0 1,3 0,4 -1,2 -2,-1 -1,-2 0,-3z",
  KR: "M 712,132 l 1,-1 2,1 0,2 -1,2 -2,0 -1,-2 1,-2z",
  CN: "M 670,130 l 8,-3 6,2 4,4 2,5 -1,4 -5,3 -6,-1 -4,2 -5,-2 -3,-4 1,-5 3,-5z",
  IN: "M 620,160 l 4,-2 3,2 2,5 1,5 -2,4 -4,2 -3,-2 -2,-4 -1,-5 1,-3 1,-2z",
  BR: "M 260,220 l 6,-2 5,3 3,5 1,6 -3,5 -5,2 -4,-2 -3,1 -4,-3 -2,-5 2,-5 4,-5z",
  MX: "M 150,150 l 4,-2 3,1 2,3 -1,3 -3,2 -3,-1 -2,-2 0,-4z",
  AR: "M 250,260 l 3,-2 2,2 1,5 0,5 -2,4 -3,1 -2,-3 -1,-5 0,-4 2,-3z",
  ZA: "M 510,260 l 3,-1 3,2 1,3 -1,3 -3,1 -3,-1 -1,-3 1,-4z",
  NG: "M 480,192 l 3,-1 2,2 0,3 -2,2 -3,0 -1,-3 1,-3z",
  EG: "M 510,150 l 3,-1 2,2 1,4 -2,3 -3,0 -2,-3 0,-3 1,-2z",
  KE: "M 530,200 l 2,-1 2,2 0,3 -2,2 -2,-1 -1,-2 1,-3z",
  SA: "M 540,152 l 4,-1 3,2 1,4 -2,4 -3,1 -3,-2 -1,-4 1,-4z",
  AE: "M 560,156 l 2,-1 2,1 0,3 -2,1 -2,-1 0,-3z",
  IL: "M 524,148 l 1,-1 1,1 0,2 -1,1 -1,-1 0,-2z",
  TR: "M 510,126 l 4,-1 3,1 2,3 -1,3 -3,1 -3,0 -2,-2 0,-3 0,-2z",
  TH: "M 660,180 l 2,-1 1,2 0,4 -1,2 -2,-1 -1,-3 1,-3z",
  VN: "M 670,176 l 1,-1 2,1 0,4 -1,3 -2,0 -1,-3 1,-4z",
  PH: "M 700,176 l 1,-1 2,1 0,3 -1,2 -2,-1 0,-2 0,-2z",
  ID: "M 680,210 l 4,-1 3,1 2,2 -1,3 -3,1 -3,0 -2,-2 0,-4z",
  MY: "M 668,196 l 2,-1 2,1 0,2 -2,1 -2,0 0,-3z",
  SG: "M 670,204 l 1,0 1,1 -1,1 -1,0 0,-2z",
  RU: "M 520,60 l 20,-5 15,3 10,6 5,8 -3,7 -10,4 -12,-1 -8,3 -10,-3 -6,-6 1,-8 -2,-8z",
  PK: "M 600,148 l 3,-1 2,2 1,3 -1,3 -3,1 -2,-2 -1,-3 1,-3z",
  BD: "M 632,162 l 2,-1 1,2 0,2 -1,2 -2,0 -1,-2 1,-3z",
  CO: "M 220,190 l 2,-1 2,1 1,3 -1,3 -2,1 -2,-2 0,-3 0,-2z",
  PE: "M 220,210 l 2,-2 2,1 1,4 -1,3 -2,1 -2,-2 -1,-3 1,-2z",
  CL: "M 240,250 l 1,-2 2,0 1,4 0,6 -1,3 -2,0 -1,-4 0,-7z",
  PL2: "",
  UA: "M 504,102 l 4,-1 3,2 1,3 -2,2 -3,1 -3,-1 -1,-3 1,-3z",
};

function ThreatGauge({ score }: { score: number }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const gaugeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 300);
    return () => clearTimeout(timer);
  }, [score]);

  const angle = -90 + (animatedScore / 100) * 180;
  const getColor = (s: number) => {
    if (s < 30) return "#22c55e";
    if (s < 50) return "#eab308";
    if (s < 70) return "#f97316";
    if (s < 85) return "#ef4444";
    return "#dc2626";
  };

  const createArc = (start: number, end: number) => {
    const r = 80;
    const cx = 100;
    const cy = 95;
    const startRad = (start * Math.PI) / 180;
    const endRad = (end * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = end - start > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const needleRad = (angle * Math.PI) / 180;
  const needleLen = 65;
  const cx = 100;
  const cy = 95;
  const nx = cx + needleLen * Math.cos(needleRad);
  const ny = cy + needleLen * Math.sin(needleRad);

  return (
    <div className="flex flex-col items-center">
      <svg ref={gaugeRef} viewBox="0 0 200 120" className="w-full max-w-[220px]">
        <path d={createArc(180, 225)} stroke="#22c55e" strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.3" />
        <path d={createArc(225, 270)} stroke="#eab308" strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.3" />
        <path d={createArc(270, 315)} stroke="#f97316" strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.3" />
        <path d={createArc(315, 360)} stroke="#ef4444" strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.3" />

        <path
          d={createArc(180, 180 + (animatedScore / 100) * 180)}
          stroke={getColor(animatedScore)}
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          style={{ transition: "all 1s ease-out" }}
        />

        <line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke={getColor(animatedScore)}
          strokeWidth="3"
          strokeLinecap="round"
          style={{ transition: "all 1s ease-out" }}
        />
        <circle cx={cx} cy={cy} r="5" fill={getColor(animatedScore)} style={{ transition: "fill 1s ease-out" }} />

        <text x={cx} y={cy + 25} textAnchor="middle" className="text-3xl font-black" fill="white" fontSize="24">
          {animatedScore}
        </text>
        <text x={cx} y={cy + 38} textAnchor="middle" fill="#94a3b8" fontSize="9">
          / 100
        </text>

        <text x="18" y="100" fill="#22c55e" fontSize="7" fontWeight="bold">LOW</text>
        <text x="164" y="100" fill="#ef4444" fontSize="7" fontWeight="bold">HIGH</text>
      </svg>
      <p className="text-red-400 font-semibold text-sm mt-1">Extreme Risk — Do Not Deposit</p>
    </div>
  );
}

function VelocityWidget({ velocity, platformName }: { velocity: number; platformName: string }) {
  const trend = velocity >= 30 ? "Surging" : velocity >= 10 ? "Rising" : "Stable";
  const trendColor = velocity >= 30 ? "text-red-400" : velocity >= 10 ? "text-amber-400" : "text-green-400";
  const pulseColor = velocity >= 30 ? "bg-red-500" : velocity >= 10 ? "bg-amber-500" : "bg-green-500";

  return (
    <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-5 w-5 text-orange-400" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Ad Velocity</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${pulseColor} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-3 w-3 ${pulseColor}`} />
          </span>
          <span className="text-2xl font-black text-white">{velocity}</span>
          <span className="text-sm text-slate-400">new ads this week</span>
        </div>
        <Badge className={`${trendColor} bg-slate-800 border-slate-700 text-xs ml-auto`}>
          <TrendingUp className="h-3 w-3 mr-1" />
          {trend}
        </Badge>
      </div>
      <p className="text-xs text-slate-500 mt-2">{platformName} ad campaign activity in the last 7 days</p>
    </div>
  );
}

function CelebrityGallery({ names }: { names: string[] }) {
  if (names.length === 0) return null;

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const colors = [
    "bg-red-600", "bg-amber-600", "bg-orange-600", "bg-rose-600",
    "bg-pink-600", "bg-purple-600", "bg-indigo-600", "bg-blue-600",
  ];

  return (
    <section>
      <SectionTitle icon={<Users className="h-6 w-6" />}>Celebrity Impersonations</SectionTitle>
      <p className="text-slate-400 text-sm mb-6">
        The following public figures have been impersonated without authorization in fraudulent advertisements:
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {names.map((name, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className={`w-10 h-10 rounded-full ${colors[i % colors.length]} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
              {getInitials(name)}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">{name}</p>
              <p className="text-red-400 text-xs">Impersonated</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function WorldMap({ countryCodes }: { countryCodes: string[] }) {
  if (countryCodes.length === 0) return null;
  const codeSet = new Set(countryCodes.map(c => c.toUpperCase()));

  return (
    <section>
      <SectionTitle icon={<Globe className="h-6 w-6" />}>Global Reach</SectionTitle>
      <p className="text-slate-400 text-sm mb-4">
        This scam operates across <span className="text-white font-semibold">{countryCodes.length} countries</span>. Highlighted regions indicate confirmed ad targeting.
      </p>
      <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 overflow-hidden">
        <svg viewBox="0 0 800 400" className="w-full h-auto" style={{ maxHeight: 320 }}>
          <rect width="800" height="400" fill="transparent" />
          {Object.entries(COUNTRY_PATHS).map(([code, path]) => {
            if (!path) return null;
            const isActive = codeSet.has(code);
            return (
              <path
                key={code}
                d={path}
                fill={isActive ? "#ef4444" : "#1e293b"}
                stroke={isActive ? "#fca5a5" : "#334155"}
                strokeWidth={isActive ? 1.5 : 0.5}
                opacity={isActive ? 0.9 : 0.5}
              >
                <title>{code}</title>
              </path>
            );
          })}
        </svg>
        <div className="flex flex-wrap gap-2 mt-3">
          {countryCodes.slice(0, 20).map(code => (
            <span key={code} className="px-2 py-0.5 text-xs rounded bg-red-950/60 border border-red-900/40 text-red-300 font-mono">
              {code}
            </span>
          ))}
          {countryCodes.length > 20 && (
            <span className="px-2 py-0.5 text-xs rounded bg-slate-800 text-slate-400">
              +{countryCodes.length - 20} more
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

function InvestigationTimeline({ firstDetected, lastActive, daysActive, adCreatives, platformName }: {
  firstDetected: string;
  lastActive: string;
  daysActive: number;
  adCreatives: number;
  platformName: string;
}) {
  const milestones: { date: string; label: string; description: string }[] = [];

  if (firstDetected) {
    milestones.push({ date: firstDetected, label: "First Detected", description: `${platformName} first appeared in ad surveillance systems` });
  }

  if (daysActive > 30) {
    milestones.push({ date: `Day 30`, label: "Campaign Established", description: "Scam campaign passed the 30-day mark, indicating sustained operation" });
  }

  if (adCreatives > 100) {
    milestones.push({ date: `${adCreatives}+ ads`, label: "Mass Ad Deployment", description: `Over ${adCreatives.toLocaleString()} unique ad creatives deployed across platforms` });
  }

  if (daysActive > 90) {
    milestones.push({ date: `Day ${daysActive}`, label: "Extended Operation", description: `Campaign has been active for ${daysActive} days — highly persistent threat` });
  }

  if (lastActive) {
    milestones.push({ date: lastActive, label: "Last Active", description: "Most recent confirmed ad activity detected" });
  }

  if (milestones.length === 0) return null;

  return (
    <section>
      <SectionTitle icon={<Clock className="h-6 w-6" />}>Investigation Timeline</SectionTitle>
      <div className="relative pl-8">
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-red-600 via-orange-500 to-amber-500" />
        <div className="space-y-6">
          {milestones.map((m, i) => (
            <div key={i} className="relative">
              <div className="absolute -left-8 top-1 w-5 h-5 rounded-full bg-slate-950 border-2 border-red-500 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-red-500" />
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-xs">{m.date}</Badge>
                </div>
                <h4 className="text-white font-semibold text-sm">{m.label}</h4>
                <p className="text-slate-400 text-xs mt-1">{m.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ShareWidget({ platformName }: { platformName: string }) {
  const [copied, setCopied] = useState<string | null>(null);

  const pageUrl = typeof window !== "undefined" ? window.location.href : "";

  const embedCode = `<a href="${pageUrl}" style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#1e1b2e;border:1px solid #dc2626;border-radius:8px;color:#fca5a5;font-size:13px;text-decoration:none;font-family:system-ui"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>${platformName} — Confirmed Scam</a>`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Share2 className="h-5 w-5 text-slate-400" />
        <span className="text-sm font-bold text-white">Share This Investigation</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={() => copyToClipboard(`${platformName} is a confirmed crypto scam. Read the full investigation: ${pageUrl}`, "twitter")}
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm text-slate-300 transition-colors"
        >
          <Twitter className="h-4 w-4" /> {copied === "twitter" ? "Copied!" : "Twitter"}
        </button>
        <button
          onClick={() => copyToClipboard(`Check out this scam investigation on ${platformName}: ${pageUrl}`, "facebook")}
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm text-slate-300 transition-colors"
        >
          <Facebook className="h-4 w-4" /> {copied === "facebook" ? "Copied!" : "Facebook"}
        </button>
      </div>
      <button
        onClick={() => copyToClipboard(pageUrl, "link")}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm text-slate-300 transition-colors mb-2"
      >
        <Copy className="h-4 w-4" />
        {copied === "link" ? "Copied!" : "Copy Link"}
      </button>
      <button
        onClick={() => copyToClipboard(embedCode, "embed")}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-red-950/30 hover:bg-red-950/50 border border-red-900/40 text-sm text-red-300 transition-colors"
      >
        <Code className="h-4 w-4" />
        {copied === "embed" ? "Copied!" : "Copy Warning Badge"}
      </button>
    </div>
  );
}

function RelatedScams({ slug }: { slug: string }) {
  const { data: related } = useGetRelatedReviews(slug);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!related || related.length === 0) return null;

  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-red-500";
    if (s >= 60) return "text-orange-400";
    return "text-amber-400";
  };

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 320;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <section className="mb-16">
      <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-3">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <span className="text-red-500"><ShieldAlert className="h-6 w-6" /></span>
          Related Scam Investigations
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => scroll("left")}
            className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-slate-700 transition-colors text-slate-400"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-slate-700 transition-colors text-slate-400"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {related.map((r) => (
          <Link key={r.id} href={`/review/${r.slug}`}>
            <div className="w-[280px] shrink-0 snap-start rounded-xl bg-slate-900/60 border border-slate-800 p-5 hover:border-red-900/50 hover:bg-slate-900 transition-all cursor-pointer group">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-white font-bold text-base group-hover:text-red-400 transition-colors truncate mr-2">{r.platformName}</h3>
                <span className={`text-2xl font-black ${getScoreColor(r.threatScore)} shrink-0`}>{r.threatScore}</span>
              </div>
              <p className="text-slate-400 text-xs mb-3 line-clamp-2">{r.verdict || "Under investigation"}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{r.adCreatives.toLocaleString()} ads tracked</span>
                <span className="text-xs text-red-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  View <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ReviewSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
        <Skeleton className="h-8 w-64 bg-slate-800" />
        <Skeleton className="h-20 w-full bg-slate-800" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 bg-slate-800 rounded-xl" />)}
        </div>
        <Skeleton className="h-48 bg-slate-800 rounded-xl" />
        <Skeleton className="h-64 bg-slate-800 rounded-xl" />
      </div>
    </div>
  );
}

function NotFoundPage({ slug }: { slug: string }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <AlertOctagon className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-white mb-2">Review Not Found</h1>
        <p className="text-slate-400">No investigation data found for "{slug}".</p>
      </div>
    </div>
  );
}

function ReviewContent({ slug }: { slug: string }) {
  const { data: review, isLoading, error } = useGetReview(slug);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const jsonLd = useMemo(() => {
    if (!review) return undefined;

    const org = {
      "@type": "Organization",
      name: "CryptoKiller",
      url: "https://cryptokiller.org",
      logo: "https://cryptokiller.org/favicon.svg",
    };

    const pageUrl = `https://cryptokiller.org/review/${slug}`;

    const desc = review.metaDescription || review.verdict || `Investigation of ${review.platformName} crypto scam.`;
    const orgRef = { "@id": `${pageUrl}#org` };
    const itemRef = { "@id": `${pageUrl}#platform` };

    const graph: Record<string, unknown>[] = [
      {
        "@type": "Organization",
        "@id": `${pageUrl}#org`,
        name: "CryptoKiller",
        url: "https://cryptokiller.org",
        logo: "https://cryptokiller.org/favicon.svg",
      },
      {
        "@type": "WebSite",
        "@id": "https://cryptokiller.org/#website",
        name: "CryptoKiller",
        url: "https://cryptokiller.org",
        publisher: orgRef,
      },
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: `${review.platformName} Review — ${review.threatScore}/100 Threat Score`,
        description: desc,
        isPartOf: { "@id": "https://cryptokiller.org/#website" },
        mainEntity: { "@id": `${pageUrl}#review` },
        inLanguage: "en",
        datePublished: review.investigationDate,
        dateModified: review.investigationDate,
      },
      {
        "@type": "Thing",
        "@id": `${pageUrl}#platform`,
        name: review.platformName,
        description: `Crypto platform under investigation by CryptoKiller`,
      },
      {
        "@type": "Review",
        "@id": `${pageUrl}#review`,
        name: `${review.platformName} Review — CryptoKiller Investigation`,
        headline: `${review.platformName} — ${review.threatScore}/100 Threat Score`,
        description: desc,
        url: pageUrl,
        author: orgRef,
        publisher: orgRef,
        datePublished: review.investigationDate,
        dateModified: review.investigationDate,
        mainEntityOfPage: { "@id": `${pageUrl}#webpage` },
        inLanguage: "en",
        itemReviewed: itemRef,
        reviewRating: {
          "@type": "Rating",
          ratingValue: review.threatScore,
          bestRating: 100,
          worstRating: 0,
          ratingExplanation: `Threat score of ${review.threatScore}/100 — ${review.verdict || "Under investigation"}`,
        },
        reviewBody: review.heroDescription || review.verdict || "",
      },
      {
        "@type": "Article",
        "@id": `${pageUrl}#article`,
        headline: `${review.platformName} Review — ${review.threatScore}/100 Threat Score`,
        description: desc,
        url: pageUrl,
        author: { "@type": "Organization", name: "CryptoKiller Research Team", url: "https://cryptokiller.org/about" },
        publisher: orgRef,
        datePublished: review.investigationDate,
        dateModified: review.investigationDate,
        mainEntityOfPage: { "@id": `${pageUrl}#webpage` },
        isPartOf: { "@id": "https://cryptokiller.org/#website" },
        about: itemRef,
        inLanguage: "en",
        wordCount: review.wordCount || undefined,
        timeRequired: review.readingMinutes ? `PT${review.readingMinutes}M` : undefined,
      },
      {
        "@type": "NewsArticle",
        "@id": `${pageUrl}#newsarticle`,
        headline: `${review.platformName} Scam Investigation`,
        description: `Is ${review.platformName} a scam? CryptoKiller investigation with threat score, ad evidence, and victim reports.`,
        url: pageUrl,
        author: { "@type": "Organization", name: "CryptoKiller Research Team", url: "https://cryptokiller.org/about" },
        publisher: { "@id": "https://cryptokiller.org/#organization" },
        datePublished: review.investigationDate,
        dateModified: review.investigationDate,
        mainEntityOfPage: `https://cryptokiller.org/review/${slug}`,
        inLanguage: "en",
      },
    ];

    graph.push(breadcrumbJsonLd([
      { label: "Home", href: "https://cryptokiller.org/" },
      { label: "Scam Investigations", href: "https://cryptokiller.org/investigations" },
      { label: review.platformName, href: pageUrl },
    ]));

    if (review.faqItems && review.faqItems.length > 0) {
      const faqNode = {
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        url: pageUrl,
        mainEntityOfPage: { "@id": `${pageUrl}#webpage` },
        mainEntity: review.faqItems.map((faq: { question: string; answer: string }) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      };
      graph.push(faqNode);
      const webPage = graph[2] as Record<string, unknown>;
      webPage.hasPart = { "@id": `${pageUrl}#faq` };
    }

    if (review.redFlags && review.redFlags.length > 0) {
      const reviewNode = graph[4] as Record<string, unknown>;
      reviewNode.negativeNotes = {
        "@type": "ItemList",
        itemListElement: review.redFlags.map((rf: { title: string; description: string }, i: number) => ({
          "@type": "ListItem",
          position: i + 1,
          name: rf.title,
          description: rf.description,
        })),
      };
    }

    return {
      "@context": "https://schema.org",
      "@graph": graph,
    };
  }, [review, slug]);

  const seoTitle = review
    ? (`${review.platformName} Scam Review — Threat Score ${review.threatScore}/100 | CryptoKiller`.length <= 60
        ? `${review.platformName} Scam Review — Threat Score ${review.threatScore}/100 | CryptoKiller`
        : `${review.platformName} Scam Review | CryptoKiller`)
    : error
      ? "Investigation Not Found | CryptoKiller"
      : "Loading Investigation | CryptoKiller";

  const seoDescription = review
    ? (review.metaDescription || `Is ${review.platformName} a scam? CryptoKiller investigation reveals threat score ${review.threatScore}/100, ${review.adCreatives.toLocaleString()}+ scam ad creatives detected across ${review.countriesTargeted} countries. Evidence inside.`.slice(0, 155))
    : error
      ? `No investigation data found for "${slug}". Browse all crypto scam investigations on CryptoKiller.`
      : "Loading crypto scam investigation...";

  usePageMeta({
    title: seoTitle,
    description: seoDescription,
    canonical: `https://cryptokiller.org/review/${slug}`,
    ogType: "article",
    jsonLd,
    author: "CryptoKiller Research Team — cryptokiller.org",
  });


  if (isLoading) return <ReviewSkeleton />;
  if (error || !review) return <NotFoundPage slug={slug} />;

  const formattedDate = new Date(review.investigationDate).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-red-900 selection:text-white">

      <SiteHeader activeNav="investigations" />

      <main className="container mx-auto px-4 py-8 max-w-6xl">

        {/* BREADCRUMB */}
        <Breadcrumbs items={[
          { label: "Home", href: "/" },
          { label: "Scam Investigations", href: "/investigations" },
          { label: review.platformName },
        ]} />

        {/* HERO */}
        <div className="mb-10">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white">{review.platformName}</h1>
            <Badge className="bg-red-600 text-white text-sm px-3 py-1.5 uppercase tracking-widest border-0 flex items-center gap-1.5 shrink-0">
              <ShieldAlert className="h-4 w-4" />
              CONFIRMED SCAM
            </Badge>
          </div>

          <p className="text-lg text-slate-300 max-w-4xl leading-relaxed mb-6"
            dangerouslySetInnerHTML={{ __html: review.heroDescription.replace(
              /(\d[\d,]+)\s*(ad creatives|fraudulent advertisements|threat score|countries|days|celebrities)/gi,
              '<strong class="text-white">$&</strong>'
            ).replace(/\d+\/100 threat score/gi, '<span class="text-red-400 font-bold">$&</span>') }}
          />

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-400 mb-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span>Published: {formattedDate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-green-600" />
              <span>Last verified: {formattedDate}</span>
            </div>
            {(review.wordCount > 0 || review.readingMinutes > 0) && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-500" />
              <span>{review.wordCount.toLocaleString()} words · {review.readingMinutes} min read</span>
            </div>
            )}
            <div className="flex items-center gap-1.5">
              <User className="h-4 w-4 text-slate-500" />
              <span>CryptoKiller Research Team · <a href="/about" className="text-red-400 hover:text-red-300 transition-colors">Methodology ↗</a></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-slate-500" />
              <span>CryptoKiller Ad Surveillance</span>
            </div>
          </div>

          <div className="mb-8 space-y-1.5">
            <p className="text-xs text-slate-500">
              Reviewed by our editorial team · Methodology:{" "}
              <a href="/about" className="text-slate-400 hover:text-slate-200 underline decoration-dotted underline-offset-2 transition-colors">
                cryptokiller.org/methodology
              </a>
            </p>
            <p className="text-xs text-slate-500">
              All threat scores are based on verifiable ad evidence from Meta Ad Library and Google Ads Transparency.{" "}
              <a href="/about" className="text-red-400 hover:text-red-300 font-semibold transition-colors">
                How we investigate →
              </a>
            </p>
          </div>

          {/* KEY STATS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
            {[
              { icon: <BarChart2 className="h-6 w-6 text-red-500" />, bg: "bg-red-500/10", label: "Ad Creatives", value: review.adCreatives.toLocaleString() },
              { icon: <Globe className="h-6 w-6 text-amber-500" />, bg: "bg-amber-500/10", label: "Countries Targeted", value: review.countriesTargeted.toString() },
              { icon: <Clock className="h-6 w-6 text-orange-400" />, bg: "bg-orange-500/10", label: "Days Active", value: review.daysActive.toString() },
              { icon: <User className="h-6 w-6 text-blue-400" />, bg: "bg-blue-500/10", label: "Celebrities Abused", value: review.celebritiesAbused.toString() },
            ].map((s, i) => (
              <Card key={i} className="bg-slate-900/60 border-slate-800">
                <CardContent className="p-5 flex items-center gap-3">
                  <div className={`${s.bg} p-3 rounded-full shrink-0`}>{s.icon}</div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">{s.label}</p>
                    <p className="text-2xl font-black text-white">{s.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* VELOCITY WIDGET */}
        <div className="mb-8">
          <VelocityWidget velocity={review.weeklyVelocity} platformName={review.platformName} />
        </div>

        {/* KEY TAKEAWAYS */}
        {review.summary && review.summary.trim().length > 0 && (
        <div className="mb-12 bg-red-950/20 border border-red-900/40 rounded-xl p-6">
          <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
            <AlertOctagon className="h-5 w-5" /> Key Takeaways
          </h3>
          <ul className="space-y-3">
            {review.summary.split("\n").filter(Boolean).map((point, i) => (
              <li key={i} className="flex gap-3 items-start text-sm text-slate-300 leading-relaxed">
                <X className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                {point}
              </li>
            ))}
          </ul>
        </div>
        )}

        {/* MAIN 2-COL GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-14">

          {/* LEFT: content */}
          <div className="lg:col-span-2 space-y-14">

            {/* INVESTIGATION SUMMARY */}
            <section>
              <SectionTitle icon={<FileText className="h-6 w-6" />}>Investigation Summary</SectionTitle>
              {review.heroDescription.split("\n\n").map((para, i) => (
                <p key={i} className="text-slate-300 leading-relaxed mb-4">{para}</p>
              ))}
              {review.warningCallout && (
                <div className="bg-slate-900 border border-red-900/50 rounded-lg p-4 mt-4">
                  <p className="text-red-300 text-sm font-semibold leading-relaxed">
                    ⚠️ {review.warningCallout}
                  </p>
                </div>
              )}
            </section>

            {/* HOW THIS SCAM WORKS */}
            {review.funnelStages.length > 0 && (
              <section>
                <SectionTitle icon={<Microscope className="h-6 w-6" />}>How This Scam Works</SectionTitle>
                <p className="text-slate-400 text-sm mb-8">
                  {review.platformName} deploys a <span className="text-white font-semibold">four-stage confidence scheme</span> targeting retail investors. Each stage advances the victim deeper into the trap.
                </p>

                <div className="relative">
                  <div className="absolute left-[27px] top-12 bottom-12 w-0.5 bg-gradient-to-b from-orange-600 via-red-600 to-red-900 hidden md:block" />
                  <div className="space-y-4">
                    {review.funnelStages.map((stage, i) => {
                      const cfg = stageConfig[i] ?? stageConfig[3];
                      return (
                        <div key={i} className={`relative flex gap-0 md:gap-6 rounded-2xl ${cfg.bgCard} border ${cfg.border} overflow-hidden`}>
                          <div className={`hidden md:block w-1 shrink-0 ${cfg.iconBg} opacity-60`} />
                          <div className="flex-1 p-6">
                            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                              <div className="flex items-center gap-3 sm:flex-col sm:items-center sm:gap-1 shrink-0">
                                <div className={`w-10 h-10 rounded-xl ${cfg.iconBg} flex items-center justify-center text-white shadow-lg shrink-0`}>
                                  {cfg.icon}
                                </div>
                                <span className={`text-xs font-black uppercase tracking-widest ${cfg.labelColor} sm:text-center`}>
                                  Stage {stage.stageNumber}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-white text-lg leading-snug mb-4">{stage.title}</h3>
                                <ul className="space-y-2.5 mb-4">
                                  {stage.bullets.map((bullet, bi) => (
                                    <li key={bi} className="flex items-start gap-2.5 text-sm text-slate-300 leading-relaxed">
                                      <div className={`mt-1.5 w-1.5 h-1.5 rounded-full ${cfg.iconBg} shrink-0`} />
                                      {bullet}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              {stage.statValue && (
                                <div className={`shrink-0 rounded-xl border ${cfg.border} bg-slate-950/50 px-4 py-3 text-center min-w-[110px]`}>
                                  <p className={`text-xl font-black ${cfg.labelColor} leading-tight`}>{stage.statValue}</p>
                                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">{stage.statLabel}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* RED FLAGS */}
            {review.redFlags.length > 0 && (
              <section>
                <SectionTitle icon={<Flag className="h-6 w-6" />}>Red Flags</SectionTitle>
                <div className="space-y-4">
                  {review.redFlags.map((flag, i) => (
                    <div key={i} className="rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden">
                      <div className="flex items-start gap-4 p-5">
                        <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-red-950/60 border border-red-900/60 text-base">
                          {flag.emoji}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Red Flag {i + 1}</span>
                          </div>
                          <h3 className="font-bold text-white text-base mb-2">{flag.title}</h3>
                          <p className="text-slate-400 text-sm leading-relaxed">{flag.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* KEY FINDINGS */}
            {review.keyFindings.length > 0 && (
              <section>
                <SectionTitle icon={<Microscope className="h-6 w-6" />}>Key Investigation Findings</SectionTitle>
                <div className="space-y-4">
                  {review.keyFindings.map((finding, i) => (
                    <div key={i} className="flex gap-3 items-start p-4 rounded-lg bg-slate-900/40 border border-slate-800/50">
                      <div className="shrink-0 mt-0.5 w-5 h-5 rounded bg-amber-950/60 border border-amber-800/50 flex items-center justify-center">
                        <span className="text-amber-400 text-xs font-bold">{i + 1}</span>
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed">{finding.content}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* CELEBRITY GALLERY */}
            <CelebrityGallery names={review.celebrityNames} />

            {/* WORLD MAP */}
            <WorldMap countryCodes={review.allCountryCodes} />

            {/* INVESTIGATION TIMELINE */}
            <InvestigationTimeline
              firstDetected={review.firstDetected}
              lastActive={review.lastActive}
              daysActive={review.daysActive}
              adCreatives={review.adCreatives}
              platformName={review.platformName}
            />

            {/* WHAT TO DO */}
            <section>
              <SectionTitle icon={<CheckCircle className="h-6 w-6" />}>What To Do If You've Been Scammed</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: <FileText className="h-5 w-5 text-blue-400" />, title: "Report to the FBI IC3", sub: "ic3.gov", bg: "bg-blue-500/10", border: "border-blue-900/30" },
                  { icon: <Scale className="h-5 w-5 text-purple-400" />, title: "File an FTC complaint", sub: "reportfraud.ftc.gov", bg: "bg-purple-500/10", border: "border-purple-900/30" },
                  { icon: <Phone className="h-5 w-5 text-green-400" />, title: "Contact your bank immediately", sub: "Attempt a chargeback", bg: "bg-green-500/10", border: "border-green-900/30" },
                  { icon: <Lock className="h-5 w-5 text-amber-400" />, title: "Change all related passwords", sub: "Secure your accounts", bg: "bg-amber-500/10", border: "border-amber-900/30" },
                  { icon: <BookOpen className="h-5 w-5 text-sky-400" />, title: "Document everything", sub: "Screenshots, emails, transactions", bg: "bg-sky-500/10", border: "border-sky-900/30" },
                  { icon: <MapPin className="h-5 w-5 text-orange-400" />, title: "Report to local police", sub: "Needed for insurance claims", bg: "bg-orange-500/10", border: "border-orange-900/30" },
                ].map((step, i) => (
                  <div key={i} className={`flex items-center gap-4 p-4 rounded-xl ${step.bg} border ${step.border}`}>
                    <div className="shrink-0">{step.icon}</div>
                    <div>
                      <p className="text-white font-semibold text-sm">{step.title}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{step.sub}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-600 ml-auto shrink-0" />
                  </div>
                ))}
              </div>
            </section>

            {/* FAQ */}
            {review.faqItems.length > 0 && (
              <section>
                <SectionTitle icon={<BookOpen className="h-6 w-6" />}>Frequently Asked Questions</SectionTitle>
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
                  {review.faqItems.map((faq, i) => (
                    <div key={i} className="bg-slate-900/50">
                      <button
                        className="w-full text-left flex items-center justify-between gap-4 p-5 hover:bg-slate-800/40 transition-colors"
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      >
                        <span className="font-semibold text-white text-sm">{faq.question}</span>
                        {openFaq === i
                          ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                          : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
                      </button>
                      {openFaq === i && (
                        <div className="px-5 pb-5">
                          <p className="text-slate-400 text-sm leading-relaxed">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* METHODOLOGY */}
            {review.methodologyText && (
              <section>
                <SectionTitle icon={<Microscope className="h-6 w-6" />}>Our Investigation Methodology</SectionTitle>
                {review.methodologyText.split("\n\n").map((para, i) => (
                  <p key={i} className="text-slate-400 text-sm leading-relaxed mb-4">{para}</p>
                ))}
              </section>
            )}

          </div>

          {/* RIGHT SIDEBAR */}
          <div className="space-y-6">
            <Card className="bg-slate-900 border-slate-800 lg:sticky lg:top-20">
              <CardHeader className="pb-4 border-b border-slate-800">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-red-500" /> Threat Score
                </CardTitle>
                <ThreatGauge score={review.threatScore} />
              </CardHeader>

              <CardContent className="pt-4 pb-0 px-0">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-4 mb-2">Threat Intelligence</p>
                <div className="divide-y divide-slate-800">
                  {[
                    { label: "Ad Creatives", value: review.adCreatives.toLocaleString() },
                    { label: "Countries", value: review.countriesTargeted.toString() },
                    { label: "Celebrities Abused", value: review.celebritiesAbused.toString() },
                    { label: "7-Day Velocity", value: `${review.weeklyVelocity} new creatives` },
                    { label: "Campaign Duration", value: `${review.daysActive} days` },
                    { label: "First Detected", value: review.firstDetected },
                    { label: "Last Active", value: review.lastActive },
                    {
                      label: "Status",
                      value: (
                        <span className="text-red-400 font-bold flex items-center gap-1 justify-end">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                          Active Scam
                        </span>
                      )
                    },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between items-center px-4 py-2.5 hover:bg-slate-800/40 transition-colors">
                      <span className="text-slate-400 text-xs">{row.label}</span>
                      <span className="text-slate-200 text-xs font-semibold text-right">{row.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>

              {review.geoTargets.length > 0 && (
                <CardContent className="pt-4 pb-4 px-0">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-4 mb-2">Geographic Targeting</p>
                  <div className="divide-y divide-slate-800">
                    {review.geoTargets.map((geo, i) => (
                      <div key={i} className="flex justify-between items-center px-4 py-2 hover:bg-slate-800/40 transition-colors">
                        <span className="text-slate-300 text-xs font-medium">{geo.region}</span>
                        <span className="text-slate-500 text-xs">{geo.countryCodes}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}

              <CardContent className="pt-0 pb-4 px-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Regulatory Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {["FCA", "SEC", "ASIC", "CySEC"].map((r) => (
                    <div key={r} className="flex items-center gap-1.5 bg-red-950/30 border border-red-900/40 rounded px-2 py-1.5">
                      <X className="h-3 w-3 text-red-500" />
                      <span className="text-xs text-red-300 font-semibold">{r}: None</span>
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter className="border-t border-slate-800 pt-4 pb-4 block">
                <p className="text-xs text-slate-500 mb-3">Reviewed by CryptoKiller Research Team · <a href="/about" className="text-red-400 hover:text-red-300 transition-colors">Methodology ↗</a></p>
                <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold" size="sm">
                  Report Your Experience
                </Button>
              </CardFooter>
            </Card>

            {/* FINAL VERDICT */}
            <Card className="bg-red-950/30 border-red-800/50">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertOctagon className="h-5 w-5 text-red-400" />
                  <span className="text-red-400 font-bold text-sm uppercase tracking-wide">Final Verdict</span>
                </div>
                <p className="text-white font-semibold text-base mb-1">{review.platformName} is a confirmed crypto scam.</p>
                <p className="text-red-300 font-bold">{review.verdict}</p>
                <Separator className="bg-red-900/40 my-3" />
                <p className="text-slate-400 text-xs">Based on analysis of {review.adCreatives.toLocaleString()} ad creatives across {review.countriesTargeted} countries.</p>
              </CardContent>
            </Card>

            {/* SHARE WIDGET */}
            <ShareWidget platformName={review.platformName} />

            {/* SOURCES */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-sm text-slate-300">Sources & References</CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-2">
                {[
                  { label: "FCA Warning List", url: "fca.org.uk" },
                  { label: "SEC EDGAR Search", url: "sec.gov" },
                  { label: "ASIC Moneysmart", url: "moneysmart.gov.au" },
                  { label: "FBI IC3", url: "ic3.gov" },
                  { label: "FTC Report Fraud", url: "reportfraud.ftc.gov" },
                  { label: "Action Fraud UK", url: "actionfraud.police.uk" },
                  { label: "CySEC Warning List", url: "cysec.org.cy" },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 cursor-pointer transition-colors">
                    <ExternalLink className="h-3 w-3 text-slate-600 shrink-0" />
                    <span>{s.label}</span>
                    <span className="text-slate-600 text-xs ml-auto">{s.url}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* RELATED SCAMS CAROUSEL */}
        <RelatedScams slug={slug} />

        {/* CTA */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-10 text-center mb-16 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-orange-500 to-amber-500" />
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4 opacity-80" />
          <h2 className="text-3xl font-bold text-white mb-3">Were You Targeted by {review.platformName}?</h2>
          <p className="text-slate-400 max-w-2xl mx-auto mb-8 text-base leading-relaxed">
            Your report helps warn others and builds the evidence trail against this operation. If you've lost money, act quickly — chargebacks are time-sensitive.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <a href="/report" className="inline-flex items-center justify-center rounded-md text-sm font-bold h-11 px-8 bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto transition-colors">
              Report Your Experience
            </a>
            <a href="/recovery" className="inline-flex items-center justify-center rounded-md text-sm font-medium h-11 px-8 border border-slate-600 text-slate-200 hover:bg-slate-800 w-full sm:w-auto transition-colors">
              Get Recovery Guidance
            </a>
          </div>
          <p className="text-xs text-slate-500 max-w-xl mx-auto">
            ⚠️ Beware of "recovery agents" who contact you promising to retrieve your money for an upfront fee. These are often secondary scams targeting victims.
          </p>
        </div>

        {/* DISCLAIMER */}
        {review.disclaimerText && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 mb-10 text-xs text-slate-500 leading-relaxed">
            <p className="font-bold text-slate-400 mb-2">Important Disclaimer</p>
            <p>{review.disclaimerText}</p>
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-950 py-10">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-6">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-slate-600" />
              <span className="text-lg font-bold text-slate-400">
                Crypto<span className="text-slate-600">Killer</span>
              </span>
              <span className="text-slate-600 text-sm">Scam Intelligence</span>
            </div>
            <div className="flex flex-wrap justify-center gap-5 text-sm text-slate-500">
              <a href="/recovery" className="hover:text-white transition-colors">Recovery Guide</a>
              <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="/api/sitemap.xml" className="hover:text-white transition-colors">Sitemap</a>
            </div>
          </div>
          <Separator className="bg-slate-800 mb-6" />
          <p className="text-xs text-slate-600 text-center leading-relaxed max-w-4xl mx-auto">
            © 2026 CryptoKiller. All rights reserved. CryptoKiller provides investigation reports for informational purposes only.
          </p>
        </div>
      </footer>

    </div>
  );
}

export default function ReviewPage() {
  const params = useParams<{ slug?: string }>();
  const slug = params.slug ?? "quantum-ai";
  return <ReviewContent slug={slug} />;
}
