import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

/** @type {import('eslint').Linter.Config[]} */
export default [
   {
      files: ['**/*.{js,mjs,cjs,ts}'],
   },
   {
      languageOptions: {
         globals: globals.node,
      },
   },
   pluginJs.configs.recommended,
   ...tseslint.configs.recommended,
   eslintConfigPrettier,

   // Just incase we need any types. but lets try not to use it for best practice.
   {
      rules: {
         '@typescript-eslint/no-explicit-any': 'off',
      },
   },
];
