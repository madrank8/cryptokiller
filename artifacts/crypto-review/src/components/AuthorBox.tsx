import { Link } from "wouter";
import { ArrowRight, Linkedin, ExternalLink } from "lucide-react";
import { WRITER_PERSONAS } from "@/lib/writerPersonas";
import TeamAvatar from "@/components/TeamAvatar";

interface AuthorBoxProps {
  name?: string;
  slug?: string;
  initials?: string;
  role?: string;
  credentials?: string;
  specialties?: string[];
  avatarBg?: string;
  bio?: string;
  image?: string;
  linkedin?: string;
  dexProfileUrl?: string;
}

const defaultAuthor: Required<AuthorBoxProps> = {
  name: "CryptoKiller Research Team",
  slug: "",
  initials: "CK",
  role: "Investigative Analysts",
  credentials: "Blockchain Forensics · Cybersecurity · Investigative Journalism",
  specialties: ["Ad Fraud", "Wallet Tracing", "Pig Butchering", "Rug Pulls", "Phishing"],
  avatarBg: "bg-red-900",
  bio: "The CryptoKiller Research Team is a group of analysts, investigators, and security researchers dedicated to exposing cryptocurrency scams and protecting investors worldwide.",
  image: "",
  linkedin: "",
  dexProfileUrl: "",
};

export default function AuthorBox(props: AuthorBoxProps) {
  const persona = props.slug ? WRITER_PERSONAS[props.slug] : undefined;

  const author = {
    name: props.name || persona?.name || defaultAuthor.name,
    slug: props.slug || persona?.slug || defaultAuthor.slug,
    initials: props.initials || persona?.initials || defaultAuthor.initials,
    role: props.role || persona?.role || defaultAuthor.role,
    credentials: props.credentials || persona?.credentials || defaultAuthor.credentials,
    specialties: props.specialties || persona?.specialties || defaultAuthor.specialties,
    avatarBg: props.avatarBg || persona?.avatarBg || defaultAuthor.avatarBg,
    bio: props.bio || persona?.bio || defaultAuthor.bio,
    image: props.image || persona?.image || defaultAuthor.image,
    linkedin: props.linkedin || persona?.linkedin || persona?.sameAs?.find(url => url.includes("linkedin.com")) || defaultAuthor.linkedin,
    dexProfileUrl: props.dexProfileUrl || persona?.dexProfileUrl || defaultAuthor.dexProfileUrl,
  };

  const profileHref = author.slug ? `/author/${author.slug}` : "/about";
  const linkLabel = author.slug ? `View full profile` : "Meet the team";

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 sm:p-8 hover:border-slate-700 transition-colors">
      <div className="flex flex-col sm:flex-row gap-5 sm:gap-6">
        <div className="shrink-0">
          <TeamAvatar
            persona={author}
            className="h-16 w-16 sm:h-20 sm:w-20"
            initialsClassName="text-xl"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                Article author
              </p>
              <h3 className="text-xl font-bold text-white">
                {author.name}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {author.linkedin && (
                <a href={author.linkedin} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-[#0A66C2] transition-colors bg-slate-950 p-1.5 rounded-md border border-slate-800" aria-label="LinkedIn">
                  <Linkedin className="h-4 w-4" />
                </a>
              )}
              {author.dexProfileUrl && (
                <a href={author.dexProfileUrl} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-white transition-colors bg-slate-950 p-1.5 rounded-md border border-slate-800" aria-label="DEX source">
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          <p className="text-sm text-slate-400 mb-3">{author.role}</p>

          <div className="mb-4">
            <p className="text-xs text-slate-300 font-mono leading-relaxed bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/50 inline-block">
              {author.credentials}
            </p>
          </div>

          <p className="text-sm text-slate-400 leading-relaxed mb-4">
            {author.bio}
          </p>

          <div className="flex flex-wrap gap-1.5 mb-5">
            {author.specialties.map((s) => (
              <span
                key={s}
                className="text-[11px] text-slate-400 font-medium border border-slate-700/60 rounded-full px-2.5 py-0.5 bg-slate-950/40"
              >
                {s}
              </span>
            ))}
          </div>

          <Link
            href={profileHref}
            className="text-sm text-red-400 hover:text-red-300 font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            {linkLabel} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}