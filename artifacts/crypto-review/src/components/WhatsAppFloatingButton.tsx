import { useState } from "react";

const WHATSAPP_URL =
  "https://wa.me/14155238886?text=Hi%20CryptoKiller%2C%20I%20want%20to%20check%20a%20crypto%20platform";

export default function WhatsAppFloatingButton() {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full shadow-lg shadow-black/30 transition-all duration-300 hover:shadow-xl hover:shadow-black/40"
      style={{ backgroundColor: "#25D366" }}
      aria-label="Contact us on WhatsApp"
    >
      <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
        <svg viewBox="0 0 32 32" className="w-7 h-7 fill-white">
          <path d="M16.004 3.2C9.01 3.2 3.33 8.88 3.33 15.87c0 2.24.59 4.42 1.7 6.34L3.2 28.8l6.81-1.79a12.59 12.59 0 006 1.53h.01c6.99 0 12.67-5.68 12.67-12.67 0-3.38-1.32-6.56-3.71-8.95a12.6 12.6 0 00-8.95-3.72zm0 23.17a10.45 10.45 0 01-5.34-1.46l-.38-.23-3.97 1.04 1.06-3.87-.25-.39a10.48 10.48 0 01-1.6-5.59c0-5.8 4.72-10.52 10.53-10.52 2.81 0 5.45 1.1 7.44 3.08a10.46 10.46 0 013.08 7.44c0 5.81-4.72 10.53-10.53 10.53zm5.77-7.88c-.32-.16-1.87-.92-2.16-1.03-.29-.1-.5-.16-.71.16-.21.32-.82 1.03-1.01 1.24-.18.21-.37.24-.69.08-.32-.16-1.34-.49-2.56-1.57-.94-.84-1.58-1.88-1.77-2.2-.18-.32-.02-.49.14-.65.14-.14.32-.37.47-.56.16-.18.21-.32.32-.53.1-.21.05-.4-.03-.56-.08-.16-.71-1.71-.97-2.34-.26-.62-.52-.53-.71-.54h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.09-1.11 2.65 0 1.56 1.14 3.07 1.3 3.28.16.21 2.24 3.42 5.43 4.79.76.33 1.35.52 1.81.67.76.24 1.46.21 2.01.13.61-.09 1.87-.77 2.14-1.51.26-.74.26-1.38.18-1.51-.08-.13-.29-.21-.61-.37z" />
        </svg>
        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-slate-950 animate-pulse" />
      </div>
      {hovered && (
        <span className="pr-4 text-white text-sm font-semibold whitespace-nowrap">
          Check a Scam on WhatsApp
        </span>
      )}
    </a>
  );
}
