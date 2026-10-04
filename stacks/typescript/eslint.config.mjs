import js from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import prettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import { architecture } from './eslint-rules/architecture.mjs';

const everywhere = [
  { selector: 'ExportDefaultDeclaration', message: 'Use named exports.' },
  { selector: 'TSEnumDeclaration', message: 'Use an `as const` object and a derived union type.' },
  {
    selector: 'ThrowStatement > NewExpression[callee.name="Error"]',
    message: 'Throw a named error class (`class PaymentGatewayError extends Error`), not Error.',
  },
];

const innerLayers = [
  ...everywhere,
  {
    selector: 'TryStatement',
    message: 'Return a Result. try/catch belongs in infrastructure or the global error handler.',
  },
  { selector: 'ThrowStatement', message: 'Return a Result instead of throwing.' },
  { selector: 'Literal[raw="null"]', message: 'Use undefined; convert null at the boundary.' },
  { selector: 'TSNullKeyword', message: 'Use undefined; convert null at the boundary.' },
];

const ioPackages = [
  'node:*',
  'fs',
  'path',
  'http',
  'https',
  'net',
  'child_process',
  'express',
  'fastify',
  'hono',
  'koa',
  '@nestjs/*',
  'pg',
  'mysql2',
  'mongodb',
  'mongoose',
  'redis',
  'ioredis',
  '@prisma/*',
  'drizzle-orm',
  'drizzle-orm/*',
  'typeorm',
  'kysely',
  'axios',
  'undici',
  '@aws-sdk/*',
  '@google-cloud/*',
];

const naming = [
  'error',
  { selector: 'default', format: ['strictCamelCase'], leadingUnderscore: 'allow' },
  // StrictPascalCase covers companion objects of the same-named type (`const OrderId = {...}`).
  { selector: 'variable', format: ['strictCamelCase', 'UPPER_CASE', 'StrictPascalCase'] },
  {
    selector: 'variable',
    types: ['boolean'],
    format: ['StrictPascalCase'],
    prefix: ['is', 'has', 'can', 'should', 'was', 'will'],
  },
  { selector: 'function', format: ['strictCamelCase', 'StrictPascalCase'] },
  { selector: 'typeLike', format: ['StrictPascalCase'] },
  // Property names often mirror external shapes (JSON, headers, SQL rows).
  {
    selector: ['objectLiteralProperty', 'typeProperty', 'objectLiteralMethod', 'typeMethod'],
    format: null,
  },
  { selector: 'import', format: null },
];

export default defineConfig(
  { ignores: ['dist/', 'coverage/'] },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { architecture },
    rules: {
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-misused-spread': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      'architecture/entity-shape': 'error',
      'architecture/layers': 'error',
      'architecture/single-execute': 'error',
      eqeqeq: ['error', 'always'],
      'no-console': 'error',
      'no-restricted-syntax': ['error', ...everywhere],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  {
    files: ['**/*.ts'],
    rules: { '@typescript-eslint/naming-convention': naming },
  },
  {
    files: ['src/modules/*/domain/**', 'src/modules/*/application/**'],
    rules: {
      'no-restricted-syntax': ['error', ...innerLayers],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ioPackages,
              message: 'Domain and application code stay free of I/O; use a port.',
            },
          ],
        },
      ],
    },
  },
  {
    // Creating a brand needs one cast; the kernel is the only place allowed to make it.
    files: ['src/shared/kernel/**'],
    rules: { '@typescript-eslint/consistent-type-assertions': 'off' },
  },
  {
    files: ['src/**/*.{js,jsx,mjs,cjs}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: 'Program', message: 'Application code is TypeScript; rename to .ts.' },
      ],
    },
  },
  {
    // Tests wire real implementations and fakes together across layers.
    files: ['**/*.test.ts'],
    plugins: { vitest },
    rules: {
      // expect.any() returns any by design; whole-object assertions need it.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      'architecture/layers': 'off',
      'no-restricted-imports': 'off',
      'no-restricted-syntax': [
        'error',
        ...everywhere,
        {
          selector:
            'CallExpression[callee.object.name="expect"][callee.property.name=/^(objectContaining|arrayContaining)$/]',
          message: 'Assert the whole value with toStrictEqual.',
        },
      ],
      // Partial or loose matchers let a wrong result pass; compare whole values instead.
      'vitest/no-restricted-matchers': [
        'error',
        {
          toEqual: 'Use toStrictEqual.',
          toMatchObject: 'Use toStrictEqual on the whole object.',
          toHaveLength: 'Use toStrictEqual on the whole array.',
          toBeTruthy: 'Use toStrictEqual with the exact value.',
          toBeFalsy: 'Use toStrictEqual with the exact value.',
          toBeDefined: 'Use toStrictEqual with the exact value.',
          toHaveBeenCalled: 'Use toStrictEqual on mock.calls.',
          toHaveBeenCalledOnce: 'Use toStrictEqual on mock.calls.',
          toHaveBeenCalledTimes: 'Use toStrictEqual on mock.calls.',
          toHaveBeenCalledWith: 'Use toStrictEqual on mock.calls.',
          toHaveBeenLastCalledWith: 'Use toStrictEqual on mock.calls.',
          toHaveBeenNthCalledWith: 'Use toStrictEqual on mock.calls.',
        },
      ],
      // A test without a reachable assertion passes no matter what the code does.
      'vitest/expect-expect': 'error',
      'vitest/no-conditional-expect': 'error',
      'vitest/no-conditional-in-test': 'error',
      'vitest/no-conditional-tests': 'error',
      'vitest/no-disabled-tests': 'error',
      'vitest/no-focused-tests': 'error',
      'vitest/no-identical-title': 'error',
      'vitest/no-standalone-expect': 'error',
      'vitest/no-test-return-statement': 'error',
      'vitest/prefer-strict-equal': 'error',
      'vitest/valid-expect': 'error',
      'vitest/valid-title': 'error',
    },
  },
  {
    // Tooling loads these files through their default export.
    files: ['*.config.{js,mjs,ts}'],
    rules: { 'no-restricted-syntax': ['error', everywhere[1]] },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  prettier,
);
