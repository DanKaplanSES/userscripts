# AGENTS.md

Userscripts published to Greasy Fork, which syncs each script from its file on
the `main` branch. See [GREASYFORK.md](GREASYFORK.md) for how syncing is set
up.

## Adding and updating scripts

Scripts are developed and tested elsewhere, then copied here. Don't lay them
out by hand. Run:

```sh
npm run add -- <path/to/script.user.js> --check   # report only
npm run add -- <path/to/script.user.js>
```

`scripts/add.js` works out `<script-name>` from `@name`
(`linkedin.com: Up Arrow Edits Last Message` becomes
`linkedin-com-up-arrow-edits-last-message`) and looks for
`<script-name>/<script-name>.user.js`. If it exists, this is an update.
Otherwise the script is new.

It copies the file exactly and never edits it. If the meta block breaks a rule
below, or an update doesn't raise `@version`, it lists the problems and writes
nothing. Fix them in the source file and run it again, so the source and this
repo's copy stay identical. For a new script, it also writes a starter
`README.md` and adds an entry to the root `README.md`. It never commits.

A changed `@name` therefore shows up as a new script. That's a rename, so
delete the new folder and follow the rename rule under Rules.

For a new script, fill in the starter README's Usage section. Each script's
`README.md` describes what it does and how to use it, and Greasy Fork syncs it
as the listing's "Additional info".

The push that adds a script doesn't reach Greasy Fork. After it's pushed, the
user has to import it by hand. `npm run greasyfork -- import <folder>` prints
the steps. Follow "Each new script" in [GREASYFORK.md](GREASYFORK.md), and tell
the user which steps are theirs.

## Meta block

`npm run lint` and `npm run add -- <path> --check` report missing or wrong meta
keys, with the value each one needs.

What they can't check:

- `@name`: a script that targets one site or service starts with its domain
  and a colon (`linkedin.com: Up Arrow Edits Last Message`). Scripts for
  unrelated sites, or for every site, get a descriptive name without a prefix.
  Choose carefully, since changing it later is a rename.
- Prefer `@match`. Use `@include` only when `@match` can't express the pattern.

See https://greasyfork.org/en/help/meta-keys for what each key does and how
Greasy Fork handles it.

## External code

Before adding `@require`, or copying a library into a script, read
[EXTERNAL-CODE.md](EXTERNAL-CODE.md). Greasy Fork rejects code from hosts it
doesn't allow.

## Rules

- Run `npm run lint` and `npm run format` before committing, and fix what
  they report. The lint also checks the folder naming, meta block, READMEs,
  and version bumps.
- The lint catches a changed `.user.js` without a `@version` bump. Choosing
  the bump is up to you: PATCH for fixes, MINOR for new behavior or settings,
  MAJOR for changes that break how existing users rely on the script. Don't
  bump unchanged scripts, or for changes outside `.user.js` files.
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
