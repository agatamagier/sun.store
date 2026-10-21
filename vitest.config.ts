import { defineConfig } from 'vitest/config'

// Unit tests target pure, framework-free modules (spec extraction, filtering,
// query normalization)
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
})
