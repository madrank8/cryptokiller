import { createRoot } from "react-dom/client";
import App from "./App";
import { initAnalytics } from "./lib/analytics";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "./index.css";

// Google Analytics (production-only; no-op in dev). Initialised before render
// so the AnalyticsTracker's first page_view finds gtag ready.
initAnalytics();

if (
  import.meta.env.PROD &&
  !sessionStorage.getItem("ck_sitemap_pinged")
) {
  fetch(
    "https://www.google.com/ping?sitemap=https://cryptokiller.org/api/sitemap.xml",
    { mode: "no-cors" }
  ).catch(() => {});
  sessionStorage.setItem("ck_sitemap_pinged", "1");
}

createRoot(document.getElementById("root")!).render(<App />);
