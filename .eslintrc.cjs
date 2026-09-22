module.exports = {
  root: true,
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        moduleDirectory: ['node_modules', 'src/'],
      },
    },
  },
  env: {
    browser: true,
    es2022: true,
  },
  extends: ['airbnb', 'eslint:recommended', 'plugin:react/recommended', 'plugin:prettier/recommended', 'plugin:@typescript-eslint/recommended', 'plugin:react-hooks/recommended'],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', 'react', '@typescript-eslint'],
  rules: {
    'prettier/prettier': ['warn'],
    'import/prefer-default-export': 'off',
    'react/jsx-filename-extension': [
      1,
      {
        extensions: ['.tsx'],
      },
    ],
    'import/extensions': 'off',
    'react/function-component-definition': 'off',
    'no-restricted-syntax': 'off',
    'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    'react/react-in-jsx-scope': 'off',
    'react/jsx-props-no-spreading': 'off',

    // `void promise` — принятый в проекте способ пометить fire-and-forget запись
    // в IndexedDB, за результатом которой никто не следит.
    'no-void': ['error', { allowAsStatement: true }],
    // Мутация `.current` у ref, переданного параметром, — обычная работа с ref.
    'no-param-reassign': ['error', { props: false }],
    // Значения по умолчанию заданы в сигнатуре, propTypes проект не использует.
    'react/require-default-props': 'off',
    'react/button-has-type': 'off',
    // Автофокус в инлайн-переименовании локации — осознанный UX.
    'jsx-a11y/no-autofocus': 'off',
    // В проекте label оборачивает контрол, а не ссылается на него по id.
    'jsx-a11y/label-has-associated-control': ['error', { assert: 'either' }],
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true, allowExportNames: ['useLayerContext', 'useDrawContext'] },
    ],
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.tsx', 'src/test/**'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
