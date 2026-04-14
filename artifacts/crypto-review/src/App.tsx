import { useMemo } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGlobalJsonLd } from "@/hooks/usePageMeta";
import { globalSiteSchema } from "@/lib/schemaBuilder";
import HomePage from "@/pages/HomePage";
import ReviewPage from "@/pages/ReviewPage";
import ReportPage from "@/pages/ReportPage";
import AboutPage from "@/pages/AboutPage";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import RecoveryPage from "@/pages/RecoveryPage";
import InvestigationsPage from "@/pages/InvestigationsPage";
import BlogPage from "@/pages/BlogPage";
import BlogPostPage from "@/pages/BlogPostPage";
import MethodologyPage from "@/pages/MethodologyPage";
import AuthorPage from "@/pages/AuthorPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <HomePage />} />
      <Route path="/investigations" component={() => <InvestigationsPage />} />
      <Route path="/review/:slug" component={() => <ReviewPage />} />
      <Route path="/blog" component={() => <BlogPage />} />
      <Route path="/blog/:slug" component={() => <BlogPostPage />} />
      <Route path="/report" component={() => <ReportPage />} />
      <Route path="/about" component={() => <AboutPage />} />
      <Route path="/author/:slug" component={() => <AuthorPage />} />
      <Route path="/privacy" component={() => <PrivacyPage />} />
      <Route path="/terms" component={() => <TermsPage />} />
      <Route path="/methodology" component={() => <MethodologyPage />} />
      <Route path="/recovery" component={() => <RecoveryPage />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function GlobalSchema() {
  const schema = useMemo(() => globalSiteSchema(), []);
  useGlobalJsonLd(schema);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <GlobalSchema />
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
