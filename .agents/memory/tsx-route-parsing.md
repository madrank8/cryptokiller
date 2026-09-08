---
name: Parsing TSX route declarations
description: Avoid false route identities when a source-level guard inspects JSX with nested component props.
---

When a validation script derives route paths from TSX source, inspect only
top-level attributes on the outer route element. A regex over the full tag is
not sufficient when JSX-valued props can contain nested elements.

**Why:** A route declaration can legally place a component prop before its own
path and render nested JSX that also has a `path` prop. Whole-tag regex matching
can silently bind the nested value, report the wrong route, and let the actual
public route escape validation.

**How to apply:** Use the TypeScript JSX AST when available. For dependency-free
guards, scan with quote and brace-depth tracking, identify complete outer tags,
and read attributes only at brace depth zero. Keep a fixture where nested JSX
and the outer route both declare `path`.