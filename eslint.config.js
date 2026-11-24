import js from "@eslint/js";
import globals from "globals";
import userscripts from "eslint-plugin-userscripts";

export default [
  { ignores: ["node_modules/"] },
  js.configs.recommended,
  {
    files: ["**/*.user.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: { ...globals.browser, ...globals.greasemonkey },
    },
    plugins: { userscripts: { rules: userscripts.rules } },
    rules: {
      ...userscripts.configs.recommended.rules,
      // AGENTS.md asks for @match where possible, not always.
      "userscripts/better-use-match": "warn",
      // AGENTS.md uses @homepageURL alone.
      "userscripts/use-homepage-and-url": "off",
    },
    settings: { userscriptVersions: { tampermonkey: "*" } },
  },
  {
    files: ["*.js", "scripts/**/*.js"],
    languageOptions: { globals: globals.node },
  },
];
