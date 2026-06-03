import { Landmark, Radar, ShieldCheck } from "lucide-react";

// Public authorities and intelligence organisations whose reports + warning
// lists CryptoKiller investigations reference. Wording deliberately reads
// "Public Sources We Reference" (not "Referenced By", which read ambiguously
// as endorsement) — these orgs do not endorse CryptoKiller; we cite their
// publicly available reports in our investigations and recovery guides.
const referencedBy = ["FBI IC3", "FTC", "Chainalysis", "DFPI California", "Europol"];
const adSources = ["Meta Ad Library", "Google Ads Transparency", "TikTok Ad Center", "Telegram", "YouTube"];

type Accent = "emerald" | "sky";

const accentStyles: Record<Accent, { dot: string; iconWrap: string; icon: string; chipHover: string }> = {
  emerald: {
    dot: "bg-emerald-400",
    iconWrap: "bg-emerald-500/10 ring-1 ring-emerald-500/20",
    icon: "text-emerald-400",
    chipHover: "hover:border-emerald-500/40 hover:bg-emerald-500/[0.06]",
  },
  sky: {
    dot: "bg-sky-400",
    iconWrap: "bg-sky-500/10 ring-1 ring-sky-500/20",
    icon: "text-sky-400",
    chipHover: "hover:border-sky-500/40 hover:bg-sky-500/[0.06]",
  },
};

function SourceCard({
  label,
  items,
  icon: Icon,
  accent,
}: {
  label: string;
  items: string[];
  icon: typeof Landmark;
  accent: Accent;
}) {
  const a = accentStyles[accent];
  return (
    <div className="group relative rounded-2xl border border-slate-800 bg-slate-950/40 p-5 transition-colors hover:border-slate-700">
      <div className="mb-4 flex items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${a.iconWrap}`}>
          <Icon className={`h-[18px] w-[18px] ${a.icon}`} strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-300">{label}</h3>
          <p className="text-[11px] text-slate-500">
            {items.length} source{items.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li
            key={item}
            className={`inline-flex min-h-[28px] items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/50 px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:-translate-y-0.5 ${a.chipHover}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${a.dot}`} aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function TrustBar() {
  return (
    <div className="relative border-y border-slate-800 bg-slate-900/60">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(60% 80% at 15% 0%, rgba(16,185,129,0.06), transparent 60%), radial-gradient(60% 80% at 85% 100%, rgba(56,189,248,0.06), transparent 60%)",
        }}
        aria-hidden="true"
      />
      <div className="container relative mx-auto max-w-6xl px-4 py-8">
        <div className="mb-5 flex items-center gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Trusted Intelligence
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-slate-700/70 to-transparent" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <SourceCard label="Public Sources We Reference" items={referencedBy} icon={Landmark} accent="emerald" />
          <SourceCard label="Ad Data Sources" items={adSources} icon={Radar} accent="sky" />
        </div>

        <div className="mt-5 flex items-center justify-center gap-2.5 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] px-4 py-3">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" strokeWidth={2} aria-hidden="true" />
          <p className="text-center text-[12px] text-slate-400">
            <span className="font-semibold text-slate-300">Editorially independent.</span>{" "}
            CryptoKiller cannot be paid to remove or modify scam listings.
          </p>
        </div>
      </div>
    </div>
  );
}
