import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  EDITORIAL_REVIEWER,
  editorialReviewerFor,
  PUBLIC_TEAM,
  TEAM_PREVIEW,
  WRITER_PERSONAS,
} from "../src/lib/writerPersonas.js";
import { personNode } from "../src/lib/schemaBuilder.js";
import { BLOG_SCHEMA_MAP } from "../src/lib/blogSchemaMap.js";
import { normalizeCuratedBlogSchema } from "../src/lib/normalizeCuratedBlogSchema.js";

const EXPECTED_NAMES = [
  "Richard Melton",
  "David Huang",
  "James Taylor",
  "Maria Wieck",
  "John Feldt",
  "Gary McFarlane",
  "James Spillane",
  "Alan Draper",
  "Arslan Butt",
  "Connor Brooke",
  "Alejandro Arrieche",
  "Amy Clark",
  "Jamie McNeill",
  "Joel Frank",
  "Kane Pepi",
  "Yash Majithia",
  "Matt Williams",
  "Michael Abetz",
].sort();

const EXPECTED_WITHOUT_LINKEDIN = new Set(["James Taylor", "Jamie McNeill"]);
const root = fileURLToPath(new URL("..", import.meta.url));
const errors: string[] = [];

function check(condition: unknown, message: string): void {
  if (!condition) errors.push(message);
}

check(PUBLIC_TEAM.length === 18, `expected 18 public team members, found ${PUBLIC_TEAM.length}`);
check(
  JSON.stringify(PUBLIC_TEAM.map((person) => person.name).sort()) === JSON.stringify(EXPECTED_NAMES),
  "public team names do not match the approved 18-person source roster",
);
check(new Set(PUBLIC_TEAM.map((person) => person.slug)).size === 18, "public team slugs are not unique");
check(WRITER_PERSONAS.pepi.name === "Kane Pepi", "legacy `pepi` ID must resolve to Kane Pepi");
check(WRITER_PERSONAS.majithia.name === "Yash Majithia", "legacy `majithia` ID must resolve to Yash Majithia");
check(WRITER_PERSONAS.webb.publicTeam === false, "legacy Webb profile must stay outside the public roster");
check(WRITER_PERSONAS.nair.publicTeam === false, "legacy Nair profile must stay outside the public roster");
check(WRITER_PERSONAS.ortiz.publicTeam === false, "legacy Ortiz profile must stay outside the public roster");
check(EDITORIAL_REVIEWER.name === "John Feldt", "John Feldt must remain the editorial reviewer");
check(!editorialReviewerFor(EDITORIAL_REVIEWER), "the editorial reviewer must never review his own work");
check(
  editorialReviewerFor(WRITER_PERSONAS.pepi)?.slug === EDITORIAL_REVIEWER.slug,
  "non-reviewer authors must resolve to the shared editorial reviewer",
);
check(TEAM_PREVIEW.length === 3, "homepage team preview must remain concise");

for (const person of PUBLIC_TEAM) {
  check(Boolean(person.image?.startsWith("/team/")), `${person.name}: image must be a local /team asset`);
  check(Boolean(person.sourceImageUrl?.startsWith("https://dex.ag/wp-content/")), `${person.name}: missing DEX source image URL`);
  check(Boolean(person.dexProfileUrl?.startsWith("https://dex.ag/team/")), `${person.name}: missing DEX source page`);
  check(Boolean(person.teamCategory), `${person.name}: missing team category`);
  check(person.bio.length > 30 && person.fullBio.length > 60, `${person.name}: biography is incomplete`);
  check(person.specialties.length > 0, `${person.name}: missing specialties`);

  if (EXPECTED_WITHOUT_LINKEDIN.has(person.name)) {
    check(!person.linkedin, `${person.name}: LinkedIn must not be fabricated`);
  } else {
    check(Boolean(person.linkedin?.startsWith("https://www.linkedin.com/")), `${person.name}: missing source-provided LinkedIn`);
  }

  if (person.linkedin) {
    check(person.sameAs?.includes(person.linkedin), `${person.name}: LinkedIn missing from schema sameAs`);
  }

  const node = personNode(person);
  check(Boolean(node.image), `${person.name}: Person schema is missing image`);
  check(node.jobTitle === person.role, `${person.name}: Person schema role drift`);
  check(node.description === person.bio, `${person.name}: Person schema biography drift`);

  if (person.image) {
    const imagePath = `${root}/public/${person.image.replace(/^\/+/, "")}`;
    try {
      const imageStat = await stat(imagePath);
      check(imageStat.size > 1_000, `${person.name}: local headshot is unexpectedly small`);
      const header = await readFile(imagePath);
      check(
        header.subarray(0, 4).toString("ascii") === "RIFF" &&
          header.subarray(8, 12).toString("ascii") === "WEBP",
        `${person.name}: local headshot is not a valid WebP`,
      );
    } catch {
      errors.push(`${person.name}: local headshot file is missing`);
    }
  }
}

for (const [slug, schema] of Object.entries(BLOG_SCHEMA_MAP)) {
  const normalized = normalizeCuratedBlogSchema(
    schema,
    WRITER_PERSONAS.ortiz,
    editorialReviewerFor(WRITER_PERSONAS.ortiz),
  );
  const graph = normalized["@graph"] as Record<string, unknown>[];
  const ids = new Set(graph.map((node) => node["@id"]).filter(Boolean));
  const articles = graph.filter((node) => {
    const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
    return types.includes("Article") || types.includes("BlogPosting");
  });

  check(
    !graph.some(
      (node) =>
        node["@type"] === "Person" &&
        typeof node["@id"] === "string" &&
        node["@id"].includes("/#author-"),
    ),
    `${slug}: curated schema retains a legacy author ID`,
  );
  check(
    !graph.some(
      (node) =>
        node["@type"] === "Person" &&
        ("worksFor" in node || "memberOf" in node),
    ),
    `${slug}: normalized Person schema retains an unsupported affiliation`,
  );
  for (const article of articles) {
    const authorId = (article.author as { "@id"?: string } | undefined)?.["@id"];
    const reviewerId = (article.reviewedBy as { "@id"?: string } | undefined)?.["@id"];
    check(Boolean(authorId && ids.has(authorId)), `${slug}: article author reference is unresolved`);
    check(Boolean(reviewerId && ids.has(reviewerId)), `${slug}: reviewer reference is unresolved`);
  }
}

if (errors.length > 0) {
  console.error(`Team registry verification failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log(
  `Team registry verified: ${PUBLIC_TEAM.length} public people, ${PUBLIC_TEAM.length} local headshots, one shared editorial reviewer.`,
);