import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  define: {
    __DEV__: true,
  },
  resolve: {
    alias: {
      "react-native": path.resolve(__dirname, "test/react-native-mock.js"),
      "expo-secure-store": path.resolve(
        __dirname,
        "test/expo-secure-store-mock.js",
      ),
      "expo-notifications": path.resolve(
        __dirname,
        "test/expo-notifications-mock.js",
      ),
    },
  },
  test: {
    passWithNoTests: true,
  },
});
