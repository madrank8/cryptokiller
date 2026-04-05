import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import HomePage from "@/pages/HomePage";
import ReviewPage from "@/pages/ReviewPage";
import ReportPage from "@/pages/ReportPage";
import AboutPage from "@/pages/AboutPage";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import RecoveryPage from "@/pages/RecoveryPage";
import InvestigationsPage from "@/pages/InvestigationsPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <HomePage />} />
      <Route path="/investigations" component={() => <InvestigationsPage />} />
      <Route path="/review/:slug" component={() => <ReviewPage />} />
      <Route path="/report" component={() => <ReportPage />} />
      <Route path="/about" component={() => <AboutPage />} />
      <Route path="/privacy" component={() => <PrivacyPage />} />
      <Route path="/terms" component={() => <TermsPage />} />
      <Route path="/recovery" component={() => <RecoveryPage />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
