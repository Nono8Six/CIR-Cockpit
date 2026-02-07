import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

const reactFiles = ["**/*.{jsx,tsx}"];
const tsRecommended = tseslint.configs.recommended;
const reactRecommended = react.configs.flat.recommended;
const reactJsxRuntime = react.configs.flat["jsx-runtime"];

export default [
  {
    ignores: ["dist", "node_modules", "coverage"]
  },
  js.configs.recommended,
  ...(Array.isArray(tsRecommended) ? tsRecommended : [tsRecommended]),
  {
    files: ["**/*.cjs"],
    languageOptions: {
      sourceType: "script",
      globals: {
        ...globals.node
      }
    }
  },
  {
    files: ["scripts/**/*.{js,mjs,cjs}"],
    languageOptions: {
      sourceType: "module",
      globals: {
        ...globals.node
      }
    }
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    },
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "toast",
          property: "error",
          message: "Utiliser notifyError() au lieu de toast.error()."
        }
      ]
    }
  },
  {
    files: ["src/services/errors/notify.ts"],
    rules: {
      "no-restricted-properties": "off"
    }
  },
  {
    files: ["**/__tests__/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "no-restricted-properties": "off"
    }
  },
  {
    ...reactRecommended,
    files: reactFiles,
    languageOptions: {
      ...reactRecommended.languageOptions,
      globals: {
        ...globals.browser
      }
    },
    settings: {
      react: {
        version: "detect"
      }
    }
  },
  {
    ...reactJsxRuntime,
    files: reactFiles
  },
  {
    files: reactFiles,
    plugins: {
      "react-hooks": reactHooks
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/preserve-manual-memoization": "off"
    }
  }
];
