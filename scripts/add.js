// Copies a tested userscript into this repo's layout.
//
//   npm run add -- <path/to/script.user.js> [--check]
//
// The folder comes from the script's @name, following AGENTS.md. If that
// folder already holds the script, this is an update. Otherwise the script is
// new, and the command also writes a starter README.md (unless one exists) and
// adds the script to the list in the root README.md.
//
// The file is copied exactly as given, never edited. If its meta block breaks
// a rule, or an update doesn't raise @version, nothing is written and the
// problems are listed, so they can be fixed in the source and the command run
// again. With --check, it only reports, and writes nothing either way.
//
// Nothing is committed. Review the diff, then commit and push.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  compareVersions,
  folderName,
  metaProblems,
  parseMeta,
} from "./meta.js";

const root = path.resolve(import.meta.dirname, "..");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function addToRootReadme(name, folder, description) {
  const file = path.join(root, "README.md");
  const readme = readFileSync(file, "utf8");
  if (readme.includes(`](${folder}/)`)) return;
  const section = readme.match(/## Scripts\n\n([\s\S]*?)\n(?=## )/);
  if (!section) fail("Couldn't find the ## Scripts section in README.md");
  const entries = section[1]
    .split("\n")
    .filter((line) => line.startsWith("- ["));
  entries.push(`- [${name}](${folder}/): ${description}`);
  entries.sort((a, b) => a.localeCompare(b));
  const start = section.index + section[0].indexOf(section[1]);
  writeFileSync(
    file,
    readme.slice(0, start) +
      entries.join("\n") +
      "\n" +
      readme.slice(start + section[1].length),
  );
}

function starterReadme(name, description) {
  return `# ${name}

${description}

## Install

Install a userscript manager such as Tampermonkey, then install this script
from its Greasy Fork page. The link is added once the script is published.

## Usage

TODO: describe how to use the script.
`;
}

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const input = args.find((arg) => !arg.startsWith("--"));
if (!input) fail("Usage: npm run add -- <path/to/script.user.js> [--check]");
if (!existsSync(input)) fail(`No such file: ${input}`);

const source = readFileSync(input, "utf8");
const meta = parseMeta(source);
if (!meta) fail(`${input} has no ==UserScript== meta block`);
const problems = metaProblems(meta);
const name = meta.name?.[0];
if (!name) fail([`${input}:`, ...problems].join("\n  "));

const folder = folderName(name);
const rel = `${folder}/${folder}.user.js`;
const target = path.join(root, rel);
const exists = existsSync(target);

if (exists) {
  const current = readFileSync(target, "utf8");
  if (current === source) {
    console.log(`${rel} is already up to date.`);
    process.exit(0);
  }
  const currentVersion = parseMeta(current)?.version?.[0] ?? "0.0.0";
  const incomingVersion = meta.version?.[0];
  if (
    /^\d+\.\d+\.\d+$/.test(incomingVersion ?? "") &&
    compareVersions(incomingVersion, currentVersion) <= 0
  ) {
    problems.push(
      `@version ${incomingVersion} must be higher than the published ${currentVersion}`,
    );
  }
}

const kind = exists ? `an update to ${rel}` : `a new script at ${rel}`;
if (problems.length) {
  fail(
    [
      `${input} would be ${kind}, but it has problems. Nothing was written.`,
      ...problems.map((problem) => `  ${problem}`),
      "Fix them in that file, then run this again.",
    ].join("\n"),
  );
}
if (checkOnly) {
  console.log(`${input} is ready. It would be ${kind}.`);
  if (!exists) {
    console.log(`No folder matches @name "${name}". If this should update a
published script, its @name changed, which is a rename (see AGENTS.md).`);
  }
  process.exit(0);
}

if (exists) {
  writeFileSync(target, source);
  console.log(`Updated ${rel}.`);
} else {
  mkdirSync(path.join(root, folder), { recursive: true });
  writeFileSync(target, source);
  const readme = path.join(root, folder, "README.md");
  if (!existsSync(readme)) {
    writeFileSync(readme, starterReadme(name, meta.description[0]));
  }
  addToRootReadme(name, folder, meta.description[0]);
  console.log(`Added ${rel}, ${folder}/README.md, and a root README entry.
Fill in the Usage section of ${folder}/README.md.

No folder matched @name "${name}", so this was added as a new script.
If you meant to update a published script and its @name changed, that's a
rename: delete ${folder}/ and see the rename rules in AGENTS.md first.`);
}

console.log("\nChecking the repo rules:");
try {
  execFileSync("node", [path.join(root, "scripts/check-userscripts.js")], {
    cwd: root,
    stdio: "inherit",
  });
  console.log("All good.");
} catch {
  console.log("Fix the problems above before committing.");
}

console.log(`
Next: review the changes, run \`npm run lint\` and \`npm run format\`, then
commit and push.`);
if (!exists) {
  console.log(
    `After pushing, run \`npm run greasyfork -- import ${folder}\` for the Greasy Fork steps.`,
  );
}
