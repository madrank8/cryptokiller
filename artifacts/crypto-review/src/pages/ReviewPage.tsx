import { useState } from "react";
import { useParams } from "wouter";
import { useGetReview } from "@workspace/api-client-react";
import {
  Shield, AlertTriangle, Flag, X, CheckCircle,
  Calendar, Eye, User, ExternalLink,
  ChevronRight, AlertOctagon,
  Clock, ShieldAlert, Globe, Lock, Scale,
  BookOpen, FileText, ChevronDown, ChevronUp,
  BarChart2, Microscope, MapPin, Phone, ArrowRight,
  Megaphone, Target, TrendingUp, Siren
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import SiteHeader from "@/components/SiteHeader";

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

const stageConfig = [
  { iconBg: "bg-orange-600", border: "border-orange-800/40", bgCard: "bg-orange-950/20", labelColor: "text-orange-400", icon: <Megaphone className="h-5 w-5" /> },
  { iconBg: "bg-amber-600", border: "border-amber-800/40", bgCard: "bg-amber-950/20", labelColor: "text-amber-400", icon: <Target className="h-5 w-5" /> },
  { iconBg: "bg-red-600", border: "border-red-800/40", bgCard: "bg-red-950/20", labelColor: "text-red-400", icon: <TrendingUp className="h-5 w-5" /> },
  { iconBg: "bg-rose-700", border: "border-rose-700/50", bgCard: "bg-rose-950/30", labelColor: "text-rose-400", icon: <Siren className="h-5 w-5" /> },
];

function ReviewSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
        <Skeleton className="h-8 w-64 bg-slate-800" />
        <Skeleton className="h-20 w-full bg-slate-800" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 bg-slate-800 rounded-xl" />)}
        </div>
        <Skeleton className="h-48 bg-slate-800 rounded-xl" />
        <Skeleton className="h-64 bg-slate-800 rounded-xl" />
      </div>
    </div>
  );
}

function NotFoundPage({ slug }: { slug: string }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <AlertOctagon className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-white mb-2">Review Not Found</h1>
        <p className="text-slate-400">No investigation data found for "{slug}".</p>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  const params = useParams<{ slug?: string }>();
  const slug = params.slug ?? "quantum-ai";

  const { data: review, isLoading, error } = useGetReview(slug);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  if (isLoading) return <ReviewSkeleton />;
  if (error || !review) return <NotFoundPage slug={slug} />;

  const formattedDate = new Date(review.investigationDate).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-red-900 selection:text-white">

      <SiteHeader activeNav="investigations" />

      <main className="container mx-auto px-4 py-8 max-w-6xl">

        {/* BREADCRUMB */}
        <div className="flex items-center text-sm text-slate-500 mb-6">
          <a href="#" className="hover:text-slate-300">Home</a>
          <ChevronRight className="h-3 w-3 mx-1" />
          <a href="#" className="hover:text-slate-300">Investigations</a>
          <ChevronRight className="h-3 w-3 mx-1" />
          <span className="text-slate-300">{review.platformName}</span>
        </div>

        {/* HERO */}
        <div className="mb-10">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white">{review.platformName}</h1>
            <Badge className="bg-red-600 text-white text-sm px-3 py-1.5 uppercase tracking-widest border-0 flex items-center gap-1.5 shrink-0">
              <ShieldAlert className="h-4 w-4" />
              CONFIRMED SCAM
            </Badge>
          </div>

          <p className="text-lg text-slate-300 max-w-4xl leading-relaxed mb-6"
            dangerouslySetInnerHTML={{ __html: review.heroDescription.replace(
              /(\d[\d,]+)\s*(ad creatives|fraudulent advertisements|threat score|countries|days|celebrities)/gi,
              '<strong class="text-white">$&</strong>'
            ).replace(/\d+\/100 threat score/gi, '<span class="text-red-400 font-bold">$&</span>') }}
          />

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-400 mb-8 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span>Published: {formattedDate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-500" />
              <span>{review.wordCount.toLocaleString()} words · {review.readingMinutes} min read</span>
            </div>
            <div className="flex items-center gap-1.5">
              <User className="h-4 w-4 text-slate-500" />
              <span>{review.author}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-slate-500" />
              <span>SpyOwl Ad Surveillance</span>
            </div>
          </div>

          {/* KEY STATS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
            {[
              { icon: <BarChart2 className="h-6 w-6 text-red-500" />, bg: "bg-red-500/10", label: "Ad Creatives", value: review.adCreatives.toLocaleString() },
              { icon: <Globe className="h-6 w-6 text-amber-500" />, bg: "bg-amber-500/10", label: "Countries Targeted", value: review.countriesTargeted.toString() },
              { icon: <Clock className="h-6 w-6 text-orange-400" />, bg: "bg-orange-500/10", label: "Days Active", value: review.daysActive.toString() },
              { icon: <User className="h-6 w-6 text-blue-400" />, bg: "bg-blue-500/10", label: "Celebrities Abused", value: review.celebritiesAbused.toString() },
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

        {/* KEY TAKEAWAYS — from summary bullet points */}
        <div className="mb-12 bg-red-950/20 border border-red-900/40 rounded-xl p-6">
          <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
            <AlertOctagon className="h-5 w-5" /> Key Takeaways
          </h3>
          <ul className="space-y-3">
            {review.summary.split("\n").filter(Boolean).map((point, i) => (
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
              {review.heroDescription.split("\n\n").map((para, i) => (
                <p key={i} className="text-slate-300 leading-relaxed mb-4">{para}</p>
              ))}
              {review.warningCallout && (
                <div className="bg-slate-900 border border-red-900/50 rounded-lg p-4 mt-4">
                  <p className="text-red-300 text-sm font-semibold leading-relaxed">
                    ⚠️ {review.warningCallout}
                  </p>
                </div>
              )}
            </section>

            {/* HOW THIS SCAM WORKS */}
            {review.funnelStages.length > 0 && (
              <section>
                <SectionTitle icon={<Microscope className="h-6 w-6" />}>How This Scam Works</SectionTitle>
                <p className="text-slate-400 text-sm mb-8">
                  {review.platformName} deploys a <span className="text-white font-semibold">four-stage confidence scheme</span> targeting retail investors. Each stage advances the victim deeper into the trap.
                </p>

                <div className="relative">
                  <div className="absolute left-[27px] top-12 bottom-12 w-0.5 bg-gradient-to-b from-orange-600 via-red-600 to-red-900 hidden md:block" />
                  <div className="space-y-4">
                    {review.funnelStages.map((stage, i) => {
                      const cfg = stageConfig[i] ?? stageConfig[3];
                      return (
                        <div key={i} className={`relative flex gap-0 md:gap-6 rounded-2xl ${cfg.bgCard} border ${cfg.border} overflow-hidden`}>
                          <div className={`hidden md:block w-1 shrink-0 ${cfg.iconBg} opacity-60`} />
                          <div className="flex-1 p-6">
                            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                              <div className="flex items-center gap-3 sm:flex-col sm:items-center sm:gap-1 shrink-0">
                                <div className={`w-10 h-10 rounded-xl ${cfg.iconBg} flex items-center justify-center text-white shadow-lg shrink-0`}>
                                  {cfg.icon}
                                </div>
                                <span className={`text-xs font-black uppercase tracking-widest ${cfg.labelColor} sm:text-center`}>
                                  Stage {stage.stageNumber}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-white text-lg leading-snug mb-4">{stage.title}</h3>
                                <ul className="space-y-2.5 mb-4">
                                  {stage.bullets.map((bullet, bi) => (
                                    <li key={bi} className="flex items-start gap-2.5 text-sm text-slate-300 leading-relaxed">
                                      <div className={`mt-1.5 w-1.5 h-1.5 rounded-full ${cfg.iconBg} shrink-0`} />
                                      {bullet}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              {stage.statValue && (
                                <div className={`shrink-0 rounded-xl border ${cfg.border} bg-slate-950/50 px-4 py-3 text-center min-w-[110px]`}>
                                  <p className={`text-xl font-black ${cfg.labelColor} leading-tight`}>{stage.statValue}</p>
                                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">{stage.statLabel}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* RED FLAGS */}
            {review.redFlags.length > 0 && (
              <section>
                <SectionTitle icon={<Flag className="h-6 w-6" />}>Red Flags</SectionTitle>
                <div className="space-y-4">
                  {review.redFlags.map((flag, i) => (
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
                          <p className="text-slate-400 text-sm leading-relaxed">{flag.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* KEY FINDINGS */}
            {review.keyFindings.length > 0 && (
              <section>
                <SectionTitle icon={<Microscope className="h-6 w-6" />}>Key Investigation Findings</SectionTitle>
                <div className="space-y-4">
                  {review.keyFindings.map((finding, i) => (
                    <div key={i} className="flex gap-3 items-start p-4 rounded-lg bg-slate-900/40 border border-slate-800/50">
                      <div className="shrink-0 mt-0.5 w-5 h-5 rounded bg-amber-950/60 border border-amber-800/50 flex items-center justify-center">
                        <span className="text-amber-400 text-xs font-bold">{i + 1}</span>
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed">{finding.content}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

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
            {review.faqItems.length > 0 && (
              <section>
                <SectionTitle icon={<BookOpen className="h-6 w-6" />}>Frequently Asked Questions</SectionTitle>
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
                  {review.faqItems.map((faq, i) => (
                    <div key={i} className="bg-slate-900/50">
                      <button
                        className="w-full text-left flex items-center justify-between gap-4 p-5 hover:bg-slate-800/40 transition-colors"
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      >
                        <span className="font-semibold text-white text-sm">{faq.question}</span>
                        {openFaq === i
                          ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                          : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
                      </button>
                      {openFaq === i && (
                        <div className="px-5 pb-5">
                          <p className="text-slate-400 text-sm leading-relaxed">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* METHODOLOGY */}
            {review.methodologyText && (
              <section>
                <SectionTitle icon={<Microscope className="h-6 w-6" />}>Our Investigation Methodology</SectionTitle>
                {review.methodologyText.split("\n\n").map((para, i) => (
                  <p key={i} className="text-slate-400 text-sm leading-relaxed mb-4">{para}</p>
                ))}
              </section>
            )}

          </div>

          {/* RIGHT SIDEBAR */}
          <div className="space-y-6">
            <Card className="bg-slate-900 border-slate-800 lg:sticky lg:top-20">
              <CardHeader className="pb-4 border-b border-slate-800">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-red-500" /> Threat Score
                </CardTitle>
                <div className="flex items-end gap-2 pt-2">
                  <span className="text-6xl font-black text-red-500">{review.threatScore}</span>
                  <span className="text-xl text-slate-500 font-bold mb-2">/ 100</span>
                </div>
                <CustomProgress value={review.threatScore} colorClass="bg-red-600" />
                <p className="text-red-400 font-semibold text-sm mt-2">Extreme Risk — Do Not Deposit</p>
              </CardHeader>

              <CardContent className="pt-4 pb-0 px-0">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-4 mb-2">Threat Intelligence</p>
                <div className="divide-y divide-slate-800">
                  {[
                    { label: "Ad Creatives", value: review.adCreatives.toLocaleString() },
                    { label: "Countries", value: review.countriesTargeted.toString() },
                    { label: "Celebrities Abused", value: review.celebritiesAbused.toString() },
                    { label: "7-Day Velocity", value: `${review.weeklyVelocity} new creatives` },
                    { label: "Campaign Duration", value: `${review.daysActive} days` },
                    { label: "First Detected", value: review.firstDetected },
                    { label: "Last Active", value: review.lastActive },
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

              {review.geoTargets.length > 0 && (
                <CardContent className="pt-4 pb-4 px-0">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-4 mb-2">Geographic Targeting</p>
                  <div className="divide-y divide-slate-800">
                    {review.geoTargets.map((geo, i) => (
                      <div key={i} className="flex justify-between items-center px-4 py-2 hover:bg-slate-800/40 transition-colors">
                        <span className="text-slate-300 text-xs font-medium">{geo.region}</span>
                        <span className="text-slate-500 text-xs">{geo.countryCodes}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}

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
                <p className="text-xs text-slate-500 mb-3">Reviewed by {review.author}</p>
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
                <p className="text-white font-semibold text-base mb-1">{review.platformName} is a confirmed crypto scam.</p>
                <p className="text-red-300 font-bold">{review.verdict}</p>
                <Separator className="bg-red-900/40 my-3" />
                <p className="text-slate-400 text-xs">Based on analysis of {review.adCreatives.toLocaleString()} ad creatives across {review.countriesTargeted} countries.</p>
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
          <h2 className="text-3xl font-bold text-white mb-3">Were You Targeted by {review.platformName}?</h2>
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
            ⚠️ Beware of "recovery agents" who contact you promising to retrieve your money for an upfront fee. These are often secondary scams targeting victims.
          </p>
        </div>

        {/* DISCLAIMER */}
        {review.disclaimerText && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 mb-10 text-xs text-slate-500 leading-relaxed">
            <p className="font-bold text-slate-400 mb-2">Important Disclaimer</p>
            <p>{review.disclaimerText}</p>
          </div>
        )}

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
            © 2026 CryptoKiller / SpyOwl. All rights reserved. CryptoKiller provides investigation reports for informational purposes only.
          </p>
        </div>
      </footer>

    </div>
  );
}
