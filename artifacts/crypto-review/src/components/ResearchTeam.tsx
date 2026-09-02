import { Link } from "wouter";
import { ArrowRight, Linkedin, ExternalLink } from "lucide-react";
import { TEAM_PREVIEW } from "@/lib/writerPersonas";
import TeamAvatar from "@/components/TeamAvatar";

export default function ResearchTeam() {
  return (
    <section className="py-24 border-t border-slate-800/60 bg-slate-950">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-red-500 mb-3 block">
            Our People
          </span>
          <h2 className="text-3xl md:text-5xl font-black text-white mb-5 tracking-tight">
            Expertise behind <span className="text-slate-500">the investigations.</span>
          </h2>
          <p className="text-slate-400 text-base max-w-2xl mx-auto leading-relaxed">
            Meet members of the shared DEX Algo Technologies team responsible for
            editorial review, crypto analysis, and financial research.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {TEAM_PREVIEW.map((a) => {
            const linkedin = a.linkedin || a.sameAs?.find((url) => url.includes("linkedin.com"));
            return (
              <div
                key={a.slug}
                className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 hover:bg-slate-900/80 hover:border-slate-700 transition-all duration-300 flex flex-col h-full"
              >
                <div className="flex items-start gap-4 mb-5">
                  <Link href={`/author/${a.slug}`} className="shrink-0">
                    <TeamAvatar persona={a} />
                  </Link>
                  <div className="flex-1 min-w-0 pt-1">
                    <Link href={`/author/${a.slug}`} className="block hover:opacity-80 transition-opacity">
                      <h3 className="text-white font-bold text-lg leading-tight">
                        {a.name}
                      </h3>
                    </Link>
                    <p className="text-slate-400 text-sm mt-0.5">{a.role}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">Credentials</p>
                  <p className="text-slate-300 text-xs font-mono leading-relaxed bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
                    {a.credentials}
                  </p>
                </div>

                <p className="text-slate-400 text-sm leading-relaxed mb-6 flex-1">
                  {a.bio}
                </p>

                <div className="border-t border-slate-800/60 pt-5 mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {linkedin && (
                      <a href={linkedin} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-[#0A66C2] transition-colors" aria-label={`${a.name} LinkedIn`}>
                        <Linkedin className="h-4 w-4" />
                      </a>
                    )}
                    {a.dexProfileUrl && (
                      <a href={a.dexProfileUrl} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-white transition-colors flex items-center gap-1 text-xs font-medium" aria-label={`${a.name} DEX Profile`}>
                        DEX <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <Link href={`/author/${a.slug}`} className="text-xs text-red-400 hover:text-red-300 font-semibold inline-flex items-center gap-1.5 transition-colors">
                    Full Profile <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center mt-12">
          <Link
            href="/about"
            className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors shadow-sm"
          >
            Meet the Full Team
          </Link>
          <p className="text-sm text-slate-500 max-w-sm">
            Biographical claims are attributed to each member's public DEX team profile.
          </p>
        </div>
      </div>
    </section>
  );
}
