import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Server actions must not be exported directly — every one has to go
    // through a wrapper in src/lib/actions/with-error-handling.ts, so an
    // unexpected failure shows a friendly message instead of a raw
    // "server error occurred" page. Writing `export async function foo`
    // in an actions file bypasses that, so it's blocked here: define the
    // function unexported (conventionally `fooImpl`) and export the
    // wrapped version at the bottom of the file instead.
    files: ["src/lib/actions/**/*.ts"],
    ignores: ["src/lib/actions/types.ts", "src/lib/actions/with-error-handling.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "ExportNamedDeclaration > FunctionDeclaration[async=true]",
          message:
            "Don't export server actions directly — wrap them with withActionErrorHandling / withVoidActionErrorHandling / withTypedActionErrorHandling (see src/lib/actions/with-error-handling.ts) so failures never surface as a raw server-error page.",
        },
      ],
    },
  },
]);

export default eslintConfig;
