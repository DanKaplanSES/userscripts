# Greasy Fork setup

Greasy Fork syncs each script from its file on the `main` branch of
`DanKaplanSES/userscripts`. A GitHub webhook tells Greasy Fork when a push
changes a file, and Greasy Fork pulls the new version.

Greasy Fork has no write API. Steps on its site have to be done by hand while
signed in. `npm run greasyfork` automates the GitHub side and prints the exact
URLs for the rest.

## One-time: the repo webhook

The webhook belongs to the Greasy Fork account, not to a script. One webhook on
this repo covers every script in it, so this only needs doing once.

1. Open https://greasyfork.org/en/users/webhook-info while signed in. Copy the
   Payload URL, and click Generate to get a secret. Regenerating the secret
   later breaks the webhook until you update it on GitHub.
2. Create the webhook on GitHub. This needs `gh` signed in with admin access to
   the repo:

   ```sh
   GREASYFORK_WEBHOOK_SECRET='<secret>' npm run greasyfork -- hook '<payload url>'
   ```

   It does nothing if the webhook already exists. To do it by hand instead, go
   to the repo's Settings, then Webhooks, then Add webhook. Use the Payload
   URL, content type `application/json`, the secret, and "Just the push
   event".

Each script shows a sync type of Automatic until its first webhook push, then
switches to Webhook.

## Each new script

The webhook only reacts to modified files. The push that adds a new script
does nothing on Greasy Fork, so the first version has to be imported.

1. Add the script with `npm run add -- <path>`, then push it to `main`.
2. Run `npm run greasyfork -- import <folder>`. It prints these URLs for you:
   - Script: `https://raw.githubusercontent.com/DanKaplanSES/userscripts/main/<folder>/<folder>.user.js`
   - README: `https://raw.githubusercontent.com/DanKaplanSES/userscripts/main/<folder>/README.md`
3. Open https://greasyfork.org/en/import, paste the script URL, and keep the
   sync type on Automatic. Use the `main` branch URL, never one with a commit
   hash, or it will never update.
4. On the new script's Admin tab, in the additional info sync section, enter
   the README URL, choose Markdown, and click "Update and sync now".
5. Add the Greasy Fork install link to the script's `README.md` and push.
   README changes don't need a `@version` bump.

From then on, every push that modifies the script or its README syncs it.

## Renames

GitHub reports a renamed file as added at the new path and removed at the old
one, so the webhook ignores it. After pushing a rename, update the sync URL on
the script's Admin tab (and the README URL, if it moved), then click "Update
and sync now".

## Checking a sync

GitHub records each webhook delivery and Greasy Fork's response, which lists
the scripts it updated or failed to update. Find them under the webhook's
Recent Deliveries, or run:

```sh
gh api repos/DanKaplanSES/userscripts/hooks
gh api repos/DanKaplanSES/userscripts/hooks/<id>/deliveries
```

Synced updates skip Greasy Fork's warnings for a changed `@namespace` or an
unbumped `@version`. `npm run lint` checks both instead.
