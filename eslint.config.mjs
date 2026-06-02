import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // We're shipping internal pages in plain English — apostrophes
      // and quotes in JSX text are fine. Don't fail the build on them.
      "react/no-unescaped-entities": "off",
    },
  },
];

export default eslintConfig;
