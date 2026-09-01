# Tinyshelf Featured Badge

## Goal

Add the supplied “Featured on tinyshelf” badge to the CryptoKiller homepage at `/`, using the exact anchor and image attributes provided by Tinyshelf.

## Placement

Create a small homepage-only endorsement section immediately above the site footer. Center the badge with restrained spacing so it is visible without competing with the homepage’s primary investigation content. The supplied dark badge suits the existing dark interface, so its image source will not be changed.

## Rendering

- Add the exact plain `<a>` and `<img>` markup to the React homepage.
- Add the same markup to the server-rendered homepage HTML.
- Do not place the badge in the shared footer, so it appears only on `/`.
- Serve it unconditionally, with no cookie, region, experiment, or user-state gate.

## Link Contract

- Keep the link exactly `https://www.tinyshelf.co/?ref=cryptokiller.org`.
- Keep the image exactly `https://www.tinyshelf.co/badge/tinyshelf-badge-dark-f4d1216a.svg`.
- Keep the title, alt text, width, and height supplied by Tinyshelf.
- Do not add `rel="nofollow"`, `rel="sponsored"`, or `rel="ugc"`.
- Use plain `<a>` and `<img>` elements.

## Verification

- Build and type-check the web app.
- Confirm `/` initial server HTML contains the exact Tinyshelf landing link and badge image.
- Confirm another page does not contain the badge.
- Visually check the homepage at desktop and mobile widths.