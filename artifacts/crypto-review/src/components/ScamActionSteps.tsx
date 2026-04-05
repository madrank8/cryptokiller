import { Ban, Camera, FileText, Send, AlertTriangle, ExternalLink } from "lucide-react";

const steps = [
  {
    num: "1",
    label: "STOP",
    icon: <Ban className="h-6 w-6" />,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-900/40",
    text: "Cut all contact. Do not send more funds. Block on all platforms.",
  },
  {
    num: "2",
    label: "DOCUMENT",
    icon: <Camera className="h-6 w-6" />,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-900/40",
    text: "Screenshot everything — chats, wallet addresses, transaction IDs, URLs.",
  },
  {
    num: "3",
    label: "REPORT OFFICIALLY",
    icon: <FileText className="h-6 w-6" />,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-900/40",
    text: "",
    links: [
      { label: "FBI IC3", href: "https://ic3.gov" },
      { label: "FTC", href: "https://reportfraud.ftc.gov" },
      { label: "Chainalysis Report", href: "https://go.chainalysis.com/report-scam" },
    ],
  },
  {
    num: "4",
    label: "SUBMIT HERE",
    icon: <Send className="h-6 w-6" />,
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-900/40",
    text: "Add intelligence to CryptoKiller — warn others and help investigators.",
    cta: { label: "Submit a Report", href: "/report" },
  },
];

export default function ScamActionSteps() {
  return (
    <section className="py-20 bg-amber-950/10 border-y border-amber-900/30">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-3">
            Lost Money to a Crypto Scam?{" "}
            <span className="text-amber-400">Act Within 72 Hours.</span>
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            The faster you report, the better the chance of tracing funds before they reach mixers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          {steps.map((s) => (
            <div
              key={s.num}
              className={`rounded-2xl border ${s.bg} p-5 flex flex-col`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`${s.color}`}>{s.icon}</div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Step {s.num}
                  </span>
                  <h3 className={`text-sm font-black ${s.color}`}>{s.label}</h3>
                </div>
              </div>

              {s.text && (
                <p className="text-slate-300 text-sm leading-relaxed flex-1">{s.text}</p>
              )}

              {s.links && (
                <div className="flex flex-col gap-2 flex-1">
                  {s.links.map((l) => (
                    <a
                      key={l.label}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300 bg-blue-950/40 border border-blue-900/40 rounded-lg px-3 py-2 transition-colors"
                    >
                      {l.label}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ))}
                </div>
              )}

              {s.cta && (
                <a
                  href={s.cta.href}
                  className="mt-3 inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 transition-colors text-white font-bold px-4 py-2.5 rounded-xl text-sm"
                >
                  {s.cta.label}
                </a>
              )}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-[#25D366]/20 bg-slate-900/80 p-8 mb-10 text-center">
          <h3 className="text-xl md:text-2xl font-black text-white mb-2">
            💬 Get Instant Help on WhatsApp
          </h3>
          <p className="text-slate-400 text-sm max-w-lg mx-auto mb-5">
            Send us a message on WhatsApp to check any crypto platform or report a scam — we respond fast.
          </p>
          <a
            href="https://wa.me/[YOUR_NUMBER]?text=Hi%20CryptoKiller%2C%20I%20want%20to%20check%20a%20crypto%20platform"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors"
            style={{ backgroundColor: "#25D366" }}
          >
            Open WhatsApp Chat →
          </a>
          <p className="text-xs text-slate-500 mt-4">🔒 Your number is never stored or shared</p>
        </div>

        <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-slate-200 text-sm leading-relaxed">
                Avoid "crypto recovery" services charging upfront fees. They are almost always a second scam targeting victims. The FTC warns against all upfront-fee recovery services.{" "}
                <a
                  href="https://consumer.ftc.gov/articles/cryptocurrency-scams"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-400 hover:text-red-300 font-semibold inline-flex items-center gap-1 transition-colors"
                >
                  FTC Warning <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-[12px] text-slate-500">
          CryptoKiller does not offer recovery services and charges no fees to victims.
        </p>
      </div>
    </section>
  );
}
