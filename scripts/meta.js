// Shared helpers for reading userscript meta blocks and applying the naming
// rule from AGENTS.md.

export const metaBlockPattern =
  /\/\/ ==UserScript==\s*\n([\s\S]*?)\/\/ ==\/UserScript==/;

// Keys every script must have with exactly these values.
export const requiredValues = {
  namespace: "DanKaplanSES",
  license: "GPL-2.0-or-later",
  supportURL: "https://github.com/DanKaplanSES/userscripts/issues",
  homepageURL: "https://SleepEasySoftware.com",
};
export const requiredKeys = ["name", "version", "description", "grant"];
export const bannedKeys = ["updateURL", "downloadURL", "installURL"];

// Extra guidance for a missing required key.
const missingHints = {
  version: ' (start at "0.0.1")',
  grant:
    ' (use "@grant none" if the script calls no GM_* APIs, since managers differ when it\'s missing)',
};

// "linkedin.com: Up Arrow Edits Last Message" becomes
// "linkedin-com-up-arrow-edits-last-message".
export function folderName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Returns { key: [values...] }, or null when there is no meta block.
export function parseMeta(source) {
  const block = source.match(metaBlockPattern);
  if (!block) return null;
  const meta = {};
  for (const line of block[1].split("\n")) {
    const entry = line.match(/^\/\/\s*@(\S+)(?:\s+(.*?))?\s*$/);
    if (!entry) continue;
    const [, key, value = ""] = entry;
    (meta[key] ??= []).push(value);
  }
  return meta;
}

// Returns the problems with a parsed meta block that don't depend on where the
// file lives. Used by both the lint check and `npm run add`.
export function metaProblems(meta) {
  const problems = [];
  for (const key of requiredKeys) {
    if (!meta[key]?.some(Boolean)) {
      problems.push(`missing @${key}${missingHints[key] ?? ""}`);
    }
  }
  for (const [key, value] of Object.entries(requiredValues)) {
    if (meta[key]?.[0] !== value) problems.push(`@${key} must be "${value}"`);
  }
  if (!meta.match && !meta.include) problems.push("needs @match or @include");
  for (const key of bannedKeys) {
    if (meta[key]) problems.push(`remove @${key}, Greasy Fork strips it`);
  }

  for (const url of meta.require ?? []) {
    const hashed = /#(md5|sha1|sha256|sha384|sha512)[=-]/.test(url);
    if (/@latest\b/.test(url)) {
      problems.push(`pin a version instead of @latest: ${url}`);
    }
    if (
      !hashed &&
      /^https:\/\/(raw\.githubusercontent\.com|github\.com)\//.test(url)
    ) {
      problems.push(`Greasy Fork rejects @require from GitHub: ${url}`);
    }
  }

  const version = meta.version?.[0];
  if (version && !/^\d+\.\d+\.\d+$/.test(version)) {
    problems.push(`@version "${version}" isn't MAJOR.MINOR.PATCH`);
  }
  return problems;
}

// Compares MAJOR.MINOR.PATCH versions. Returns a negative number, zero, or a
// positive number, like a sort comparator.
export function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}
