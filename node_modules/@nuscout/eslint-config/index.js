const prettier = require('@nuscout/prettier-config');

module.exports = {
  plugins: ['prettier'],
  env: { es6: true },
  parser: 'babel-eslint',
  parserOptions: {
    sourceType: 'module'
  },
  rules: {
    'prettier/prettier': ['error', prettier],
    'no-var': 'error'
  }
};
