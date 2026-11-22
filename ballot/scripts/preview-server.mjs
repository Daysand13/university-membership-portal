/**
 * The ballot screen in an ordinary browser, for checking wording, contrast
 * and keyboard order without starting Electron.
 *
 *   node ballot/scripts/preview-server.mjs     then open http://localhost:4123
 *
 * There is no terminal behind it: the page notices it is not inside ASSN
 * Ballot and shows sample content, takes no votes and plays no speaker.
 * Serves this folder's own files only, read-only.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env.PORT) || 4123;
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".wav": "audio/wav", ".mp3": "audio/mpeg", ".json": "application/json" };

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  // Redirected rather than served at "/", so the page's own relative links
  // (app.js, styles.css) resolve beside it.
  if (url.pathname === "/") {
    res.writeHead(302, { location: "/src/renderer/index.html" }).end();
    return;
  }
  const wanted = decodeURIComponent(url.pathname);
  const file = normalize(join(root, wanted));
  if (!file.startsWith(root + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream", "cache-control": "no-store" }).end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(port, () => console.log(`ASSN Ballot preview on http://localhost:${port}`));
