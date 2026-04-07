import { Check, Mail, FileText, AlertCircle } from "lucide-react";

const standards = [
  "Every investigation is authored by a named analyst",
  "Threat scores are based on verifiable ad evidence, never paid placements",
  "Corrections published within 24 hours with full changelog",
];

const authorities = [
  { name: "FBI IC3", href: "https://ic3.gov" },
  { name: "FTC", href: "https://reportfraud.ftc.gov" },
  { name: "CISA", href: "https://cisa.gov" },
  { name: "Your local financial regulator" },
];

export default function EditorialBand() {
  return (
    <section className="border-t border-slate-800 bg-slate-900/40 py-14">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-slate-500" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Editorial Standards
              </p>
            </div>
            <h3 className="text-lg font-bold text-white mb-4">Our Standards</h3>
            <ul className="space-y-3 mb-5">
              {standards.map((s) => (
                <li key={s} className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-400 leading-relaxed">{s}</span>
                </li>
              ))}
            </ul>
            <a
              href="/methodology"
              className="text-sm text-slate-400 hover:text-white font-medium transition-colors"
            >
              Read Full Methodology →
            </a>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-4 w-4 text-slate-500" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Corrections
              </p>
            </div>
            <h3 className="text-lg font-bold text-white mb-4">Found an Error?</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-5">
              If a listing is incorrect, contact our editorial team. We review all disputes and publish corrections transparently.
            </p>
            <a
              href="mailto:corrections@cryptokiller.org"
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              <Mail className="h-4 w-4" />
              corrections@cryptokiller.org
            </a>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-4 w-4 text-slate-500" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Legal Disclaimer
              </p>
            </div>
            <h3 className="text-lg font-bold text-white mb-4">Important Notice</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-5">
              CryptoKiller content is for informational purposes only and does not constitute legal or financial advice. Threat scores reflect available evidence at time of publication.
            </p>
            <a
              href="/terms"
              className="text-sm text-slate-400 hover:text-white font-medium transition-colors"
            >
              Full Disclaimer →
            </a>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-5 text-center">
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Report crypto fraud to official authorities:{" "}
            {authorities.map((a, i) => (
              <span key={a.name}>
                {i > 0 && " · "}
                {a.href ? (
                  <a
                    href={a.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-500 hover:text-slate-300 underline decoration-dotted underline-offset-2 transition-colors"
                  >
                    {a.name}
                  </a>
                ) : (
                  <span>{a.name}</span>
                )}
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  );
}
