import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: "./",
});

/** @type {import('jest').Config} */
const config = {
  coverageProvider: "v8",
  testEnvironment: "jest-environment-jsdom",
  watchman: false,
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
  testMatch: [
    "**/__tests__/**/*.[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)",
  ],
  collectCoverageFrom: [
    "utility/**/*.{ts,tsx}",
    "lib/**/*.{ts,tsx}",
    "constants/**/*.{ts,tsx}",
    "store/**/*.{ts,tsx}",
    "types/**/*.{ts,tsx}",
    "components/search/**/*.{ts,tsx}",
    "app/search/**/*.{ts,tsx}",
    "components/video/**/*.{ts,tsx}",
    "!components/video/UploadPage.tsx",
    "!components/video/ViewVideo.tsx",
    "!components/video/SaveToPlaylistModal.tsx",
    "components/partials/**/*.{ts,tsx}",
    "!components/partials/MobileNav.tsx",
    "components/user/ViewProfile.tsx",
    "components/CodeBlock.tsx",
    "components/Loader.tsx",
    "app/api/**/*.{ts,tsx}",
    "app/robots.ts",
    "app/sitemap.ts",
    "app/video-sitemap.xml/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

export default createJestConfig(config);
