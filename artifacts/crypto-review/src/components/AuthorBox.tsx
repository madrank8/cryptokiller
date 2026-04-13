import { Link } from "wouter";
import { ArrowRight } from "lucide-react";

interface AuthorBoxProps {
  name?: string;
  slug?: string;
  initials?: string;
  role?: string;
  credentials?: string;
  specialties?: string[];
  avatarBg?: string;
  bio?: string;
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
};

export default function AuthorBox(props: AuthorBoxProps) {
  const author = {
    name: props.name || defaultAuthor.name,
    slug: props.slug || defaultAuthor.slug,
    initials: props.initials || defaultAuthor.initials,
    role: props.role || defaultAuthor.role,
    credentials: props.credentials || defaultAuthor.credentials,
    specialties: props.specialties || defaultAuthor.specialties,
    avatarBg: props.avatarBg || defaultAuthor.avatarBg,
    bio: props.bio || defaultAuthor.bio,
  };

  const profileHref = author.slug ? `/author/${author.slug}` : "/about";
  const linkLabel = author.slug ? `View ${author.name}'s profile` : "Meet the team";

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row gap-5 sm:gap-6">
        <div
          className={`${author.avatarBg} w-16 h-16 rounded-full flex items-center justify-center shrink-0`}
        >
          <span className="text-white font-bold text-lg tracking-wide">
            {author.initials}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
            Written by
          </p>
          <h3 className="text-lg font-bold text-white mb-1">{author.name}</h3>
          <p className="text-sm text-slate-400 mb-2">{author.role}</p>
          <p className="text-sm text-slate-400 leading-relaxed mb-3">
            {author.bio}
          </p>
          <p className="text-xs text-slate-500 font-mono leading-relaxed mb-4">
            {author.credentials}
          </p>

          <div className="flex flex-wrap gap-1.5 mb-5">
            {author.specialties.map((s) => (
              <span
                key={s}
                className="text-[11px] text-slate-400 font-medium border border-slate-700/60 rounded-full px-2.5 py-0.5"
              >
                {s}
              </span>
            ))}
          </div>

          <Link
            href={profileHref}
            className="text-sm text-red-400 hover:text-red-300 font-semibold inline-flex items-center gap-1 transition-colors"
          >
            {linkLabel} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
