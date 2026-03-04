import fs from "fs";
import path from "path";

const ROOTS = ["src/pages", "src/components"];
const FILE_EXT = ".tsx";
const TRANSLATION_FILE = "src/i18n/mn.ts";
const args = new Set(process.argv.slice(2));
const SHOW_ALL_UI_KEYS = args.has("--all");
const SHOW_DEFINED_KEYS = args.has("--defined");
const SHOW_REFS = args.has("--refs");

function readTranslationKeys(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const keys = new Set();
  const regex = /^\s*"([^"]+)":/gm;
  let match = regex.exec(content);
  while (match) {
    keys.add(match[1].trim());
    match = regex.exec(content);
  }
  return keys;
}

function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim();
}

function isTranslatable(value) {
  if (!value) return false;
  if (value.length < 2 || value.length > 140) return false;
  if (!/[A-Za-z]/.test(value)) return false;
  if (/^\[[A-Za-z0-9_/-]+$/.test(value)) return false;
  if (/(===|!==|&&|\|\|)/.test(value)) return false;
  if (/\bvoid\s*\|\s*Promise\b/.test(value)) return false;
  if (/^[A-Za-z0-9_./:@#?&=+\-]+$/.test(value)) return false;
  if (/^(http|https):\/\//i.test(value)) return false;
  if (/^(bg|text|border|hover|dark|sm:|md:|lg:|xl:)/.test(value)) return false;
  if (/[{}$]/.test(value)) return false;
  if (/[;]/.test(value)) return false;
  if (/(return\s*\(|\)\s*:\s*\(|=>|const |let |function )/.test(value)) return false;
  if (/(=>|const |let |function |className|import |export )/.test(value)) return false;
  if (/[<>]=?/.test(value)) return false;
  if (/^[()[\]'"`,.:|\\/-]+$/.test(value)) return false;
  return true;
}

function extractStrings(content) {
  const found = new Set();
  const patterns = [
    />\s*([A-Za-z0-9✓⚙🔥⚡🚀🏛🤖←][^<>{\n]{0,139})\s*</g,
    /\b(?:label|title|subtitle|helper|placeholder|ariaLabel|message|description)\s*[:=]\s*["']([^"']{2,140})["']/g,
  ];

  for (const pattern of patterns) {
    let match = pattern.exec(content);
    while (match) {
      const text = normalizeText(match[1] || "");
      if (isTranslatable(text)) found.add(text);
      match = pattern.exec(content);
    }
  }

  return found;
}

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, callback);
      continue;
    }
    if (entry.isFile() && fullPath.endsWith(FILE_EXT)) {
      callback(fullPath);
    }
  }
}

const translationKeys = readTranslationKeys(TRANSLATION_FILE);
const discoveredRefs = new Map();

for (const root of ROOTS) {
  walk(root, (filePath) => {
    const content = fs.readFileSync(filePath, "utf8");
    const strings = extractStrings(content);
    for (const str of strings) {
      if (!discoveredRefs.has(str)) {
        discoveredRefs.set(str, new Set());
      }
      discoveredRefs.get(str).add(filePath);
    }
  });
}

const discovered = [...discoveredRefs.keys()];
const missing = discovered
  .filter((value) => !translationKeys.has(value))
  .sort((a, b) => a.localeCompare(b));
const defined = [...translationKeys].sort((a, b) => a.localeCompare(b));

console.log(`i18n-check: scanned ${discovered.length} UI strings`);
console.log(`i18n-check: missing ${missing.length} Mongolian keys`);

if (missing.length > 0) {
  for (const item of missing.slice(0, 250)) {
    if (!SHOW_REFS) {
      console.log(`- ${item}`);
      continue;
    }

    const refs = [...(discoveredRefs.get(item) || [])]
      .sort((a, b) => a.localeCompare(b))
      .join(", ");
    console.log(`- ${item}  @ ${refs}`);
  }
  if (missing.length > 250) {
    console.log(`...and ${missing.length - 250} more`);
  }
}

if (SHOW_ALL_UI_KEYS) {
  console.log("\nUI keys:");
  for (const key of discovered.sort((a, b) => a.localeCompare(b))) {
    console.log(`* ${key}`);
  }
}

if (SHOW_DEFINED_KEYS) {
  console.log("\nDefined Mongolian keys:");
  for (const key of defined) {
    console.log(`* ${key}`);
  }
}
