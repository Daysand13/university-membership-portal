/**
 * Lets a script run server code outside Next.js.
 *
 * Services start with `import "server-only"`, a guard Next.js resolves
 * itself so that server code can't end up in a browser bundle. A script run
 * with tsx is already on the server, so here the guard resolves to nothing,
 * as tests/unit/server-only-stub.ts does for the test suite.
 *
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/<script>.ts
 */
// A --require hook runs before any ES module loader, so it has to be CommonJS.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Module = require("node:module");

const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === "server-only") return __filename;
  return resolve.call(this, request, ...rest);
};
