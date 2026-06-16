import { defineConfig } from 'vitest/config'

// Separate config for Firestore rules tests — they need the emulator and run via
// `npm run test:rules` (which wraps them in `firebase emulators:exec`).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    testTimeout: 15000,
  },
})
