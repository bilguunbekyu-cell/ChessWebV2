import fs from "fs";
import path from "path";

const ROOTS = ["src/pages", "src/components"];
const FILE_EXT = ".tsx";
const TRANSLATION_FILE = "src/i18n/mn.ts";

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
const discovered = new Set();

for (const root of ROOTS) {
  walk(root, (filePath) => {
    const content = fs.readFileSync(filePath, "utf8");
    const strings = extractStrings(content);
    for (const str of strings) {
      discovered.add(str);
    }
  });
}

const missing = [...discovered]
  .filter((value) => !translationKeys.has(value))
  .sort((a, b) => a.localeCompare(b));

console.log(`i18n-check: scanned ${discovered.size} UI strings`);
console.log(`i18n-check: missing ${missing.length} Mongolian keys`);
if (missing.length > 0) {
  for (const item of missing.slice(0, 250)) {
    console.log(`- ${item}`);
  }
  if (missing.length > 250) {
    console.log(`...and ${missing.length - 250} more`);
  }
}
