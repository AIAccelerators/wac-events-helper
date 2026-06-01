import js from '@eslint/js';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'script',
            globals: {
                GM_xmlhttpRequest: 'readonly',
                GM_getValue: 'readonly',
                GM_setValue: 'readonly',
                GM_addStyle: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_$' }],
            'no-constant-condition': 'warn',
            'no-empty': 'warn',
            'no-undef': 'off',
        },
    },
];
