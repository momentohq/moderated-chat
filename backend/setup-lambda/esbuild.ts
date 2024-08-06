import * as fs from "fs";
import * as path from "path";
import { build } from "esbuild";

const functionsDir = "src";
const outDir = "dist";
const entryPoints = fs
  .readdirSync(path.join(__dirname, functionsDir))
  .map((entry) => `${functionsDir}/${entry}/handler.ts`);

build({
  entryPoints,
  bundle: true,
  outdir: path.join(__dirname, outDir),
  outbase: functionsDir,
  platform: "node",
  sourcemap: "external",
  write: true,
  minify: true,
  tsconfig: "./tsconfig.json",
  keepNames: true,
  // eslint-disable-next-line no-process-exit
}).catch(() => process.exit(1));
