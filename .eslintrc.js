module.exports = {
  "plugins": ['vue'],
  "parserOptions": {
    "ecmaVersion": 6,
    "parser": "babel-eslint",
    "sourceType": "module",
    "allowImportExportEverywhere": false,
  },
  "extends": ["plugin:vue/recommended","eslint-config-airbnb/base"],
  "globals": {},
  "rules": {
    "no-console":['off'],
    "no-param-reassign": [
      "error",
      {
        "props": false
      }
    ],
    "quotes": [
      2,
      "single",
      {
        "avoidEscape": true,
        "allowTemplateLiterals": true
      }
    ],
    "import/no-unresolved": [
      "off"
    ],
    "no-underscore-dangle": 0,
    "global-require": 0,
    "import/extensions": ['off', 'never'],
    "comma-dangle": [
      "error",
      "only-multiline"
    ],
    "indent": ["error", 2, { "SwitchCase": 1 }],
    "class-methods-use-this": 0,
  }
};
