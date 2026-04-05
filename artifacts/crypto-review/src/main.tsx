import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if (
  import.meta.env.PROD &&
  !sessionStorage.getItem("ck_sitemap_pinged")
) {
  fetch(
    "https://www.google.com/ping?sitemap=https://cryptokiller.org/sitemap.xml",
    { mode: "no-cors" }
  ).catch(() => {});
  sessionStorage.setItem("ck_sitemap_pinged", "1");
}

createRoot(document.getElementById("root")!).render(<App />);
