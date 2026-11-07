/**
 * @type {import('lint-staged').Configuration}
 */
export default {
  "*.{js,json,css,md,mdx}": ["prettier --write"],
  "*.{ts,tsx,vue}": [
    "eslint --cache --cache-strategy content --fix",
    "prettier --write",
  ],
};
