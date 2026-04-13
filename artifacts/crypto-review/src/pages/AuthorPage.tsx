import { useParams, Link } from "wouter";
import {
  Shield, ArrowLeft, BookOpen, Award, Clock, MapPin
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { usePageMeta } from "@/hooks/usePageMeta";
import Breadcrumbs, { breadcrumbJsonLd } from "@/components/Breadcrumbs";
import { WRITER_PERSONAS } from "@/lib/writerPersonas";

const BASE = "https://cryptokiller.org";

export default function AuthorPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";

  const persona = Object.values(WRITER_PERSONAS).find(p => p.slug === slug);

  const crumbs = [
    { label: "Home", href: `${BASE}/` },
    { label: "About", href: `${BASE}/about` },
    ...(persona ? [{ label: persona.name, href: `${BASE}/author/${slug}` }] : []),
  ];

  const personJsonLd = persona
    ? {
        "@type": "Person",
        name: persona.name,
        jobTitle: persona.role,
        description: persona.fullBio,
        url: `${BASE}/author/${slug}`,
        worksFor: {
          "@type": "Organization",
          name: "CryptoKiller",
          url: BASE,
        },
        knowsAbout: persona.specialties,
      }
    : undefined;

  usePageMeta({
    title: persona
      ? `${persona.name} — ${persona.role} | CryptoKiller`
      : "Author Not Found | CryptoKiller",
    description: persona?.fullBio?.slice(0, 160) || "Author profile on CryptoKiller.",
    canonical: `${BASE}/author/${slug}`,
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        breadcrumbJsonLd(crumbs),
        ...(personJsonLd ? [personJsonLd] : []),
      ],
    },
  });

  if (!persona) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 font-sans">
        <SiteHeader />
        <main className="container mx-auto px-4 py-16 max-w-4xl text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Author Not Found</h1>
          <p className="text-slate-400 mb-6">
            The analyst profile you're looking for doesn't exist.
          </p>
          <Link
            href="/about"
            className="text-red-400 hover:text-red-300 inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Meet the team
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-red-900 selection:text-white">
      <SiteHeader activeNav="about" />

      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "About", href: "/about" },
            { label: persona.name },
          ]}
        />

        <div className="flex flex-col sm:flex-row items-start gap-6 mb-10">
          <div
            className={`${persona.avatarBg} w-20 h-20 rounded-full flex items-center justify-center shrink-0`}
          >
            <span className="text-white font-bold text-2xl tracking-wide">
              {persona.initials}
            </span>
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-1">
              {persona.name}
            </h1>
            <p className="text-lg text-slate-400 mb-2">{persona.role}</p>
            <p className="text-sm text-slate-500 font-mono">{persona.credentials}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {[
            {
              icon: <BookOpen className="h-5 w-5" />,
              color: "text-red-400",
              bg: "bg-red-500/10 border-red-900/30",
              stat: persona.published.split(" ")[0],
              label: "Investigations",
            },
            {
              icon: <Clock className="h-5 w-5" />,
              color: "text-amber-400",
              bg: "bg-amber-500/10 border-amber-900/30",
              stat: persona.yearsExperience,
              label: "Experience",
            },
            {
              icon: <Award className="h-5 w-5" />,
              color: "text-blue-400",
              bg: "bg-blue-500/10 border-blue-900/30",
              stat: `${persona.specialties.length}`,
              label: "Specialties",
            },
            {
              icon: <Shield className="h-5 w-5" />,
              color: "text-green-400",
              bg: "bg-green-500/10 border-green-900/30",
              stat: "Active",
              label: "Status",
            },
          ].map((item, i) => (
            <div
              key={i}
              className={`text-center p-4 rounded-xl border ${item.bg}`}
            >
              <div className={`${item.color} flex justify-center mb-2`}>
                {item.icon}
              </div>
              <p className="text-xl font-black text-white mb-0.5">{item.stat}</p>
              <p className="text-slate-500 text-xs">{item.label}</p>
            </div>
          ))}
        </div>

        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Background</h2>
          <p className="text-slate-400 leading-relaxed text-base">
            {persona.fullBio}
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Areas of Expertise</h2>
          <div className="flex flex-wrap gap-2">
            {persona.specialties.map((s) => (
              <span
                key={s}
                className="text-sm text-slate-300 font-medium border border-slate-700/60 bg-slate-800/40 rounded-full px-4 py-1.5"
              >
                {s}
              </span>
            ))}
          </div>
        </section>

        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 flex items-start gap-3 mb-10">
          <MapPin className="h-4 w-4 text-slate-600 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 leading-relaxed">
            CryptoKiller analyst profiles use initials to protect operational security.
            Our analysts work under partial anonymity to avoid retaliation from scam
            operations they investigate.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/about"
            className="text-sm text-red-400 hover:text-red-300 font-semibold inline-flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Meet the full team
          </Link>
          <Link
            href="/blog"
            className="text-sm text-slate-400 hover:text-white font-semibold inline-flex items-center gap-1 transition-colors"
          >
            Read investigations
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
