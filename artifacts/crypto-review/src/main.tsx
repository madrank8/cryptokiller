import { createRoot } from "react-dom/client";
import App from "./App";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "./index.css";

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
