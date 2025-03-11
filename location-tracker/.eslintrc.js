module.exports = {
    env: {
      browser: true,
      es2021: true,
      node: true,
      jest: true
    },
    extends: 'eslint:recommended',
    parserOptions: {
      ecmaVersion: 12,
      sourceType: 'module'
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': 'warn',
      'semi': ['error', 'always']
    }
  };