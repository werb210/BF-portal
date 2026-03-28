module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "react", "react-hooks", "import"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
  ],
  settings: {
    react: {
      version: "detect",
    },
  },
  ignorePatterns: ["dist", "coverage", "node_modules"],
  rules: {
    "react/react-in-jsx-scope": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-empty-object-type": "off",
    "react-hooks/set-state-in-effect": "off",
    "react-hooks/immutability": "off",
    "react-hooks/preserve-manual-memoization": "off",
    "react-hooks/exhaustive-deps": "off",
    "react-hooks/rules-of-hooks": "off",
  },
  overrides: [
    {
      files: ["src/**/*.{ts,tsx}"],
      rules: {
        "import/no-restricted-paths": [
          "warn",
          {
            zones: [
              {
                target: "./src",
                from: "./api",
              },
            ],
          },
        ],
        "no-restricted-imports": [
          "warn",
          {
            paths: [
              {
                name: "axios",
                message: "Use shared API client only",
              },
            ],
          },
        ],
        "no-restricted-globals": [
          "error",
          {
            name: "fetch",
            message: "Use apiRequest() instead of fetch()",
          },
        ],
      },
    },
    {
      files: ["src/lib/api.ts"],
      rules: {
        "no-restricted-imports": "off",
      },
    },
  ],
};
