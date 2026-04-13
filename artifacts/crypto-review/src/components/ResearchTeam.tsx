import { Link } from "wouter";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { WRITER_PERSONAS } from "@/lib/writerPersonas";

const analysts = Object.values(WRITER_PERSONAS);

export default function ResearchTeam() {
  return (
    <section className="py-20 border-t border-slate-800">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 block">
            The Analysts
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-3">
            Real Investigators. Real Accountability.
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Every investigation on CryptoKiller is authored by a named analyst — never anonymous AI output.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {analysts.map((a) => (
            <Link
              key={a.slug}
              href={`/author/${a.slug}`}
              className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-slate-600 hover:-translate-y-1 transition-all duration-200 block"
            >
              <div className="flex items-center gap-4 mb-5">
                <div
                  className={`${a.avatarBg} w-12 h-12 rounded-full flex items-center justify-center shrink-0`}
                >
                  <span className="text-white font-bold text-sm tracking-wide">
                    {a.initials}
                  </span>
                </div>
                <div>
                  <h3 className="text-white font-bold text-base leading-tight">{a.name}</h3>
                  <p className="text-slate-400 text-xs">{a.role}</p>
                </div>
              </div>

              <p className="text-slate-500 text-xs font-mono leading-relaxed mb-3">
                {a.credentials}
              </p>

              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                {a.bio}
              </p>

              <div className="flex flex-wrap gap-1.5 mb-5">
                {a.specialties.map((s) => (
                  <span
                    key={s}
                    className="text-[11px] text-slate-400 font-medium border border-slate-700/60 rounded-full px-2.5 py-0.5"
                  >
                    {s}
                  </span>
                ))}
              </div>

              <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  <span className="text-white font-semibold">{a.published}</span>
                </p>
                <span className="text-xs text-red-400 font-semibold inline-flex items-center gap-1">
                  View profile <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="flex items-start gap-2.5 justify-center mb-8 max-w-2xl mx-auto">
          <ShieldCheck className="h-4 w-4 text-slate-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-600 leading-relaxed text-center">
            Analyst profiles use initials to protect operational security. CryptoKiller analysts work anonymously to avoid retaliation from scam operations they investigate.
          </p>
        </div>

        <p className="text-center text-sm text-slate-500">
          We work with vetted contributors in 23 countries.{" "}
          <a
            href="/about"
            className="text-red-400 hover:text-red-300 font-semibold inline-flex items-center gap-1 transition-colors"
          >
            Apply to Contribute <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </p>
      </div>
    </section>
  );
}
