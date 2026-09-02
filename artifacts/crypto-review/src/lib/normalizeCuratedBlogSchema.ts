import {
  orgRef,
  personNode,
  personRef,
} from "./schemaBuilder";
import type { WriterPersona } from "./writerPersonas";

const LEGACY_AUTHOR_ID = /^https:\/\/cryptokiller\.org\/#author-/;

function hasType(node: Record<string, unknown>, wanted: string): boolean {
  const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
  return types.includes(wanted);
}

export function normalizeCuratedBlogSchema(
  schema: Record<string, unknown>,
  author?: WriterPersona,
  reviewer?: WriterPersona,
): Record<string, unknown> {
  const sourceGraph = Array.isArray(schema["@graph"])
    ? (schema["@graph"] as Record<string, unknown>[])
    : [];

  const graph = sourceGraph
    .filter(
      (node) =>
        !(
          hasType(node, "Person") &&
          typeof node["@id"] === "string" &&
          LEGACY_AUTHOR_ID.test(node["@id"])
        ),
    )
    .map((node) => {
      if (!hasType(node, "Article") && !hasType(node, "BlogPosting")) {
        return node;
      }

      const { reviewedBy: _staleReviewer, ...article } = node;
      return {
        ...article,
        author: author ? personRef(author) : orgRef(),
        ...(reviewer ? { reviewedBy: personRef(reviewer) } : {}),
      };
    });

  if (author && !graph.some((node) => node["@id"] === personRef(author)["@id"])) {
    graph.push(personNode(author));
  }
  if (reviewer && !graph.some((node) => node["@id"] === personRef(reviewer)["@id"])) {
    graph.push(personNode(reviewer));
  }

  return { ...schema, "@graph": graph };
}