import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import nodePolyfills from 'rollup-plugin-node-polyfills';
import postcss from 'rollup-plugin-postcss';
import { babel } from '@rollup/plugin-babel';
import { terser } from 'rollup-plugin-terser';
import typescript from 'rollup-plugin-typescript2';

const frontendPlugins = [
  postcss({
    inject: true, // Inject CSS as JS, making it part of the bundle
    minimize: true, // Minify CSS
  }),
  json(),
  resolve({ extensions: ['.js', '.jsx', '.ts', '.tsx'] }),
  commonjs({
    include: /\/node_modules\//,
  }),
  typescript({
    tsconfig: 'tsconfig.frontend.json',
  }),
  babel({
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript'],
  }),
  terser(),
];

export default [
  {
    input: 'frontend/index.tsx',
    external: ['react', 'react-dom', '@tegonhq/ui', 'axios', 'react-query'],
    output: [
      {
        file: 'dist/frontend/index.js',
        sourcemap: true,
        format: 'cjs',
        exports: 'named',
        preserveModules: false,
        inlineDynamicImports: true,
      },
    ],
    plugins: frontendPlugins,
  },
  {
    input: 'backend/index.ts',
    external: ['axios'],
    output: [
      {
        file: 'dist/backend/index.js',
        sourcemap: true,
        format: 'cjs',
        exports: 'named',
        preserveModules: false,
      },
    ],
    plugins: [
      nodePolyfills(),
      json(),
      resolve({ extensions: ['.js', '.ts'] }),
      commonjs({
        include: /\/node_modules\//,
      }),
      typescript({
        tsconfig: 'tsconfig.json',
      }),
      terser(),
    ],
  },
];
