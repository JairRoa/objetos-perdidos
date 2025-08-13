module.exports = {
  env: { es2021: true, node: true },
  parserOptions: { ecmaVersion: 2022 },
  extends: ["eslint:recommended", "google"],
  rules: {
    "require-jsdoc": "off",
    "valid-jsdoc": "off",
    "max-len": "off",
    "indent": "off",
    "object-curly-spacing": "off",
    "comma-dangle": "off",
    "no-multi-spaces": "off",
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "double", { "allowTemplateLiterals": true }]
  }
};
