import sanitizeHtml from "sanitize-html";

const RICH_ARTICLE_ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "br", "hr",
  "ul", "ol", "li", "dl", "dt", "dd",
  "strong", "em", "b", "i", "u", "s", "del", "ins",
  "a",
  "blockquote", "cite", "q",
  "code", "pre", "kbd", "samp",
  "div", "span",
  "section", "article", "aside", "header", "footer", "nav", "main",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
  "figure", "figcaption", "img",
  "details", "summary",
  "sub", "sup",
  "abbr", "dfn", "mark", "small", "time",
];

const SAFE_SCHEMES = ["http", "https", "mailto", "tel"];

const RICH_ARTICLE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: RICH_ARTICLE_ALLOWED_TAGS,
  allowedAttributes: {
    "*": [
      "class", "id", "style", "title", "role",
      "aria-label", "aria-labelledby", "aria-describedby", "aria-hidden",
      "aria-expanded", "aria-current", "aria-selected", "aria-live",
      "data-*",
    ],
    a: ["href", "target", "rel", "class", "id", "style", "title"],
    img: ["src", "alt", "width", "height", "loading", "decoding", "fetchpriority", "class", "id", "style"],
    th: ["scope", "colspan", "rowspan", "class", "style"],
    td: ["colspan", "rowspan", "class", "style"],
    col: ["span", "style"],
    colgroup: ["span"],
    time: ["datetime"],
    abbr: ["title"],
  },
  allowedSchemes: SAFE_SCHEMES,
  allowedSchemesByTag: {
    img: ["http", "https", "data"],
    a: SAFE_SCHEMES,
  },
  allowedSchemesAppliedToAttributes: ["href", "src", "action", "cite"],
  allowProtocolRelative: true,
  enforceHtmlBoundary: false,
  disallowedTagsMode: "discard",
};

export function sanitizeRichHtml(html: string): string {
  if (!html) return html;
  return sanitizeHtml(html, RICH_ARTICLE_OPTIONS);
}
