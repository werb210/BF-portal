/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,

  env: {
    node: true,
    es2022: true
  },

  // BF_PORTAL_AUDIT_v777 - the config had no TypeScript parser, so every .ts/.tsx file failed to parse and lint
  // checked nothing. TypeScript parsing plus the rules-of-hooks check (real crashes, e.g. the login code screen).
  parser: "@typescript-eslint/parser",
  plugins: ["react-hooks"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true }
  },

  rules: {
    "react-hooks/rules-of-hooks": "error"
  },

  overrides: [
    {
      files: [
        "deploy/**/*.js",
        "scripts/**/*.js",
        "postcss.config.js"
      ],
      parserOptions: {
        sourceType: "module"
      }
    },

    {
      files: ["*.cjs"],
      parserOptions: {
        sourceType: "script"
      }
    }
  ]
};
