module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
  },
  extends: [
    "eslint:recommended",
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {
    "no-restricted-globals": [
      "error",
      {
        name: "fetch",
        message: "Use apiRequest() instead of fetch()",
      },
    ],
  },
};
