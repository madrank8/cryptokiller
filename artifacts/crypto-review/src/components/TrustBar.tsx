const referencedBy = ["FBI IC3", "FTC", "Chainalysis", "DFPI California", "Europol"];
const adSources = ["Meta Ad Library", "Google Ads Transparency", "TikTok Ad Center", "Telegram", "YouTube"];

function BadgeRow({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="flex items-center gap-4 min-w-0">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 shrink-0 w-[160px] text-right hidden md:block">
        {label}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 shrink-0 md:hidden">
        {label}
      </span>
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {items.map((item) => (
          <span
            key={item}
            className="shrink-0 text-xs text-slate-400 font-medium border border-slate-700/60 rounded-full px-3 py-1 hover:-translate-y-0.5 transition-transform cursor-default"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function TrustBar() {
  return (
    <div className="bg-slate-900/60 border-y border-slate-800">
      <div className="container mx-auto px-4 max-w-6xl py-6 space-y-3">
        <BadgeRow label="Intelligence Referenced By" items={referencedBy} />
        <BadgeRow label="Ad Data Sources" items={adSources} />
      </div>
      <div className="border-t border-slate-800/60 py-3">
        <p className="text-center text-[12px] text-slate-500">
          CryptoKiller cannot be paid to remove or modify scam listings. Our threat scores are editorially independent.
        </p>
      </div>
    </div>
  );
}
