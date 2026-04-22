import { Shield, MessageCircle, Mail, MapPin, Clock } from "lucide-react";

const footerLinks = [
  { label: "Investigations", href: "/investigations" },
  { label: "Report a Scam", href: "/report" },
  { label: "Recovery Guide", href: "/recovery" },
  { label: "About", href: "/about" },
  { label: "Methodology", href: "/methodology" },
  { label: "Blog", href: "/blog" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Sitemap", href: "/api/sitemap.xml" },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-8">
          <div>
            <a href="/" className="flex items-center gap-2 mb-2">
              <div className="bg-red-600 p-1.5 rounded-md">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-black text-white tracking-tight">
                Crypto<span className="text-red-500">Killer</span>
              </span>
              <span className="text-slate-600 text-sm">Scam Intelligence</span>
            </a>
            <p className="text-slate-500 text-xs max-w-sm leading-relaxed mb-4">
              Your definitive intelligence platform exposing cryptocurrency scams through real-time ad surveillance and evidence-based investigation reports.
            </p>
            <div className="space-y-1.5 text-xs text-slate-500">
              <p className="text-slate-400 font-semibold">DEX Algo Technologies Pte Ltd.</p>
              <p className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 shrink-0" />
                150 Beach Rd., Level 35 Gateway West, Singapore 189720
              </p>
              <a
                href="mailto:contact@cryptokiller.org"
                className="flex items-center gap-1.5 hover:text-white transition-colors"
              >
                <Mail className="h-3 w-3 shrink-0" />
                contact@cryptokiller.org
              </a>
              <div className="flex items-start gap-1.5 pt-1">
                <Clock className="h-3 w-3 shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-400 font-semibold">Hours</p>
                  <p>Monday–Friday: 9:00AM–5:00PM</p>
                  <p>Saturday &amp; Sunday: 11:00AM–3:00PM</p>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm text-slate-500">
            {footerLinks.map(l => (
              <a key={l.label} href={l.href} className="hover:text-white transition-colors">{l.label}</a>
            ))}
          </div>
        </div>
        <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-600">&copy; {new Date().getFullYear()} CryptoKiller — DEX Algo Technologies Pte Ltd. All investigations are for informational purposes only.</p>
          <div className="flex items-center gap-4">
            <a
              href="https://wa.me/14155238886"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-green-400 transition-colors"
              aria-label="Contact us on WhatsApp"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              All systems operational
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
