import js from '@eslint/js';
import globals from 'globals';

export default [
    {
        ignores: ['node_modules/**', 'coverage/**', '.augment/**', '.agents/**', '.codex/**']
    },
    js.configs.recommended,
    {
        files: ['**/*.mjs'],
        languageOptions: { globals: globals.node }
    },
    {
        files: ['script.js'],
        languageOptions: {
            sourceType: 'script',
            ecmaVersion: 2022,
            globals: globals.browser
        }
    },
    {
        rules: {
            eqeqeq: 'error',
            'no-var': 'error',
            'prefer-const': 'error',
            'no-unused-vars': ['error', { caughtErrors: 'none' }]
        }
    }
];
