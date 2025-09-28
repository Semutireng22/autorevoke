import globals from "globals";
import pluginReact from "eslint-plugin-react";
import pluginImport from "eslint-plugin-import";
import pluginJsdoc from "eslint-plugin-jsdoc";
import pluginJsonc from "eslint-plugin-jsonc";
import configNext from "eslint-config-next";
import configPrettier from "eslint-config-prettier";

export default [
  {
    ignores: ["dist", "artifacts", "cache", "node_modules"]
  },
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.node
      },
      sourceType: "module"
    },
    settings: {
      react: {
        version: "detect"
      }
    },
    plugins: {
      react: pluginReact,
      import: pluginImport,
      jsdoc: pluginJsdoc,
      jsonc: pluginJsonc
    },
    rules: {
      ...configNext.rules,
      ...configPrettier.rules,
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off"
    }
  }
];
