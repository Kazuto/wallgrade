// @ts-check
import stylistic from "@stylistic/eslint-plugin";
import withNuxt from "./.nuxt/eslint.config.mjs";

const blockStatements = ["block-like", "try"];

export default withNuxt({
  plugins: { "@stylistic": stylistic },
  rules: {
    "vue/no-multiple-template-root": "off",
    // Prettier closes void elements like <input />.
    "vue/html-self-closing": ["warn", { html: { void: "always" } }],
    // Blank lines set statements apart: before jumps, around blocks and around
    // groups of declarations. The first statement of a block needs none, so a
    // block of only a return stays compact.
    "@stylistic/padding-line-between-statements": [
      "error",
      {
        blankLine: "always",
        prev: "*",
        next: ["return", "throw", "break", "continue"],
      },
      { blankLine: "always", prev: "*", next: blockStatements },
      { blankLine: "always", prev: blockStatements, next: "*" },
      { blankLine: "always", prev: ["const", "let", "var"], next: "*" },
      { blankLine: "always", prev: "*", next: ["const", "let", "var"] },
      {
        blankLine: "any",
        prev: ["const", "let", "var"],
        next: ["const", "let", "var"],
      },
    ],
  },
});
