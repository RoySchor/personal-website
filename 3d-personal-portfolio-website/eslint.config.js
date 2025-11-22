// eslint.config.js
import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';

export default [
  // Ignore build + static assets
  {
    ignores: [
      'dist/**',
      'public/**',
      '**/*.glb',
      '**/*.wasm',
    ],
  },

  // Base recommended rules
  js.configs.recommended,

  // Project rules
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
      },
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      // Helpful defaults
      'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-console': 'off',

      // Three/Vite friendliness
      'import/no-unresolved': 'off', // three/examples paths & Vite aliases
      'import/order': [
        'warn',
        {
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
          groups: [['builtin', 'external'], ['internal', 'parent', 'sibling', 'index']],
        },
      ],
    },
  },
];
