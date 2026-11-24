# External code

Greasy Fork rejects a script that `@require`s code from a host it doesn't
allow. Avoid `@require` when the script can do without it. When a library is
needed:

- `@require` it from a host on https://greasyfork.org/en/help/cdns, with a
  pinned version (`pkg@1.2.3`, not `pkg@latest`). jsDelivr `/gh/` URLs must pin
  a full commit hash.
- Any other host needs a Subresource Integrity hash on the URL
  (`<url>#sha256=<hash>`).
- Don't `@require` files from this repo. Raw GitHub URLs aren't on the allowed
  list.
- If you copy a library into a script instead, add a comment above it with the
  library's name, version, and source URL.
