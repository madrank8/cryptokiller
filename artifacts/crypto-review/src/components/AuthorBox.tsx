import { Link } from "wouter";
import { ArrowRight } from "lucide-react";

interface AuthorBoxProps {
  name?: string;
  initials?: string;
  role?: string;
  credentials?: string;
  specialties?: string[];
  avatarBg?: string;
}

const defaultAuthor: Required<AuthorBoxProps> = {
  name: "CryptoKiller Research Team",
  initials: "CK",
  role: "Investigative Analysts",
  credentials: "Blockchain Forensics · Cybersecurity · Investigative Journalism",
  specialties: ["Ad Fraud", "Wallet Tracing", "Pig Butchering", "Rug Pulls", "Phishing"],
  avatarBg: "bg-red-900",
};

export default function AuthorBox(props: AuthorBoxProps) {
  const author = {
    name: props.name || defaultAuthor.name,
    initials: props.initials || defaultAuthor.initials,
    role: props.role || defaultAuthor.role,
    credentials: props.credentials || defaultAuthor.credentials,
    specialties: props.specialties || defaultAuthor.specialties,
    avatarBg: props.avatarBg || defaultAuthor.avatarBg,
  };

  return (
    <div className="mt-12 border-t border-slate-800 pt-8">
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
            <p className="text-sm text-slate-400 mb-3">{author.role}</p>
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
              href="/about"
              className="text-sm text-red-400 hover:text-red-300 font-semibold inline-flex items-center gap-1 transition-colors"
            >
              View full team <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
