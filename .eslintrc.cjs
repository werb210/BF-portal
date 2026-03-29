/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,

  env: {
    node: true,
    es2022: true
  },

  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"
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
