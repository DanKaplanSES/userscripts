# AGENTS.md

Userscripts published to Greasy Fork, which syncs each script from its file on
the `main` branch. See [GREASYFORK.md](GREASYFORK.md) for how syncing is set
up.

## Layout

- Each script gets its own folder: `<script-name>/<script-name>.user.js`.
  The `.user.js` ending makes userscript managers offer to install the file.
  `<script-name>` is the `@name` lowercased, with every run of characters other
  than letters and digits replaced by a single `-`, and no `-` at either end.
  `linkedin.com: Up Arrow Edits Last Message` becomes
  `linkedin-com-up-arrow-edits-last-message`.
- Each folder has a `README.md` describing what the script does and how to use
  it. Greasy Fork syncs it as the listing's "Additional info". Once the script
  is on Greasy Fork, the README links to its install page.
- Add each new script to the list in the root `README.md`, linking to the
  script's folder (`[name](<script-name>/)`), with a one-line summary.

## New scripts

The push that adds a script doesn't reach Greasy Fork. After it's pushed, the
user has to import it by hand. Follow "Each new script" in
[GREASYFORK.md](GREASYFORK.md), and tell the user which steps are theirs.

## Meta block

Every script header must include:

- `@name`. A script that targets one site or service starts with its domain and
  a colon: `linkedin.com: Up Arrow Edits Last Message`. Scripts for unrelated
  sites, or for every site, get a descriptive name without a prefix.
- `@namespace DanKaplanSES` (always this value)
- `@version` (start at `0.0.1` if it hasn't been set)
- `@description`
- `@match` (or `@include` only when `@match` can't express the pattern)
- `@grant` (use `@grant none` when the script calls no `GM_*` APIs, since
  managers differ when it's missing)
- `@license GPL-2.0-or-later`
- `@supportURL https://github.com/DanKaplanSES/userscripts/issues` (always this
  value)
- `@homepageURL https://SleepEasySoftware.com` (always this value)

Do not add `@updateURL`, `@downloadURL`, or `@installURL`. Greasy Fork strips
them, and installs update from Greasy Fork either way.

See https://greasyfork.org/en/help/meta-keys for the full list of meta keys,
with a description of what each one does and how Greasy Fork handles it.

## External code

Before adding `@require`, or copying a library into a script, read
[EXTERNAL-CODE.md](EXTERNAL-CODE.md). Greasy Fork rejects code from hosts it
doesn't allow.

## Rules

- Run `npm run lint` and `npm run format` before committing, and fix what
  they report. The lint also checks the folder naming, meta block, READMEs,
  and version bump rules in this file.
- Bump `@version` in each `.user.js` file you change, following semantic
  versioning (MAJOR.MINOR.PATCH). Leave unmodified scripts' versions alone, and
  don't bump for non-`.user.js` changes. Greasy Fork and userscript managers use
  the version to detect updates.
- No minified or obfuscated code.
- Always ask before changing `@name` on a published script, or renaming or
  moving a script's file or folder, even when the user requested it. A new
  `@name` also means a new folder name, so the two go together. Before asking
  for approval, explain what this involves:
  - Some users end up with two copies. Userscript managers identify an
    installed script by `@namespace` plus `@name`, so reinstalling from Greasy
    Fork installs the changed script alongside the old one in Violentmonkey and
    most likely Tampermonkey, and Greasemonkey 4 duplicates it even on
    automatic update. The new copy starts without the old one's stored
    settings.
  - Greasy Fork syncs from the file's URL, so the sync URL must be updated on
    the script's Greasy Fork admin page.
  - The push containing the rename won't sync, because the webhook ignores
    newly created files. Run a manual sync after updating the URL.
  - Anyone who installed straight from the GitHub file URL stops getting
    updates.
