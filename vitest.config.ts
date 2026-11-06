import { defineConfig } from 'vitest/config';

// Tests run in plain Node; rendering is verified through the @napi-rs/canvas backend.
export default defineConfig({
    test: { environment: 'node', include: ['test/**/*.test.ts'] },
});
