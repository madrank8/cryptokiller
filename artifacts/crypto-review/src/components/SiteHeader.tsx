import { useState } from "react";
import { Shield, AlertTriangle, Search, Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SiteHeaderProps {
  activeNav?: "home" | "investigations" | "report" | "about" | "recovery" | "blog";
}

export default function SiteHeader({ activeNav }: SiteHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-6xl">
        <a href="/" className="flex items-center gap-2">
          <div className="bg-red-600 p-1.5 rounded-md">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Crypto<span className="text-red-500">Killer</span>
          </span>
        </a>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <a
            href="/"
            className={activeNav === "home"
              ? "text-white border-b border-red-500 pb-0.5"
              : "hover:text-white transition-colors"}
          >
            Home
          </a>
          <a
            href="/investigations"
            className={activeNav === "investigations"
              ? "text-white border-b border-red-500 pb-0.5"
              : "hover:text-white transition-colors"}
          >
            Investigations
          </a>
          <a
            href="/report"
            className={activeNav === "report"
              ? "text-white border-b border-red-500 pb-0.5"
              : "hover:text-white transition-colors"}
          >
            Report a Scam
          </a>
          <a
            href="/about"
            className={activeNav === "about"
              ? "text-white border-b border-red-500 pb-0.5"
              : "hover:text-white transition-colors"}
          >
            About
          </a>
          <a
            href="/recovery"
            className={activeNav === "recovery"
              ? "text-white border-b border-red-500 pb-0.5"
              : "hover:text-white transition-colors"}
          >
            Recovery Guide
          </a>
          <a
            href="/blog"
            className={activeNav === "blog"
              ? "text-white border-b border-red-500 pb-0.5"
              : "hover:text-white transition-colors"}
          >
            Blog
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Search className="hidden md:block h-4 w-4 text-slate-400 hover:text-white cursor-pointer" />
          <Badge className="bg-red-600 hover:bg-red-700 text-white font-bold border-0 animate-pulse">
            <AlertTriangle className="h-3 w-3 mr-1" />
            SCAM ALERT
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-slate-300"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 py-3 flex flex-col gap-3">
          <a href="/" className={activeNav === "home" ? "text-white text-sm py-1" : "text-slate-300 hover:text-white text-sm py-1"}>Home</a>
          <a href="/investigations" className={activeNav === "investigations" ? "text-white text-sm py-1" : "text-slate-300 hover:text-white text-sm py-1"}>Investigations</a>
          <a href="/report" className={activeNav === "report" ? "text-white text-sm py-1" : "text-slate-300 hover:text-white text-sm py-1"}>Report a Scam</a>
          <a href="/about" className={activeNav === "about" ? "text-white text-sm py-1" : "text-slate-300 hover:text-white text-sm py-1"}>About</a>
          <a href="/recovery" className={activeNav === "recovery" ? "text-white text-sm py-1" : "text-slate-300 hover:text-white text-sm py-1"}>Recovery Guide</a>
          <a href="/blog" className={activeNav === "blog" ? "text-white text-sm py-1" : "text-slate-300 hover:text-white text-sm py-1"}>Blog</a>
        </div>
      )}
    </header>
  );
}
