import { ArrowRight } from "lucide-react";

const analysts = [
  {
    name: "Marcus Webb",
    initials: "MW",
    role: "Lead Threat Analyst",
    avatarBg: "bg-blue-900",
    credentials: "Blockchain Forensics · 9 yrs · Ex-TRM Labs",
    specialties: ["Ad Fraud", "Wallet Tracing", "Pig Butchering"],
    published: "340+ investigations",
  },
  {
    name: "Priya Nair",
    initials: "PN",
    role: "Ad Intelligence Analyst",
    avatarBg: "bg-purple-900",
    credentials: "Cybersecurity · CISSP · Ex-Meta Trust & Safety",
    specialties: ["Celebrity Impersonation", "Phishing", "Social Ads"],
    published: "218 investigations",
  },
  {
    name: "Daniel Ortiz",
    initials: "DO",
    role: "Investigative Writer",
    avatarBg: "bg-amber-900",
    credentials: "Investigative Journalism · Reuters Alumni · FinCrime",
    specialties: ["ICO Fraud", "Rug Pulls", "Regulatory"],
    published: "167 investigations",
  },
];

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {analysts.map((a) => (
            <div
              key={a.name}
              className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-slate-600 hover:-translate-y-1 transition-all duration-200"
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

              <p className="text-slate-500 text-xs font-mono leading-relaxed mb-4">
                {a.credentials}
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

              <div className="border-t border-slate-800 pt-4">
                <p className="text-xs text-slate-500">
                  Published: <span className="text-white font-semibold">{a.published}</span>
                </p>
              </div>
            </div>
          ))}
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
