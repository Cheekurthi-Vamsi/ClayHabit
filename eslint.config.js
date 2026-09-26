// https://docs.expo.dev/guides/using-eslint/
const expoConfig = require('eslint-config-expo/flat');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = [
  ...expoConfig,
  eslintConfigPrettier,
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*', 'web/*'],
  },
  {
    rules: {
      'import/order': 'off',
      // Reanimated shared values are mutable-by-design (`sv.value = x` on the JS
      // thread is the documented API); the compiler's immutability heuristic
      // can't distinguish them from React state and flags every animation.
      'react-hooks/immutability': 'off',
    },
  },
];
