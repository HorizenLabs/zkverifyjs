import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    files: ["**/*.ts"],
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
];
