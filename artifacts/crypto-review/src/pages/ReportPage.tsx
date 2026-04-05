import { useState } from "react";
import { useSubmitReport } from "@workspace/api-client-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import {
  Shield, AlertTriangle, Send, CheckCircle, FileText,
  Globe, DollarSign, Mail, MessageSquare, Link2, MapPin,
  ShieldAlert, Lock, Eye
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/SiteHeader";
import Breadcrumbs, { breadcrumbJsonLd } from "@/components/Breadcrumbs";

const scamTypes = [
  { value: "crypto_investment", label: "Crypto Investment Scam" },
  { value: "celebrity_impersonation", label: "Celebrity Impersonation" },
  { value: "fake_exchange", label: "Fake Exchange" },
  { value: "ponzi_scheme", label: "Ponzi / Pyramid Scheme" },
  { value: "phishing", label: "Phishing / Fake Website" },
  { value: "rug_pull", label: "Rug Pull / DeFi Scam" },
  { value: "romance_scam", label: "Romance / Pig Butchering" },
  { value: "other", label: "Other" },
];

const currencies = ["USD", "EUR", "GBP", "AUD", "CAD", "BTC", "ETH", "USDT"];

export default function ReportPage() {
  const crumbs = [
    { label: "Home", href: "https://cryptokiller.org/" },
    { label: "Report a Scam", href: "https://cryptokiller.org/report" },
  ];

  usePageMeta({
    title: "Report a Crypto Scam — Submit Evidence | CryptoKiller",
    description: "Report a crypto scam to CryptoKiller. Your confidential report helps us investigate fraudulent platforms, warn victims, and build evidence for authorities.",
    canonical: "https://cryptokiller.org/report",
    jsonLd: { "@context": "https://schema.org", ...breadcrumbJsonLd(crumbs) },
  });

  const { mutateAsync: submitReport, isPending } = useSubmitReport();
  const [submitted, setSubmitted] = useState(false);
  const [reportId, setReportId] = useState<number | null>(null);

  const [form, setForm] = useState({
    platformName: "",
    platformUrl: "",
    scamType: "crypto_investment",
    description: "",
    amountLost: "",
    currency: "USD",
    contactMethod: "",
    country: "",
    evidenceUrls: "",
    reporterEmail: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.platformName.trim()) e.platformName = "Platform name is required";
    if (!form.description.trim()) e.description = "Please describe what happened";
    if (form.description.trim().length < 20) e.description = "Please provide more detail (at least 20 characters)";
    if (form.reporterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.reporterEmail)) {
      e.reporterEmail = "Invalid email address";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;

    try {
      const result = await submitReport({ data: form });
      setReportId(result.reportId);
      setSubmitted(true);
    } catch {
      setErrors({ _form: "Something went wrong. Please try again." });
    }
  }

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 font-sans">
        <SiteHeader activeNav="report" />
        <main className="container mx-auto px-4 py-16 max-w-2xl text-center">
          <div className="bg-green-950/30 border border-green-800/50 rounded-2xl p-12">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
            <h1 className="text-3xl font-black text-white mb-3">Report Submitted</h1>
            <p className="text-slate-300 mb-2">
              Thank you for helping protect others. Your report has been recorded.
            </p>
            <p className="text-slate-500 text-sm mb-8">
              Report ID: <span className="text-green-400 font-mono font-bold">#{reportId}</span>
            </p>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-left mb-8">
              <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-400" /> What happens next
              </h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex gap-2 items-start">
                  <span className="text-green-500 mt-0.5">1.</span>
                  Our team reviews your report and cross-references it with our ad intelligence database
                </li>
                <li className="flex gap-2 items-start">
                  <span className="text-green-500 mt-0.5">2.</span>
                  If verified, the platform is added to our tracking system and assigned a threat score
                </li>
                <li className="flex gap-2 items-start">
                  <span className="text-green-500 mt-0.5">3.</span>
                  A full investigation review is published to warn other potential victims
                </li>
              </ul>
            </div>
            <div className="flex gap-3 justify-center">
              <Button asChild className="bg-slate-800 hover:bg-slate-700 text-white">
                <a href="/">Back to Home</a>
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => { setSubmitted(false); setForm({ platformName: "", platformUrl: "", scamType: "crypto_investment", description: "", amountLost: "", currency: "USD", contactMethod: "", country: "", evidenceUrls: "", reporterEmail: "" }); }}
              >
                Submit Another Report
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-red-900 selection:text-white">
      <SiteHeader activeNav="report" />

      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <Breadcrumbs items={[
          { label: "Home", href: "/" },
          { label: "Report a Scam" },
        ]} />

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-800/40 text-red-400 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Help Us Protect Others
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            Report a <span className="text-red-500">Scam</span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Your report helps us investigate fraudulent crypto platforms, warn potential victims,
            and build evidence that authorities can use. Every report matters.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {[
            { icon: <Lock className="h-5 w-5" />, color: "text-green-400", bg: "bg-green-500/10 border-green-900/30", title: "100% Confidential", desc: "Your identity is never shared publicly" },
            { icon: <Eye className="h-5 w-5" />, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-900/30", title: "Expert Review", desc: "Cross-referenced with our scam intelligence systems" },
            { icon: <Shield className="h-5 w-5" />, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-900/30", title: "Actionable Results", desc: "Reports feed into published investigations" },
          ].map((item, i) => (
            <div key={i} className={`flex items-center gap-3 p-4 rounded-xl border ${item.bg}`}>
              <div className={item.color}>{item.icon}</div>
              <div>
                <p className="text-white font-semibold text-sm">{item.title}</p>
                <p className="text-slate-500 text-xs">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="bg-slate-900/60 border-slate-800 mb-6">
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="text-white font-bold text-base mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Scam Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Platform / Brand Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                      <input
                        type="text"
                        value={form.platformName}
                        onChange={(e) => updateField("platformName", e.target.value)}
                        placeholder="e.g. Quantum AI, BitConnect"
                        className={`w-full pl-10 pr-4 py-3 bg-slate-950 border ${errors.platformName ? "border-red-600" : "border-slate-700"} rounded-lg text-white text-sm placeholder:text-slate-600 focus:border-red-500 focus:outline-none transition-colors`}
                      />
                    </div>
                    {errors.platformName && <p className="text-red-400 text-xs mt-1">{errors.platformName}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Website URL
                    </label>
                    <div className="relative">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                      <input
                        type="text"
                        value={form.platformUrl}
                        onChange={(e) => updateField("platformUrl", e.target.value)}
                        placeholder="https://..."
                        className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm placeholder:text-slate-600 focus:border-red-500 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Type of Scam
                </label>
                <div className="relative">
                  <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                  <select
                    value={form.scamType}
                    onChange={(e) => updateField("scamType", e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:border-red-500 focus:outline-none transition-colors appearance-none cursor-pointer"
                  >
                    {scamTypes.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  What Happened? <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-slate-600" />
                  <textarea
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder="Describe how the scam operated, how you were contacted, what promises were made, and what happened when you tried to withdraw..."
                    rows={5}
                    className={`w-full pl-10 pr-4 py-3 bg-slate-950 border ${errors.description ? "border-red-600" : "border-slate-700"} rounded-lg text-white text-sm placeholder:text-slate-600 focus:border-red-500 focus:outline-none transition-colors resize-none`}
                  />
                </div>
                {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800 mb-6">
            <CardContent className="p-6 space-y-6">
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-amber-500" />
                Financial Impact
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Amount Lost (approximate)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                    <input
                      type="text"
                      value={form.amountLost}
                      onChange={(e) => updateField("amountLost", e.target.value)}
                      placeholder="e.g. 5,000"
                      className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm placeholder:text-slate-600 focus:border-red-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Currency
                  </label>
                  <select
                    value={form.currency}
                    onChange={(e) => updateField("currency", e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:border-red-500 focus:outline-none transition-colors appearance-none cursor-pointer"
                  >
                    {currencies.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800 mb-6">
            <CardContent className="p-6 space-y-6">
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-400" />
                Additional Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    How Were You Contacted?
                  </label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                    <input
                      type="text"
                      value={form.contactMethod}
                      onChange={(e) => updateField("contactMethod", e.target.value)}
                      placeholder="e.g. Facebook ad, WhatsApp, Instagram DM"
                      className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm placeholder:text-slate-600 focus:border-red-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Your Country
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                    <input
                      type="text"
                      value={form.country}
                      onChange={(e) => updateField("country", e.target.value)}
                      placeholder="e.g. United Kingdom"
                      className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm placeholder:text-slate-600 focus:border-red-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Evidence URLs
                </label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-3 h-4 w-4 text-slate-600" />
                  <textarea
                    value={form.evidenceUrls}
                    onChange={(e) => updateField("evidenceUrls", e.target.value)}
                    placeholder="Paste links to screenshots, archived pages, social media posts (one per line)"
                    rows={3}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm placeholder:text-slate-600 focus:border-red-500 focus:outline-none transition-colors resize-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800 mb-8">
            <CardContent className="p-6">
              <h3 className="text-white font-bold text-base mb-4 flex items-center gap-2">
                <Mail className="h-4 w-4 text-green-400" />
                Contact (Optional)
              </h3>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Your Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                  <input
                    type="email"
                    value={form.reporterEmail}
                    onChange={(e) => updateField("reporterEmail", e.target.value)}
                    placeholder="only if you want us to follow up"
                    className={`w-full pl-10 pr-4 py-3 bg-slate-950 border ${errors.reporterEmail ? "border-red-600" : "border-slate-700"} rounded-lg text-white text-sm placeholder:text-slate-600 focus:border-red-500 focus:outline-none transition-colors`}
                  />
                </div>
                {errors.reporterEmail && <p className="text-red-400 text-xs mt-1">{errors.reporterEmail}</p>}
                <p className="text-slate-600 text-xs mt-1.5 flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Your email is never shared or published
                </p>
              </div>
            </CardContent>
          </Card>

          {errors._form && (
            <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-4 mb-6">
              <p className="text-red-400 text-sm font-semibold">{errors._form}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <p className="text-slate-600 text-xs max-w-md">
              By submitting this report, you confirm the information is accurate to the best of your knowledge.
              Reports may be used in published investigations.
            </p>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3 text-base shrink-0"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Submit Report
                </span>
              )}
            </Button>
          </div>
        </form>

        <div className="mt-16 border-t border-slate-800 pt-10 pb-8 text-center">
          <p className="text-slate-500 text-sm mb-2">Need immediate help?</p>
          <div className="flex flex-wrap justify-center gap-4 text-xs">
            <a href="https://www.ic3.gov" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">FBI IC3 (USA)</a>
            <a href="https://www.actionfraud.police.uk" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">Action Fraud (UK)</a>
            <a href="https://www.scamwatch.gov.au" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">ScamWatch (AU)</a>
            <a href="https://reportfraud.ftc.gov" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">FTC (USA)</a>
          </div>
        </div>
      </main>
    </div>
  );
}
