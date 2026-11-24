// Checks every userscript against the repo rules in AGENTS.md that ESLint
// doesn't cover: folder naming, required meta keys and values, banned keys,
// @require URLs, the per-script README, the root README entry, and the
// version bump.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

const requiredValues = {
  namespace: "DanKaplanSES",
  license: "GPL-2.0-or-later",
  supportURL: "https://github.com/DanKaplanSES/userscripts/issues",
  homepageURL: "https://SleepEasySoftware.com",
};
const requiredKeys = ["name", "version", "description", "grant"];
const bannedKeys = ["updateURL", "downloadURL", "installURL"];

const errors = [];
const report = (file, message) => errors.push(`${file}: ${message}`);

// "linkedin.com: Up Arrow Edits Last Message" becomes
// "linkedin-com-up-arrow-edits-last-message".
export function folderName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseMeta(source) {
  const block = source.match(
    /\/\/ ==UserScript==\s*\n([\s\S]*?)\/\/ ==\/UserScript==/,
  );
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

function git(...args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
}

function findUserscripts(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) return [];
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return findUserscripts(full);
    return entry.name.endsWith(".user.js") ? [full] : [];
  });
}

const rootReadme = readFileSync(path.join(root, "README.md"), "utf8");

for (const file of findUserscripts(root)) {
  const rel = path.relative(root, file);
  const source = readFileSync(file, "utf8");
  const meta = parseMeta(source);
  if (!meta) {
    report(rel, "missing the ==UserScript== meta block");
    continue;
  }

  for (const key of requiredKeys) {
    if (!meta[key]?.some(Boolean)) report(rel, `missing @${key}`);
  }
  for (const [key, value] of Object.entries(requiredValues)) {
    if (meta[key]?.[0] !== value) report(rel, `@${key} must be "${value}"`);
  }
  if (!meta.match && !meta.include) report(rel, "needs @match or @include");
  for (const key of bannedKeys) {
    if (meta[key]) report(rel, `remove @${key}, Greasy Fork strips it`);
  }

  for (const url of meta.require ?? []) {
    const hashed = /#(md5|sha1|sha256|sha384|sha512)[=-]/.test(url);
    if (/@latest\b/.test(url)) {
      report(rel, `pin a version instead of @latest: ${url}`);
    }
    if (
      !hashed &&
      /^https:\/\/(raw\.githubusercontent\.com|github\.com)\//.test(url)
    ) {
      report(rel, `Greasy Fork rejects @require from GitHub: ${url}`);
    }
  }

  const version = meta.version?.[0];
  if (version && !/^\d+\.\d+\.\d+$/.test(version)) {
    report(rel, `@version "${version}" isn't MAJOR.MINOR.PATCH`);
  }

  const name = meta.name?.[0];
  if (name) {
    const expected = `${folderName(name)}/${folderName(name)}.user.js`;
    if (rel.split(path.sep).join("/") !== expected) {
      report(rel, `should be at ${expected} to match @name "${name}"`);
    }
  }

  const folder = path.dirname(rel);
  if (folder === ".") {
    report(rel, "must live in its own folder");
  } else {
    if (!existsSync(path.join(root, folder, "README.md"))) {
      report(rel, `missing ${folder}/README.md`);
    }
    if (!rootReadme.includes(`](${folder}`)) {
      report(rel, `root README.md needs a link to ${folder}/`);
    }
  }

  // Compare against the last commit. Skip files that are new or unchanged.
  const committed = git("show", `HEAD:${rel.split(path.sep).join("/")}`);
  if (committed !== null && committed !== source) {
    const oldVersion = parseMeta(committed)?.version?.[0];
    if (oldVersion === version) {
      report(rel, `changed since HEAD, so bump @version (still ${version})`);
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
