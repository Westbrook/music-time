import js from '@eslint/js';
import globals from 'globals';

export default [
    {
        ignores: [
            'node_modules/**',
            'dist/**',
            'coverage/**',
            '.augment/**',
            '.agents/**',
            '.codex/**'
        ]
    },
    js.configs.recommended,
    {
        files: ['**/*.mjs'],
        languageOptions: { globals: globals.node }
    },
    {
        files: ['script.js', 'install.js'],
        languageOptions: {
            sourceType: 'script',
            ecmaVersion: 2022,
            globals: globals.browser
        }
    },
    {
        files: ['tests/browser/*.spec.mjs'],
        languageOptions: { globals: globals.browser }
    },
    {
        files: ['sw.js'],
        languageOptions: { globals: { ...globals.serviceworker, __PRECACHE_FILES__: 'readonly' } }
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
