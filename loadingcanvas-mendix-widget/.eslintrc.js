// Flat config consumed via `eslint --config .eslintrc.js` (path hardcoded by pluggable-widgets-tools).
// Mirrors eslint.config.js rules using packages actually installed at the workspace root.
const js = require("@eslint/js");
const globals = require("globals");
const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const reactHooks = require("eslint-plugin-react-hooks");

const reactHooksConfig = reactHooks.configs?.flat?.recommended ?? reactHooks.configs?.["flat/recommended"];

module.exports = [
  {
    ignores: ["dist/**", "typings/**"],
  },
  ...(reactHooksConfig ? [reactHooksConfig] : []),
  {
    // Mendix editor preview loads CSS via CommonJS require at runtime
    files: ["**/*.editorPreview.tsx"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      globals: globals.browser,
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      // TS-aware replacement handles unused vars (base rule misfires on type positions)
      "no-unused-vars": "off",
      complexity: ["warn", 40],
      "max-depth": ["warn", 5],
      "max-params": ["warn", 10],
      "max-lines-per-function": ["warn", { max: 250, skipBlankLines: true, skipComments: true }],
      "max-nested-callbacks": ["warn", 3],
      "no-else-return": ["warn", { allowElseIf: false }],
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
];
