// ──────────────────────────────────────────────
// Marinara PT-BR i18n tool (AST-safe)
// Uses the TypeScript compiler API to extract / apply
// translations ONLY in user-facing contexts:
//   - JSX text nodes
//   - display attributes (title, placeholder, aria-label, alt, label, tooltip, etc.)
//   - first string arg of toast.*() calls
// Never touches code identifiers, generics, imports, etc.
//
// Usage (run from repo root so `typescript` resolves):
//   node i18n-tool.mjs extract <srcDir> <out.json>
//   node i18n-tool.mjs apply   <srcDir> <dict.json>
// ──────────────────────────────────────────────
import ts from "typescript";
import fs from "node:fs";
import path from "node:path";

const DISPLAY_ATTRS = new Set([
  "title", "placeholder", "aria-label", "alt", "label", "tooltip",
  "heading", "emptyText", "description", "subtitle", "confirmLabel",
  "cancelLabel", "submitLabel", "helperText", "hint", "message",
]);
const TOAST_NAMES = new Set(["toast"]);

function walkFiles(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkFiles(p, acc);
    else if (e.name.endsWith(".tsx")) acc.push(p);
  }
  return acc;
}

const hasLetter = (s) => /[A-Za-zÀ-ÿ]/.test(s);

// Decide whether a string literal node is a user-facing display string.
function isDisplayStringLiteral(node) {
  const parent = node.parent;
  if (!parent) return false;
  // JSX attribute:  attr="..."
  if (ts.isJsxAttribute(parent) && parent.initializer === node) {
    return DISPLAY_ATTRS.has(parent.name.getText());
  }
  // JSX attribute expression: attr={"..."}
  if (ts.isJsxExpression(parent) && parent.parent && ts.isJsxAttribute(parent.parent)) {
    return DISPLAY_ATTRS.has(parent.parent.name.getText());
  }
  // String literal directly inside JSX: <div>{"text"}</div>
  if (ts.isJsxExpression(parent) && parent.parent &&
      (ts.isJsxElement(parent.parent) || ts.isJsxFragment(parent.parent))) {
    return true;
  }
  // toast.*("...")  / toast("...") — first argument only
  if (ts.isCallExpression(parent) && parent.arguments[0] === node) {
    const callee = parent.expression;
    let base = null;
    if (ts.isIdentifier(callee)) base = callee.text;
    else if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression)) base = callee.expression.text;
    if (base && TOAST_NAMES.has(base)) return true;
  }
  return false;
}

function collectEdits(sourceFile) {
  // returns [{ start, end, kind, text, raw }]
  const edits = [];
  const visit = (node) => {
    if (ts.isJsxText(node)) {
      const raw = node.text;
      const trimmed = raw.trim();
      if (trimmed && hasLetter(trimmed) && !trimmed.includes("{")) {
        edits.push({ start: node.getStart(sourceFile), end: node.getEnd(), kind: "jsxtext", text: trimmed, raw });
      }
    } else if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && isDisplayStringLiteral(node)) {
      const text = node.text;
      if (text.trim() && hasLetter(text)) {
        edits.push({ start: node.getStart(sourceFile), end: node.getEnd(), kind: "string", text, raw: node.getText(sourceFile) });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return edits;
}

const [, , mode, srcDir, jsonPath] = process.argv;
const files = walkFiles(srcDir);

if (mode === "extract") {
  const map = {};
  for (const f of files) {
    const sf = ts.createSourceFile(f, fs.readFileSync(f, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    for (const e of collectEdits(sf)) {
      if (!(e.text in map)) map[e.text] = "";
    }
  }
  fs.writeFileSync(jsonPath, JSON.stringify(map, null, 2), "utf8");
  console.log(`extracted ${Object.keys(map).length} unique strings from ${files.length} files -> ${jsonPath}`);
} else if (mode === "apply") {
  const dict = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  let changed = 0, filesChanged = 0;
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const edits = collectEdits(sf).filter((e) => dict[e.text] && dict[e.text] !== e.text);
    if (edits.length === 0) continue;
    edits.sort((a, b) => b.start - a.start); // back-to-front
    let out = src;
    for (const e of edits) {
      const pt = dict[e.text];
      let replacement;
      if (e.kind === "jsxtext") {
        // preserve leading/trailing whitespace around the trimmed core
        const lead = e.raw.match(/^\s*/)[0];
        const trail = e.raw.match(/\s*$/)[0];
        replacement = lead + pt + trail;
      } else {
        const q = e.raw[0]; // original quote char (" ' or `)
        const esc = pt.replace(new RegExp("\\" + q, "g"), "\\" + q);
        replacement = q + esc + q;
      }
      out = out.slice(0, e.start) + replacement + out.slice(e.end);
      changed++;
    }
    fs.writeFileSync(f, out, "utf8");
    filesChanged++;
  }
  console.log(`applied ${changed} replacements across ${filesChanged} files`);
} else {
  console.error("usage: node i18n-tool.mjs extract|apply <srcDir> <json>");
  process.exit(1);
}
