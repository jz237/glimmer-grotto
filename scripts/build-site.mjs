import { createBuilder, version as viteVersion } from "vite";

// The Cloudflare plugin must participate in deployable release builds so it can
// emit the provider configuration beside the Worker. Sandboxed environments
// that deny helper subprocesses can still opt into the explicit Worker-entry
// fallback; macOS Seatbelt selects that fallback automatically.
const restrictedBuild =
  process.env.GLIMMER_RESTRICTED_BUILD === "1" ||
  process.env.CODEX_SANDBOX === "seatbelt";
process.env.GLIMMER_RESTRICTED_BUILD = restrictedBuild ? "1" : "0";

console.log(`\n  Glimmer Grotto production build  (Vite ${viteVersion})\n`);
const builder = await createBuilder({
  root: process.cwd(),
  mode: "production",
  configLoader: "native",
});
await builder.buildApp();
