import { lazy, Suspense, useMemo } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGlobalJsonLd } from "@/hooks/usePageMeta";
import { globalSiteSchema } from "@/lib/schemaBuilder";

// Route components are code-split with React.lazy so each route ships its own
// chunk instead of one site-wide application bundle (Task #44). The app is
// SSR-prerendered (crawler-visible HTML lives in #root before hydration) and
// the client mounts via createRoot, so on-demand route loading does not affect
// indexed content — it only trims what each visitor downloads per route.
const HomePage = lazy(() => import("@/pages/HomePage"));
const ReviewPage = lazy(() => import("@/pages/ReviewPage"));
const ReportPage = lazy(() => import("@/pages/ReportPage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage"));
const TermsPage = lazy(() => import("@/pages/TermsPage"));
const RecoveryPage = lazy(() => import("@/pages/RecoveryPage"));
const InvestigationsPage = lazy(() => import("@/pages/InvestigationsPage"));
const BlogPage = lazy(() => import("@/pages/BlogPage"));
const BlogPostPage = lazy(() => import("@/pages/BlogPostPage"));
const MethodologyPage = lazy(() => import("@/pages/MethodologyPage"));
const AuthorPage = lazy(() => import("@/pages/AuthorPage"));
const NotFound = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient();

// Suspense fallback while a route chunk loads. Matches the SSR shell's dark
// slate background so the swap from prerendered HTML to the React tree does not
// flash white; intentionally minimal (no spinner) to avoid layout shift.
function RouteFallback() {
  return <div className="min-h-screen bg-background" aria-hidden="true" />;
}

function Router() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Switch>
        <Route path="/" component={() => <HomePage />} />
        <Route path="/investigations" component={() => <InvestigationsPage />} />
        <Route path="/review/:slug" component={() => <ReviewPage />} />
        {/*
          Locale-prefixed review routes. URL segment is lowercase
          (`/pt-br/review/...`) but the DB and BCP-47 canonical form for the
          Portuguese (Brazil) locale is `pt-BR` — the component normalises
          the URL segment to canonical case before fetching. Unsupported
          locales are caught by validation inside ReviewPage and fall
          through to the NotFound render.
        */}
        <Route path="/:locale/review/:slug" component={() => <ReviewPage />} />
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
    </Suspense>
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
