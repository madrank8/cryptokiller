import React from "react";
import { 
  Shield, AlertTriangle, Flag, X, CheckCircle, 
  Calendar, Eye, User, Search, Menu, ExternalLink, 
  ChevronRight, Star, AlertOctagon, TrendingDown,
  Clock, ShieldAlert
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

// Helper for the custom progress bar to allow different colors
const CustomProgress = ({ value, colorClass }: { value: number, colorClass: string }) => (
  <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-800">
    <div 
      className={`h-full flex-1 transition-all ${colorClass}`}
      style={{ width: `${value}%` }}
    />
  </div>
);

export function ReviewPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-red-900 selection:text-white">
      {/* 1. Header / Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-red-600 p-1.5 rounded-md">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              CryptoScam<span className="text-red-500">Watch</span>
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <a href="#" className="hover:text-white transition-colors">Home</a>
            <a href="#" className="text-white">Investigations</a>
            <a href="#" className="hover:text-white transition-colors">Report a Scam</a>
            <a href="#" className="hover:text-white transition-colors">About</a>
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center text-slate-400 hover:text-white cursor-pointer">
              <Search className="h-4 w-4" />
            </div>
            <Badge variant="destructive" className="animate-pulse bg-red-600 hover:bg-red-700 font-bold border-0">
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
        
        {/* Breadcrumbs */}
        <div className="flex items-center text-sm text-slate-500 mb-6">
          <a href="#" className="hover:text-slate-300">Home</a>
          <ChevronRight className="h-3 w-3 mx-1" />
          <a href="#" className="hover:text-slate-300">Investigations</a>
          <ChevronRight className="h-3 w-3 mx-1" />
          <span className="text-slate-300">BitVault Pro</span>
        </div>

        {/* 2. Hero / Title Section */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white">
                  BitVault Pro
                </h1>
                <Badge className="bg-red-600 hover:bg-red-700 text-white text-sm md:text-base px-3 py-1 uppercase tracking-widest border-0 flex items-center gap-1.5 mt-2 md:mt-0">
                  <ShieldAlert className="h-4 w-4" />
                  CONFIRMED SCAM
                </Badge>
              </div>
              <p className="text-lg md:text-xl text-slate-400 max-w-3xl mt-4 leading-relaxed">
                Our investigators found multiple critical red flags and have verified hundreds of victim reports detailing systematic withdrawal denials and fake regulatory claims.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-slate-400 mb-8 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span>Published: Oct 12, 2023</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-500" />
              <span>Updated: 2 days ago</span>
            </div>
            <div className="flex items-center gap-1.5">
              <User className="h-4 w-4 text-slate-500" />
              <span>Investigator: Sarah Jenkins</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-slate-500" />
              <span>42.5k Views</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-red-500/10 p-3 rounded-full">
                  <AlertOctagon className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-400">Reports Filed</p>
                  <p className="text-3xl font-bold text-white">847</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-amber-500/10 p-3 rounded-full">
                  <TrendingDown className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-400">Estimated Losses</p>
                  <p className="text-3xl font-bold text-white">$2.4M+</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-blue-500/10 p-3 rounded-full">
                  <Clock className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-400">Active Since</p>
                  <p className="text-3xl font-bold text-white">2021</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 3. Scam Rating Panel & 4. Investigation Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          
          {/* Left Column (Span 2) */}
          <div className="lg:col-span-2 space-y-8">
            
            <section>
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2 border-b border-slate-800 pb-2">
                <AlertTriangle className="h-6 w-6 text-red-500" />
                Key Findings
              </h2>
              <div className="space-y-4">
                {[
                  { title: "No Regulatory Registration", desc: "Despite claims of being regulated by the FCA, our searches confirm no such entity is registered." },
                  { title: "Unrealistic Guarantees", desc: "Promised guaranteed returns of 300% within 30 days, which is mathematically impossible in legitimate trading." },
                  { title: "Withdrawal Blockades", desc: "Users report that all withdrawal requests are ignored or met with demands for \"advance tax payments\"." },
                  { title: "Fake Corporate Address", desc: "The listed London headquarters is a virtual office space with no actual employees present." },
                  { title: "Cloned Website Assets", desc: "Terms of Service and team photos were plagiarized directly from a legitimate European broker." }
                ].map((finding, idx) => (
                  <div key={idx} className="flex gap-4 items-start p-4 rounded-lg bg-slate-900/30 border border-slate-800/50">
                    <div className="mt-0.5 bg-red-500/10 p-1 rounded">
                      <X className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-lg">{finding.title}</h3>
                      <p className="text-slate-400 mt-1">{finding.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>

          {/* Right Column */}
          <div className="space-y-8">
            
            {/* Rating Panel */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-4 border-b border-slate-800">
                <CardTitle className="text-xl text-white">Danger Score</CardTitle>
                <div className="flex items-end gap-2 pt-2">
                  <span className="text-5xl font-black text-red-500">9.2</span>
                  <span className="text-xl text-slate-500 font-bold mb-1">/ 10</span>
                </div>
                <CustomProgress value={92} colorClass="bg-red-600" />
                <CardDescription className="text-red-400 font-medium mt-2">Extreme Risk - Do Not Deposit</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                {[
                  { label: "Withdrawal Issues", score: 9.5, color: "bg-red-600" },
                  { label: "Unregistered Operation", score: 9.0, color: "bg-red-600" },
                  { label: "Fake Promises", score: 8.8, color: "bg-red-500" },
                  { label: "Communication Blackout", score: 8.5, color: "bg-red-500" },
                  { label: "Fake Testimonials", score: 7.9, color: "bg-amber-500" },
                ].map((cat, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300 font-medium">{cat.label}</span>
                      <span className="text-slate-400 font-bold">{cat.score}</span>
                    </div>
                    <CustomProgress value={cat.score * 10} colorClass={cat.color} />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Details Table */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-4 border-b border-slate-800">
                <CardTitle className="text-lg text-white">Platform Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 px-0">
                <div className="divide-y divide-slate-800">
                  <div className="flex justify-between p-4 hover:bg-slate-800/50 transition-colors">
                    <span className="text-slate-400 text-sm">Website</span>
                    <span className="text-slate-200 text-sm font-medium flex items-center gap-1">
                      bitvault-pro.io <ExternalLink className="h-3 w-3 text-slate-500" />
                    </span>
                  </div>
                  <div className="flex justify-between p-4 hover:bg-slate-800/50 transition-colors">
                    <span className="text-slate-400 text-sm">Headquarters</span>
                    <span className="text-slate-200 text-sm font-medium">London, UK (Fake)</span>
                  </div>
                  <div className="flex justify-between p-4 hover:bg-slate-800/50 transition-colors">
                    <span className="text-slate-400 text-sm">Year Founded</span>
                    <span className="text-slate-200 text-sm font-medium">2021</span>
                  </div>
                  <div className="flex justify-between p-4 hover:bg-slate-800/50 transition-colors">
                    <span className="text-slate-400 text-sm">Regulatory Status</span>
                    <Badge variant="outline" className="text-red-400 border-red-900 bg-red-950/30">Unregulated</Badge>
                  </div>
                  <div className="flex justify-between p-4 hover:bg-slate-800/50 transition-colors">
                    <span className="text-slate-400 text-sm">Minimum Deposit</span>
                    <span className="text-slate-200 text-sm font-medium">$250</span>
                  </div>
                  <div className="flex justify-between p-4 hover:bg-slate-800/50 transition-colors">
                    <span className="text-slate-400 text-sm">Status</span>
                    <span className="text-red-400 text-sm font-bold flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                      Actively Scamming
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

        {/* 6. Red Flags Checklist */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2 border-b border-slate-800 pb-2">
            <Flag className="h-6 w-6 text-red-500" />
            Common Red Flags Displayed
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              "Unregistered with any financial authority",
              "Promises of guaranteed returns (300%+)",
              "Withdrawal requests repeatedly denied",
              "No verifiable team members",
              "Fake regulatory seals displayed",
              "Pressure tactics and urgency messaging"
            ].map((flag, idx) => (
              <Card key={idx} className="bg-slate-900/80 border-red-900/30 shadow-[0_0_15px_rgba(220,38,38,0.05)]">
                <CardContent className="p-5 flex items-start gap-3">
                  <Flag className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-slate-200 text-sm font-medium leading-relaxed">{flag}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 5. Victim Testimonials Section */}
        <div className="mb-16">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <User className="h-6 w-6 text-slate-400" />
              Victim Reports <span className="text-slate-500 text-lg font-normal">(847)</span>
            </h2>
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 hidden sm:flex">
              View All Reports
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "John D.",
                loc: "Australia",
                lost: "$12,500",
                date: "Oct 2, 2023",
                initials: "JD",
                text: "Started with the $250 minimum. They showed me fake profits and pressured me to add more. When I tried to withdraw, they demanded a 20% 'tax fee' upfront. Total scam."
              },
              {
                name: "Maria S.",
                loc: "Spain",
                lost: "€8,200",
                date: "Sep 28, 2023",
                initials: "MS",
                text: "My account manager 'David' was very nice until I asked for a withdrawal. Then he became aggressive and stopped answering my calls. My account is now locked."
              },
              {
                name: "Anonymous",
                loc: "Canada",
                lost: "$45,000",
                date: "Sep 15, 2023",
                initials: "AN",
                text: "They cloned a real trading platform interface perfectly. I lost my retirement savings. They use AnyDesk to 'help' you set up the account but steal your crypto directly."
              }
            ].map((report, idx) => (
              <Card key={idx} className="bg-slate-900 border-slate-800 flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-slate-700">
                        <AvatarFallback className="bg-slate-800 text-slate-300">{report.initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-bold text-slate-200">{report.name}</p>
                        <p className="text-xs text-slate-500">{report.loc}</p>
                      </div>
                    </div>
                    <div className="flex text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i === 0 ? 'fill-amber-500' : 'text-slate-700'}`} />
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="bg-red-950/30 border border-red-900/50 rounded px-2 py-1 inline-block mb-3">
                    <span className="text-xs font-semibold text-red-400">Reported Loss: {report.lost}</span>
                  </div>
                  <p className="text-sm text-slate-300 italic leading-relaxed">"{report.text}"</p>
                </CardContent>
                <CardFooter className="pt-0 pb-4 text-xs text-slate-500">
                  Reported on {report.date}
                </CardFooter>
              </Card>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-4 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 sm:hidden">
            View All Reports
          </Button>
        </div>

        {/* 7. Action / CTA Section */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-8 text-center mb-16 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-amber-500"></div>
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4 opacity-80" />
          <h2 className="text-3xl font-bold text-white mb-4">Were You Affected by BitVault Pro?</h2>
          <p className="text-slate-400 max-w-2xl mx-auto mb-8 text-lg">
            Your report helps warn others and builds the case against these fraudsters. If you've lost money, learn about the realistic steps for recovery.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 w-full sm:w-auto">
              Report Your Experience
            </Button>
            <Button size="lg" variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-800 w-full sm:w-auto">
              Get Recovery Guidance
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-6 max-w-xl mx-auto">
            Disclaimer: Beware of "recovery agents" who contact you promising to get your money back for an upfront fee. These are often secondary scams targeting victims.
          </p>
        </div>

      </main>

      {/* 8. Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-slate-600" />
              <span className="text-xl font-bold tracking-tight text-slate-400">
                CryptoScam<span className="text-slate-600">Watch</span>
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
              <a href="#" className="hover:text-white transition-colors">API</a>
            </div>
          </div>
          
          <Separator className="bg-slate-800 mb-8" />
          
          <div className="text-xs text-slate-500 text-center md:text-left leading-relaxed max-w-4xl">
            <p className="mb-2">
              © {new Date().getFullYear()} CryptoScamWatch. All rights reserved.
            </p>
            <p>
              CryptoScamWatch provides investigation reports for informational purposes only. We are not a financial advisor, regulatory agency, or law enforcement body. The information provided on this website is based on user reports, public data, and independent investigation. While we strive for accuracy, we cannot guarantee that all information is complete or up-to-date. Always conduct your own due diligence before investing.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
