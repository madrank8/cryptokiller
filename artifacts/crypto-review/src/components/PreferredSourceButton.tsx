export default function PreferredSourceButton({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <a href="https://google.com/preferences/source?q=cryptokiller.org"
         target="_blank" rel="noopener"
         aria-label="Add CryptoKiller as a preferred source on Google"
         className="inline-block rounded-lg transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-500/50">
        <img src="/google-preferred-source.png" alt="Add CryptoKiller as a preferred source on Google"
             width={152} height={48}
             style={{ height: 48, width: "auto", display: "block", border: 0 }} loading="lazy" />
      </a>
      <p className="text-xs text-slate-500 text-center max-w-xs">
        Prioritize CryptoKiller&apos;s scam investigations in your Google results.
      </p>
    </div>
  );
}
