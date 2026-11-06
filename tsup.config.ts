import { defineConfig } from 'tsup';

/**
 * Build config: one bundle per public entry point, shipped as ESM + CJS with type declarations.
 * Peer dependencies (react, @napi-rs/canvas) stay external so the host project provides them.
 */
export default defineConfig({
    entry: {
        index: 'src/index.ts',
        browser: 'src/browser.ts',
        node: 'src/node.ts',
        react: 'src/react.tsx',
    },
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    target: 'es2018',
    // Shared chunk so every entry uses ONE core instance (single bank registry, one error class).
    splitting: true,
    treeshake: true,
    external: ['react', 'react/jsx-runtime', '@napi-rs/canvas'],
});
