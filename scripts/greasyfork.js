// Automates the parts of the Greasy Fork setup that can be automated. Greasy
// Fork has no write API, so the steps on its site are printed for you to do.
//
//   npm run greasyfork -- hook <payload-url>
//     Creates the GitHub webhook that tells Greasy Fork about pushes. Reads
//     the secret from GREASYFORK_WEBHOOK_SECRET. Does nothing if the hook
//     already exists. Needs `gh` with admin access to the repo.
//
//   npm run greasyfork -- import <folder>
//     Prints the URLs and steps for importing a new script into Greasy Fork.
//
// See GREASYFORK.md for the full process.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const repo = "DanKaplanSES/userscripts";
const rawBase = `https://raw.githubusercontent.com/${repo}/main`;
const root = path.resolve(import.meta.dirname, "..");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function gh(...args) {
  return execFileSync("gh", ["api", ...args], { encoding: "utf8" });
}

function hook(payloadUrl) {
  if (!/^https:\/\/api\.greasyfork\.org\/.+\/webhook$/.test(payloadUrl ?? "")) {
    fail(
      "Pass the Payload URL from https://greasyfork.org/en/users/webhook-info",
    );
  }
  const secret = process.env.GREASYFORK_WEBHOOK_SECRET;
  if (!secret) fail("Set GREASYFORK_WEBHOOK_SECRET to the secret on that page");

  const hooks = JSON.parse(gh(`repos/${repo}/hooks`));
  const existing = hooks.find((h) => h.config?.url === payloadUrl);
  if (existing) {
    console.log(`Webhook already exists (id ${existing.id}). Nothing to do.`);
    return;
  }
  // Send the secret on stdin so it doesn't show up in the process list.
  const body = JSON.stringify({
    name: "web",
    active: true,
    events: ["push"],
    config: { url: payloadUrl, content_type: "json", secret },
  });
  const created = JSON.parse(
    execFileSync("gh", ["api", `repos/${repo}/hooks`, "--input", "-"], {
      encoding: "utf8",
      input: body,
    }),
  );
  console.log(`Created webhook ${created.id}.`);
  console.log(
    `Check deliveries with: gh api repos/${repo}/hooks/${created.id}/deliveries`,
  );
}

function importScript(folder) {
  folder = folder?.replace(/\/+$/, "");
  const script = `${folder}/${folder}.user.js`;
  if (!folder || !existsSync(path.join(root, script))) {
    fail(`Pass a script folder. Expected to find ${script}`);
  }
  const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  const pushed = execFileSync(
    "git",
    ["ls-tree", "--name-only", "origin/main", "--", script],
    { cwd: root, encoding: "utf8" },
  ).trim();
  if (!pushed) {
    console.log(
      `Warning: ${script} isn't on origin/main yet (you're on ${branch}).`,
    );
    console.log("Push it first, or the import will fail.\n");
  }

  console.log(`1. Open https://greasyfork.org/en/import and import:
     ${rawBase}/${script}
   Keep the sync type on Automatic.

2. On the new script's Admin tab, under the additional info sync, set:
     ${rawBase}/${folder}/README.md
   Choose Markdown, then click "Update and sync now".

3. Add the Greasy Fork install link to ${folder}/README.md and push.
   README changes don't need a version bump.`);
}

const [command, arg] = process.argv.slice(2);
if (command === "hook") hook(arg);
else if (command === "import") importScript(arg);
else fail("Usage: npm run greasyfork -- hook <payload-url> | import <folder>");
