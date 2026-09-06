/** Number of newest review links exposed by the homepage in SSR and CSR. */
export const HOMEPAGE_LATEST_REVIEW_LINKS = 20;

/** Shared investigations page size across SSR, CSR, and sitemap pagination. */
export const INVESTIGATIONS_ITEMS_PER_PAGE = 50;

/** Related review links rendered on review pages and returned by the API. */
export const RELATED_INVESTIGATIONS_LIMIT = 6;

/**
 * Public author routes that represent the current source-attributed team.
 *
 * The short `pepi` and `majithia` slugs are intentionally preserved for
 * historical byline and database compatibility.
 */
export const PUBLIC_AUTHOR_SLUGS = [
  "richard-melton",
  "david-huang",
  "james-taylor",
  "maria-wieck",
  "john-feldt",
  "gary-mcfarlane",
  "james-spillane",
  "alan-draper",
  "arslan-butt",
  "connor-brooke",
  "alejandro-arrieche",
  "amy-clark",
  "jamie-mcneill",
  "joel-frank",
  "pepi",
  "majithia",
  "matt-williams",
  "michael-abetz",
] as const;

/**
 * Indexable profiles retained so existing article bylines continue resolving
 * to their original operational personas.
 */
export const LEGACY_AUTHOR_SLUGS = ["webb", "nair", "ortiz"] as const;

/** Every valid, canonical `/author/:slug` route. */
export const AUTHOR_PROFILE_SLUGS = [
  ...LEGACY_AUTHOR_SLUGS,
  ...PUBLIC_AUTHOR_SLUGS,
] as const;

export type AuthorProfileSlug = (typeof AUTHOR_PROFILE_SLUGS)[number];