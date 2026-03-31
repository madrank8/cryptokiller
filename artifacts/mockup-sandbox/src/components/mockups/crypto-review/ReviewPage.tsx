import React, { useState } from "react";
import {
  Shield, AlertTriangle, Flag, X, CheckCircle,
  Calendar, Eye, User, Search, Menu, ExternalLink,
  ChevronRight, AlertOctagon,
  Clock, ShieldAlert, Globe, Lock, Scale,
  BookOpen, FileText, ChevronDown, ChevronUp,
  BarChart2, Microscope, MapPin, Phone, ArrowRight,
  Megaphone, Target, TrendingUp, Siren
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

const CustomProgress = ({ value, colorClass }: { value: number; colorClass: string }) => (
  <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-800">
    <div className={`h-full transition-all ${colorClass}`} style={{ width: `${value}%` }} />
  </div>
);

const SectionTitle = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2.5 border-b border-slate-800 pb-3">
    <span className="text-red-500">{icon}</span>
    {children}
  </h2>
);

const faqData = [
  { q: "Is Quantum AI legit or a scam?", a: "Quantum AI is a confirmed scam. Our surveillance detected 3,076 fraudulent ad creatives across 45 countries over 419 days. The platform accepts deposits but systematically blocks all withdrawals using fabricated compliance excuses." },
  { q: "Can I get my money back from Quantum AI?", a: "Chargebacks via your bank or credit card are the most viable route within 120 days of the transaction. Cryptocurrency deposits are typically unrecoverable. File reports with the FBI IC3 and your national financial authority immediately. Be wary of 'recovery agents' who charge upfront fees — these are secondary scams." },
  { q: "How many people has Quantum AI scammed?", a: "Based on 3,076 ad creatives deployed across 45 countries over 419 days, the operation has likely reached tens of thousands of victims. The exact figure is unknown as many victims do not file official reports." },
  { q: "Why does Quantum AI use celebrity endorsements in ads?", a: "Celebrity impersonation creates instant credibility with people who trust those public figures. The scam geo-targets: Elon Musk and Jeff Bezos in English-speaking markets, Narayana Murthy in India, Keir Starmer in the UK. None of these individuals endorse or are affiliated with Quantum AI." },
  { q: "Is Quantum AI regulated by the FCA or SEC?", a: "No. Searches of the FCA warning list, SEC EDGAR database, ASIC Moneysmart, and CySEC registry return zero results for Quantum AI. It is unregistered in every jurisdiction where it operates — a legal violation in the UK, USA, and Australia." },
  { q: "What should I do if I clicked a Quantum AI ad?", a: "If you clicked but did not deposit: close the page, do not provide personal details, and report the ad to the platform where you saw it. If you deposited: contact your bank immediately, document everything, and file reports with the FBI IC3, FTC, or your local equivalent." },
  { q: "Why are new Quantum AI ads still running in March 2026?", a: "The operation rotates ad accounts, domains, and payment processors to evade platform enforcement. 42 new creatives are deployed every 7 days. This velocity and infrastructure indicate an organized criminal enterprise, not a simple scam site — which is why ad platforms struggle to fully shut it down." },
];

export function ReviewPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-red-900 selection:text-white">

      {/* NAV */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-6xl">
          <div className="flex items-center gap-2">
            <div className="bg-red-600 p-1.5 rounded-md">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Crypto<span className="text-red-500">Killer</span>
            </span>
            <span className="hidden md:block text-xs text-slate-500 ml-1 mt-0.5">by SpyOwl</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <a href="#" className="hover:text-white transition-colors">Home</a>
            <a href="#" className="text-white border-b border-red-500 pb-0.5">Investigations</a>
            <a href="#" className="hover:text-white transition-colors">Report a Scam</a>
            <a href="#" className="hover:text-white transition-colors">About</a>
          </nav>
          <div className="flex items-center gap-3">
            <Search className="hidden md:block h-4 w-4 text-slate-400 hover:text-white cursor-pointer" />
            <Badge className="bg-red-600 hover:bg-red-700 text-white font-bold border-0 animate-pulse">
              <AlertTriangle className="h-3 w-3 mr-1" />
              SCAM ALERT
            </Badge>
            <Button variant="ghost" size="icon" className="md:hidden text-slate-300">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">

        {/* BREADCRUMB */}
        <div className="flex items-center text-sm text-slate-500 mb-6">
          <a href="#" className="hover:text-slate-300">Home</a>
          <ChevronRight className="h-3 w-3 mx-1" />
          <a href="#" className="hover:text-slate-300">Investigations</a>
          <ChevronRight className="h-3 w-3 mx-1" />
          <span className="text-slate-300">Quantum AI</span>
        </div>

        {/* HERO */}
        <div className="mb-10">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white">Quantum AI</h1>
            <Badge className="bg-red-600 text-white text-sm px-3 py-1.5 uppercase tracking-widest border-0 flex items-center gap-1.5 shrink-0">
              <ShieldAlert className="h-4 w-4" />
              CONFIRMED SCAM
            </Badge>
          </div>

          <p className="text-lg text-slate-300 max-w-4xl leading-relaxed mb-6">
            Quantum AI is a confirmed crypto investment scam with a <span className="text-red-400 font-bold">95/100 threat score</span>, based on{" "}
            <span className="text-white font-semibold">3,076 fraudulent advertisements</span> detected across{" "}
            <span className="text-white font-semibold">45 countries</span> over{" "}
            <span className="text-white font-semibold">419 days</span> of continuous operation. The scheme impersonates 28 real celebrities including Elon Musk, Jeff Bezos, and Bill Gates. Deposits succeed — withdrawals are systematically blocked.
          </p>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-400 mb-8 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span>Published: March 30, 2026</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-500" />
              <span>1,341 words · 6 min read</span>
            </div>
            <div className="flex items-center gap-1.5">
              <User className="h-4 w-4 text-slate-500" />
              <span>Crypto Killer Research Team</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-slate-500" />
              <span>SpyOwl Ad Surveillance</span>
            </div>
          </div>

          {/* KEY STATS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
            {[
              { icon: <BarChart2 className="h-6 w-6 text-red-500" />, bg: "bg-red-500/10", label: "Ad Creatives", value: "3,076" },
              { icon: <Globe className="h-6 w-6 text-amber-500" />, bg: "bg-amber-500/10", label: "Countries Targeted", value: "45" },
              { icon: <Clock className="h-6 w-6 text-orange-400" />, bg: "bg-orange-500/10", label: "Days Active", value: "419" },
              { icon: <User className="h-6 w-6 text-blue-400" />, bg: "bg-blue-500/10", label: "Celebrities Abused", value: "28" },
            ].map((s, i) => (
              <Card key={i} className="bg-slate-900/60 border-slate-800">
                <CardContent className="p-5 flex items-center gap-3">
                  <div className={`${s.bg} p-3 rounded-full shrink-0`}>{s.icon}</div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">{s.label}</p>
                    <p className="text-2xl font-black text-white">{s.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* KEY TAKEAWAYS */}
        <div className="mb-12 bg-red-950/20 border border-red-900/40 rounded-xl p-6">
          <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
            <AlertOctagon className="h-5 w-5" /> Key Takeaways
          </h3>
          <ul className="space-y-3">
            {[
              "3,076 fraudulent ad creatives detected across 45 countries over 419 days — Quantum AI is an active, ongoing scam as of March 2026.",
              "28 celebrities impersonated without consent, including Elon Musk, Jeff Bezos, Bill Gates, Keir Starmer, and Narayana Murthy.",
              "42 new ad creatives deployed every 7 days — the platform is scaling, not slowing down.",
              "Deposits succeed instantly but withdrawals are systematically blocked — victims face account lockouts and demands for unlock fees.",
              "Zero regulatory licensing across FCA, SEC, ASIC, CySEC, and FINMA — Quantum AI operates with no legal foundation.",
              "419-day campaign longevity indicates a sophisticated, entrenched fraud network — not a fleeting scam site.",
            ].map((point, i) => (
              <li key={i} className="flex gap-3 items-start text-sm text-slate-300 leading-relaxed">
                <X className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* MAIN 2-COL GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-14">

          {/* LEFT: content */}
          <div className="lg:col-span-2 space-y-14">

            {/* INVESTIGATION SUMMARY */}
            <section>
              <SectionTitle icon={<FileText className="h-6 w-6" />}>Investigation Summary</SectionTitle>
              <p className="text-slate-300 leading-relaxed mb-4">
                Quantum AI is a confirmed crypto investment scam with a 95/100 threat score, based on 3,076 fraudulent advertisements detected across 45 countries over 419 days of continuous operation between February 2025 and March 2026. The scheme impersonates 28 real celebrities in paid advertisements, targeting victims in Brazil, Germany, Spain, France, the United Kingdom, Italy, Mexico, the United States, Australia, and India.
              </p>
              <p className="text-slate-300 leading-relaxed mb-4">
                Victims report that initial deposits succeed through the platform, but withdrawal requests trigger account lockouts, fabricated compliance fees, and relentless contact from changing phone numbers demanding additional capital. SpyOwl's analysis confirms Quantum AI exhibits every hallmark of a confidence scheme: celebrity fabrication, geographic dispersion, high-velocity ad deployment (42 new creatives per 7 days), and zero regulatory registration across FCA, SEC, ASIC, or CySEC databases.
              </p>
              <div className="bg-slate-900 border border-red-900/50 rounded-lg p-4 mt-4">
                <p className="text-red-300 text-sm font-semibold leading-relaxed">
                  ⚠️ If you deposited money to Quantum AI and cannot withdraw it, you are not the victim of bad luck or market volatility — you have been targeted by an organized fraud operation.
                </p>
              </div>
            </section>

            {/* HOW THIS SCAM WORKS */}
            <section>
              <SectionTitle icon={<Microscope className="h-6 w-6" />}>How This Scam Works</SectionTitle>
              <p className="text-slate-400 text-sm mb-8">
                Quantum AI deploys a <span className="text-white font-semibold">four-stage confidence scheme</span> targeting retail investors searching for cryptocurrency trading automation. Each stage is designed to advance the victim deeper into the trap.
              </p>

              <div className="relative">
                {/* Vertical connector line */}
                <div className="absolute left-[27px] top-12 bottom-12 w-0.5 bg-gradient-to-b from-orange-600 via-red-600 to-red-900 hidden md:block" />

                <div className="space-y-4">
                  {[
                    {
                      icon: <Megaphone className="h-5 w-5" />,
                      label: "Stage 1",
                      title: "Celebrity Impersonation & Geo-Targeted Advertising",
                      color: "orange",
                      bgCard: "bg-orange-950/20",
                      border: "border-orange-800/40",
                      labelColor: "text-orange-400",
                      iconBg: "bg-orange-600",
                      stat: { value: "3,076 ads", sub: "impersonating 28 celebrities" },
                      bullets: [
                        "Paid ads featuring Elon Musk, Jeff Bezos, and Bill Gates — without consent",
                        "Geo-targeted by region: Indian leaders in India, UK politicians in the UK",
                        "42 new ad creatives deployed every 7 days to evade platform detection",
                        "Ads promise automated trading returns of 10–50% monthly with zero experience",
                      ],
                    },
                    {
                      icon: <Target className="h-5 w-5" />,
                      label: "Stage 2",
                      title: "The Funnel & Deposit Success",
                      color: "amber",
                      bgCard: "bg-amber-950/20",
                      border: "border-amber-800/40",
                      labelColor: "text-amber-400",
                      iconBg: "bg-amber-600",
                      stat: { value: "Instant", sub: "deposit confirmation" },
                      bullets: [
                        "Victims land on a fake trading dashboard — account creation takes under 2 minutes",
                        "Platform displays fabricated testimonials from 'traders earning thousands daily'",
                        "Deposits via bank transfer, credit card, or crypto all clear without issue",
                        "Instant deposit confirmation creates a false sense of legitimacy — the psychological trap",
                      ],
                    },
                    {
                      icon: <TrendingUp className="h-5 w-5" />,
                      label: "Stage 3",
                      title: "Fake Profits & Psychological Manipulation",
                      color: "red",
                      bgCard: "bg-red-950/20",
                      border: "border-red-800/40",
                      labelColor: "text-red-400",
                      iconBg: "bg-red-600",
                      stat: { value: "5–15%", sub: "fake daily returns displayed" },
                      bullets: [
                        "Dashboard shows rising balances — entirely fabricated, no real trades occur",
                        "Relentless calls and WhatsApp messages from rotating phone numbers",
                        "'Account managers' push limited-time bonuses and urgent verification demands",
                        "Victims are pressured to deposit more before they can see any 'profits'",
                      ],
                    },
                    {
                      icon: <Siren className="h-5 w-5" />,
                      label: "Stage 4",
                      title: "The Withdrawal Trap & Fee Extraction",
                      color: "rose",
                      bgCard: "bg-rose-950/30",
                      border: "border-rose-700/50",
                      labelColor: "text-rose-400",
                      iconBg: "bg-rose-700",
                      stat: { value: "$500–$5,000", sub: "unlock fees demanded" },
                      bullets: [
                        "Withdrawal triggers an error: 'compliance hold', 'KYC pending', or 'verification required'",
                        "Victims told to pay an unlock fee to access their own funds",
                        "Some victims pay multiple fees — each payment invents a new requirement",
                        "Support goes dark: emails stop, phone numbers disconnect, dashboard no longer loads",
                      ],
                    },
                  ].map((stage, i) => (
                    <div key={i} className={`relative flex gap-0 md:gap-6 rounded-2xl ${stage.bgCard} border ${stage.border} overflow-hidden`}>
                      {/* Left accent bar */}
                      <div className={`hidden md:block w-1 shrink-0 ${stage.iconBg} opacity-60`} />

                      <div className="flex-1 p-6">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-4">

                          {/* Icon + number */}
                          <div className="flex items-center gap-3 sm:flex-col sm:items-center sm:gap-1 shrink-0">
                            <div className={`w-10 h-10 rounded-xl ${stage.iconBg} flex items-center justify-center text-white shadow-lg shrink-0`}>
                              {stage.icon}
                            </div>
                            <span className={`text-xs font-black uppercase tracking-widest ${stage.labelColor} sm:text-center`}>
                              {stage.label}
                            </span>
                          </div>

                          {/* Main content */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white text-lg leading-snug mb-4">{stage.title}</h3>

                            <ul className="space-y-2.5 mb-4">
                              {stage.bullets.map((bullet, bi) => (
                                <li key={bi} className="flex items-start gap-2.5 text-sm text-slate-300 leading-relaxed">
                                  <div className={`mt-1.5 w-1.5 h-1.5 rounded-full ${stage.iconBg} shrink-0`} />
                                  {bullet}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Stat callout */}
                          <div className={`shrink-0 rounded-xl border ${stage.border} bg-slate-950/50 px-4 py-3 text-center min-w-[110px]`}>
                            <p className={`text-xl font-black ${stage.labelColor} leading-tight`}>{stage.stat.value}</p>
                            <p className="text-xs text-slate-500 mt-0.5 leading-snug">{stage.stat.sub}</p>
                          </div>

                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* RED FLAGS */}
            <section>
              <SectionTitle icon={<Flag className="h-6 w-6" />}>Red Flags</SectionTitle>
              <div className="space-y-4">
                {[
                  { emoji: "🎭", title: "3,076 Celebrity-Impersonating Ads Across 45 Countries", text: "Quantum AI deployed 3,076 fraudulent advertisements impersonating 28 celebrities without consent across 45 countries. Real names include Elon Musk, Jeff Bezos, Bill Gates, Keir Starmer, Cyril Ramaphosa, Narayana Murthy, and Mukesh Ambani. This scale of celebrity impersonation violates trademark and right-of-publicity laws in every jurisdiction where ads were served. Legitimate trading platforms do not impersonate celebrities — this is a hallmark of investment fraud." },
                  { emoji: "📢", title: "42 New Ad Creatives Deployed Weekly — Active Scaling", text: "Quantum AI deploys 42 new advertising creatives every 7 days, demonstrating continuous operational scaling and active victim acquisition as of March 2026. The campaign has maintained this velocity for 419 consecutive days — ruling out accidental launch. The platform is not slowing down or retreating; it is actively scaling its fraud operation." },
                  { emoji: "🔒", title: "Deposits Succeed, Withdrawals Systematically Blocked", text: "Victims consistently report that initial deposits are processed instantly, but withdrawal requests trigger account lockouts and demands for unlock fees. The scam deliberately accepts deposits to establish false legitimacy. Withdrawal blocks then reveal the con. Victims are told compliance deposits, trading volume thresholds, or verification fees are required — each fabricated excuse designed to extract additional capital." },
                  { emoji: "⚖️", title: "Zero Regulatory Licensing Across FCA, SEC, ASIC, CySEC", text: "Quantum AI is not registered with the Financial Conduct Authority (UK), Securities and Exchange Commission (USA), Australian Securities and Investments Commission, or Cyprus Securities and Exchange Commission. Searches of fca.org.uk, sec.gov, and moneysmart.gov.au return zero results. Operating without registration in these jurisdictions violates financial services laws." },
                  { emoji: "⏰", title: "419-Day Campaign Duration Without Shutdown", text: "Quantum AI has operated continuously for 419 days from 2025-02-01 through 2026-03-26, deploying 3,076 creatives without disruption. The scam rotates domain names, ad accounts, and payment processors, allowing it to survive individual takedowns. This is not a flash scam — it is an entrenched criminal enterprise with infrastructure designed for persistence." },
                  { emoji: "👤", title: "Fabricated Testimonials & Fake Trading Dashboard", text: "The platform displays fake trading dashboards showing fabricated profits and testimonials from non-existent traders. Account balances are not connected to real trading activity — no securities are purchased, no orders executed, no market exposure created. The numbers are entirely synthetic, designed to build false confidence before the withdrawal trap is sprung." },
                  { emoji: "📞", title: "Relentless High-Pressure Contact & Urgency Tactics", text: "Victims report relentless unsolicited phone calls and WhatsApp messages from changing phone numbers claiming to be account managers. These contacts deploy high-pressure tactics including limited-time bonuses, urgent account verification demands, and exclusive algorithm access — all designed to trigger additional deposits. Changing contact numbers indicate deliberate evasion of call-blocking and law enforcement tracing." },
                  { emoji: "🌍", title: "Geographic Dispersion Across 45 Countries — International Operation", text: "The 3,076 ad creatives are deployed across 45 countries including Brazil, Germany, Spain, France, UK, Italy, Mexico, USA, Australia, India, South Africa, and Serbia. The scam geo-targets with localized celebrity impersonations — British political figures in the UK, Indian business leaders in India, South African politicians in South Africa. This sophistication indicates an organized international criminal operation." },
                ].map((flag, i) => (
                  <div key={i} className="rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden">
                    <div className="flex items-start gap-4 p-5">
                      <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-red-950/60 border border-red-900/60 text-base">
                        {flag.emoji}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Red Flag {i + 1}</span>
                        </div>
                        <h3 className="font-bold text-white text-base mb-2">{flag.title}</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">{flag.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* KEY INVESTIGATION FINDINGS */}
            <section>
              <SectionTitle icon={<Microscope className="h-6 w-6" />}>Key Investigation Findings</SectionTitle>
              <div className="space-y-4">
                {[
                  "14 of 3,076 ad creatives (0.46%) were duplicates created within 48 hours of each other, indicating rapid creative cycling to evade ad platform deduplication systems — consistent with sophisticated scam operations, not standard marketing.",
                  "We traced Quantum AI ad creatives to 8 separate Facebook ad accounts created between January 2025 and March 2026, with 6 of those accounts created within 30 days of each other — suggesting deliberate account farming to distribute ad volume and prevent single-account shutdown.",
                  "The celebrity impersonation pattern shows clear geo-localization: UK political figures (Keir Starmer, Sophy Ridge) appear only in GB-targeted ads; Indian business leaders (Narayana Murthy, Mukesh Ambani) appear exclusively in IN-targeted ads; South African politicians (Cyril Ramaphosa) appear only in ZA-targeted ads.",
                  "Quantum AI landing pages used SSL certificates issued within 72 hours of ad deployment in 6 of 45 countries analyzed — a known evasion tactic (just-in-time infrastructure provisioning) to minimize the abuse reporting window.",
                  "The withdrawal blockade pattern across India, Brazil, Germany, and the USA uses identical excuse messaging (compliance deposit, trading volume threshold, account verification) despite separate ad accounts and landing pages — indicating centralized fraud script management across the entire operation.",
                ].map((finding, i) => (
                  <div key={i} className="flex gap-3 items-start p-4 rounded-lg bg-slate-900/40 border border-slate-800/50">
                    <div className="shrink-0 mt-0.5 w-5 h-5 rounded bg-amber-950/60 border border-amber-800/50 flex items-center justify-center">
                      <span className="text-amber-400 text-xs font-bold">{i + 1}</span>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">{finding}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* WHAT TO DO */}
            <section>
              <SectionTitle icon={<CheckCircle className="h-6 w-6" />}>What To Do If You've Been Scammed</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: <FileText className="h-5 w-5 text-blue-400" />, title: "Report to the FBI IC3", sub: "ic3.gov", bg: "bg-blue-500/10", border: "border-blue-900/30" },
                  { icon: <Scale className="h-5 w-5 text-purple-400" />, title: "File an FTC complaint", sub: "reportfraud.ftc.gov", bg: "bg-purple-500/10", border: "border-purple-900/30" },
                  { icon: <Phone className="h-5 w-5 text-green-400" />, title: "Contact your bank immediately", sub: "Attempt a chargeback", bg: "bg-green-500/10", border: "border-green-900/30" },
                  { icon: <Lock className="h-5 w-5 text-amber-400" />, title: "Change all related passwords", sub: "Secure your accounts", bg: "bg-amber-500/10", border: "border-amber-900/30" },
                  { icon: <BookOpen className="h-5 w-5 text-sky-400" />, title: "Document everything", sub: "Screenshots, emails, transactions", bg: "bg-sky-500/10", border: "border-sky-900/30" },
                  { icon: <MapPin className="h-5 w-5 text-orange-400" />, title: "Report to local police", sub: "Needed for insurance claims", bg: "bg-orange-500/10", border: "border-orange-900/30" },
                ].map((step, i) => (
                  <div key={i} className={`flex items-center gap-4 p-4 rounded-xl ${step.bg} border ${step.border}`}>
                    <div className="shrink-0">{step.icon}</div>
                    <div>
                      <p className="text-white font-semibold text-sm">{step.title}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{step.sub}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-600 ml-auto shrink-0" />
                  </div>
                ))}
              </div>
            </section>

            {/* FAQ */}
            <section>
              <SectionTitle icon={<BookOpen className="h-6 w-6" />}>Frequently Asked Questions</SectionTitle>
              <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
                {faqData.map((faq, i) => (
                  <div key={i} className="bg-slate-900/50">
                    <button
                      className="w-full text-left flex items-center justify-between gap-4 p-5 hover:bg-slate-800/40 transition-colors"
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    >
                      <span className="font-semibold text-white text-sm">{faq.q}</span>
                      {openFaq === i
                        ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                        : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
                    </button>
                    {openFaq === i && (
                      <div className="px-5 pb-5">
                        <p className="text-slate-400 text-sm leading-relaxed">{faq.a}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* METHODOLOGY */}
            <section>
              <SectionTitle icon={<Microscope className="h-6 w-6" />}>Our Investigation Methodology</SectionTitle>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                This review was conducted using SpyOwl ad surveillance technology, which monitored cryptocurrency-related advertising campaigns across 50+ ad networks and social platforms between 2025-02-01 and 2026-03-26. SpyOwl detected 3,076 distinct ad creatives using the brand name Quantum AI, deployed across 45 target countries with geo-specific celebrity impersonations.
              </p>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Each detected creative was captured with metadata including geographic targeting, celebrity names used, ad account identifiers, domain landing pages, deployment dates, and creative format. The brand name was searched against FCA, SEC EDGAR, ASIC Moneysmart, and CySEC registries — returning zero results. Domain registration records and SSL certificate data were inspected to identify just-in-time infrastructure patterns.
              </p>
              <p className="text-slate-400 text-sm leading-relaxed">
                The 95/100 threat score reflects five factors: (1) ad volume and velocity — 3,076 creatives, 42 per week; (2) celebrity impersonation abuse — 28 without-consent endorsements; (3) geographic dispersion — 45 countries; (4) campaign persistence — 419 days active; (5) confirmed withdrawal blockade reports from victims across multiple countries.
              </p>
            </section>

          </div>

          {/* RIGHT SIDEBAR */}
          <div className="space-y-6">

            {/* THREAT SCORE */}
            <Card className="bg-slate-900 border-slate-800 sticky top-20">
              <CardHeader className="pb-4 border-b border-slate-800">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-red-500" /> Threat Score
                </CardTitle>
                <div className="flex items-end gap-2 pt-2">
                  <span className="text-6xl font-black text-red-500">95</span>
                  <span className="text-xl text-slate-500 font-bold mb-2">/ 100</span>
                </div>
                <CustomProgress value={95} colorClass="bg-red-600" />
                <p className="text-red-400 font-semibold text-sm mt-2">Extreme Risk — Do Not Deposit</p>
              </CardHeader>

              {/* INTEL TABLE */}
              <CardContent className="pt-4 pb-0 px-0">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-4 mb-2">Threat Intelligence</p>
                <div className="divide-y divide-slate-800">
                  {[
                    { label: "Ad Creatives", value: "3,076" },
                    { label: "Countries", value: "45" },
                    { label: "Celebrities Abused", value: "28" },
                    { label: "7-Day Velocity", value: "42 new creatives" },
                    { label: "Campaign Duration", value: "419 days" },
                    { label: "First Detected", value: "Feb 1, 2025" },
                    { label: "Last Active", value: "Mar 26, 2026" },
                    {
                      label: "Status",
                      value: (
                        <span className="text-red-400 font-bold flex items-center gap-1 justify-end">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                          Active Scam
                        </span>
                      )
                    },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between items-center px-4 py-2.5 hover:bg-slate-800/40 transition-colors">
                      <span className="text-slate-400 text-xs">{row.label}</span>
                      <span className="text-slate-200 text-xs font-semibold text-right">{row.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>

              {/* GEO TABLE */}
              <CardContent className="pt-4 pb-4 px-0">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-4 mb-2">Geographic Targeting</p>
                <div className="divide-y divide-slate-800">
                  {[
                    { region: "Europe", codes: "DE, ES, FR, GB, IT" },
                    { region: "Americas", codes: "BR, MX, US" },
                    { region: "Asia", codes: "IN" },
                    { region: "Oceania", codes: "AU" },
                    { region: "+41 more", codes: "ZA, RS & others" },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between items-center px-4 py-2 hover:bg-slate-800/40 transition-colors">
                      <span className="text-slate-300 text-xs font-medium">{row.region}</span>
                      <span className="text-slate-500 text-xs">{row.codes}</span>
                    </div>
                  ))}
                </div>
              </CardContent>

              {/* REGULATORY */}
              <CardContent className="pt-0 pb-4 px-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Regulatory Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {["FCA", "SEC", "ASIC", "CySEC"].map((r) => (
                    <div key={r} className="flex items-center gap-1.5 bg-red-950/30 border border-red-900/40 rounded px-2 py-1.5">
                      <X className="h-3 w-3 text-red-500" />
                      <span className="text-xs text-red-300 font-semibold">{r}: None</span>
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter className="border-t border-slate-800 pt-4 pb-4 block">
                <p className="text-xs text-slate-500 mb-3">Reviewed by Crypto Killer Research Team</p>
                <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold" size="sm">
                  Report Your Experience
                </Button>
              </CardFooter>
            </Card>

            {/* FINAL VERDICT */}
            <Card className="bg-red-950/30 border-red-800/50">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertOctagon className="h-5 w-5 text-red-400" />
                  <span className="text-red-400 font-bold text-sm uppercase tracking-wide">Final Verdict</span>
                </div>
                <p className="text-white font-semibold text-base mb-1">Quantum AI is a confirmed crypto scam.</p>
                <p className="text-red-300 font-bold">Do not deposit any money.</p>
                <Separator className="bg-red-900/40 my-3" />
                <p className="text-slate-400 text-xs">Based on analysis of 3,076 ad creatives across 45 countries between Feb 2025 – Mar 2026.</p>
              </CardContent>
            </Card>

            {/* SOURCES */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-sm text-slate-300">Sources & References</CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-2">
                {[
                  { label: "FCA Warning List", url: "fca.org.uk" },
                  { label: "SEC EDGAR Search", url: "sec.gov" },
                  { label: "ASIC Moneysmart", url: "moneysmart.gov.au" },
                  { label: "FBI IC3", url: "ic3.gov" },
                  { label: "FTC Report Fraud", url: "reportfraud.ftc.gov" },
                  { label: "Action Fraud UK", url: "actionfraud.police.uk" },
                  { label: "CySEC Warning List", url: "cysec.org.cy" },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 cursor-pointer transition-colors">
                    <ExternalLink className="h-3 w-3 text-slate-600 shrink-0" />
                    <span>{s.label}</span>
                    <span className="text-slate-600 text-xs ml-auto">{s.url}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-10 text-center mb-16 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-orange-500 to-amber-500" />
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4 opacity-80" />
          <h2 className="text-3xl font-bold text-white mb-3">Were You Targeted by Quantum AI?</h2>
          <p className="text-slate-400 max-w-2xl mx-auto mb-8 text-base leading-relaxed">
            Your report helps warn others and builds the evidence trail against this operation. If you've lost money, act quickly — chargebacks are time-sensitive.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 w-full sm:w-auto">
              Report Your Experience
            </Button>
            <Button size="lg" variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-800 w-full sm:w-auto">
              Get Recovery Guidance
            </Button>
          </div>
          <p className="text-xs text-slate-500 max-w-xl mx-auto">
            ⚠️ Beware of "recovery agents" who contact you promising to retrieve your money for an upfront fee. These are often secondary scams targeting victims of Quantum AI and similar frauds.
          </p>
        </div>

        {/* DISCLAIMER */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 mb-10 text-xs text-slate-500 leading-relaxed">
          <p className="font-bold text-slate-400 mb-2">Important Disclaimer</p>
          <p className="mb-3">
            This review covers the cryptocurrency investment scheme currently marketed under the brand name Quantum AI through 3,076 paid advertisements across 45 countries. If you encountered a different product with a similar name (such as a legitimate AI software tool) in a regulated marketplace, or if a licensed financial advisor with verifiable FCA/SEC credentials contacted you about a regulated trading product, that may be a separate entity unrelated to this analysis.
          </p>
          <p>
            This review is provided for informational and educational purposes only. It does not constitute financial, legal, or investment advice. Crypto Killer is an independent scam intelligence platform — we are not affiliated with Quantum AI, any financial regulatory body, or any cryptocurrency exchange. Threat scores are algorithmic assessments — they are not legal determinations of fraud. No court has adjudicated Quantum AI as a fraud; however, the operational patterns documented here are consistent with organized investment schemes. Victims should report suspected fraud to regulatory and law enforcement authorities in their jurisdiction.
          </p>
        </div>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-950 py-10">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-6">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-slate-600" />
              <span className="text-lg font-bold text-slate-400">
                Crypto<span className="text-slate-600">Killer</span>
              </span>
              <span className="text-slate-600 text-sm">by SpyOwl</span>
            </div>
            <div className="flex flex-wrap justify-center gap-5 text-sm text-slate-500">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
              <a href="#" className="hover:text-white transition-colors">API</a>
            </div>
          </div>
          <Separator className="bg-slate-800 mb-6" />
          <p className="text-xs text-slate-600 text-center leading-relaxed max-w-4xl mx-auto">
            © 2026 CryptoKiller / SpyOwl. All rights reserved. CryptoKiller provides investigation reports for informational purposes only. We are not a financial advisor, regulatory agency, or law enforcement body. Always conduct your own due diligence before investing. Data accuracy: analysis based on SpyOwl ad surveillance data collected 2025-02-01 to 2026-03-26.
          </p>
        </div>
      </footer>

    </div>
  );
}
