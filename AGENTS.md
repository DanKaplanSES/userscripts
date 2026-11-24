# AGENTS.md

Userscripts published to Greasy Fork. Greasy Fork syncs each script from its
file on the `main` branch, so every push to `main` is a release.

## Layout

- Each script gets its own folder: `<script-name>/<script-name>.user.js`.
- Each folder has a `README.md` describing what the script does and how to use
  it. Greasy Fork can sync it as the listing's "Additional info".
- Add each new script to the list in the root `README.md`, with a link and a
  one-line summary.

## Meta block

Every script header must include:

- `@name`
- `@namespace DanKaplanSES` (always this value)
- `@version` (start at `0.0.1` if it hasn't been set)
- `@description`
- `@match` or `@include` (at least one)
- `@license GPL-2.0-or-later`
- `@supportURL https://github.com/DanKaplanSES/userscripts/issues` (always this value)
- `@homepageURL https://SleepEasySoftware.com` (always this value)

Do not add `@updateURL`, `@downloadURL`, or `@installURL`. Greasy Fork strips
them, and installs update from Greasy Fork either way.

See https://greasyfork.org/en/help/meta-keys for the full list of meta keys,
with a description of what each one does and how Greasy Fork handles it.

## Rules

- Bump `@version` on every change, following semantic versioning
  (MAJOR.MINOR.PATCH). Greasy Fork and userscript managers use it to detect
  updates.
- No minified or obfuscated code.
- Never change `@namespace` on an existing script. Greasy Fork warns about it.
