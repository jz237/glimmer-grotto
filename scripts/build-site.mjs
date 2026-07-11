import { createBuilder, version as viteVersion } from "vite";

// Vite's default Windows config loader and the Cloudflare development plugin
// launch helper subprocesses. Release automation can run in environments where
// child processes are intentionally denied, so compile the same Vinext graph
// with native config loading and the repository's explicit Worker entry.
process.env.GLIMMER_RESTRICTED_BUILD = "1";

console.log(`\n  Glimmer Grotto production build  (Vite ${viteVersion})\n`);
const builder = await createBuilder({
  root: process.cwd(),
  mode: "production",
  configLoader: "native",
});
await builder.buildApp();
