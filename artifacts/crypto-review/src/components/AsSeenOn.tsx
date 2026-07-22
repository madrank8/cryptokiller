const PR_SLUG = "cryptokiller-launches-real-time-global-database-to-expose-crypto-trading-fraud";

type PressItem = {
  name: string;
  href: string;
  /** Self-hosted logo under /press/ — omitted for masthead-style outlets rendered as wordmarks. */
  logo?: string;
  /** Tailwind height class tuned per logo aspect ratio. */
  heightClass?: string;
};

const PRESS_ITEMS: PressItem[] = [
  {
    name: "KWWL",
    href: `https://kwwl.marketminute.com/article/marketersmedia-2026-7-21-${PR_SLUG}`,
    logo: "/press/kwwl.svg",
    heightClass: "h-11",
  },
  {
    name: "The Daily Dispatcher",
    href: `https://dailydispatcher.com/news/${PR_SLUG}/556941`,
  },
  {
    name: "KTTC",
    href: `https://kttc.marketminute.com/article/marketersmedia-2026-7-21-${PR_SLUG}`,
    logo: "/press/kttc.svg",
    heightClass: "h-6",
  },
  {
    name: "NY Headline",
    href: `https://nyheadline.com/press/${PR_SLUG}/162560`,
  },
  {
    name: "WGEM",
    href: `https://wgem.marketminute.com/article/marketersmedia-2026-7-21-${PR_SLUG}`,
    logo: "/press/wgem.svg",
    heightClass: "h-6",
  },
  {
    name: "The Headline",
    href: `https://intheheadline.com/news/${PR_SLUG}/556941`,
  },
  {
    name: "KTIV",
    href: `https://ktiv.marketminute.com/article/marketersmedia-2026-7-21-${PR_SLUG}`,
    logo: "/press/ktiv.svg",
    heightClass: "h-9",
  },
  {
    name: "Market Sanctum",
    href: `https://marketsanctum.com/news/${PR_SLUG}/556941`,
  },
  {
    name: "KXLT Fox 47",
    href: `https://kxlt.marketminute.com/article/marketersmedia-2026-7-21-${PR_SLUG}`,
    logo: "/press/kxlt.svg",
    heightClass: "h-6",
  },
  {
    name: "Fort Wayne's NBC",
    href: `https://fwnbc.marketminute.com/article/marketersmedia-2026-7-21-${PR_SLUG}`,
    logo: "/press/fwnbc.svg",
    heightClass: "h-10",
  },
];

function PressLink({ item, ariaHidden }: { item: PressItem; ariaHidden?: boolean }) {
  return (
    <a
      href={item.href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      aria-hidden={ariaHidden}
      tabIndex={ariaHidden ? -1 : undefined}
      className="group flex shrink-0 items-center opacity-60 transition-opacity duration-300 hover:opacity-100 focus-visible:opacity-100"
      title={`CryptoKiller coverage on ${item.name}`}
    >
      {item.logo ? (
        <img
          src={item.logo}
          alt={ariaHidden ? "" : `${item.name} logo`}
          className={`${item.heightClass ?? "h-7"} w-auto rounded-sm grayscale transition duration-300 group-hover:grayscale-0`}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className="whitespace-nowrap font-serif text-lg font-bold tracking-tight text-white">
          {item.name}
        </span>
      )}
    </a>
  );
}

/**
 * "As seen on" press logo marquee shown at the bottom of the homepage hero.
 * Outlets come from the July 2026 press-release distribution report; each
 * logo links to the actual syndicated coverage. Logos are self-hosted under
 * public/press/ (strict CSP — no hotlinking) and rendered grayscale at rest,
 * regaining full color on hover, for cohesion with the dark theme.
 *
 * Reuses the existing `ticker` keyframes; the global
 * prefers-reduced-motion override in index.css freezes the animation.
 */
export default function AsSeenOn() {
  return (
    <div className="mt-16">
      <p className="mb-6 text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">
        As seen on
      </p>
      <div
        className="group/marquee relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
      >
        <div className="flex w-max animate-[ticker_45s_linear_infinite] group-hover/marquee:[animation-play-state:paused]">
          {[false, true].map((ariaHidden) => (
            <div key={String(ariaHidden)} className="flex shrink-0 items-center gap-x-14 pr-14">
              {PRESS_ITEMS.map((item) => (
                <PressLink key={item.name} item={item} ariaHidden={ariaHidden} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
