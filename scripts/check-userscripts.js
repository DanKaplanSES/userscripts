// Checks every userscript against the repo rules in AGENTS.md that ESLint
// doesn't cover: folder naming, required meta keys and values, banned keys,
// @require URLs, the per-script README, the root README entry, and the
// version bump.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { folderName, metaProblems, parseMeta } from "./meta.js";

const root = path.resolve(import.meta.dirname, "..");

const errors = [];
const report = (file, message) => errors.push(`${file}: ${message}`);

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

  for (const problem of metaProblems(meta)) report(rel, problem);
  const version = meta.version?.[0];

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
