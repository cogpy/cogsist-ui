import { build } from "@assistant-ui/x-buildutils";

build({
  entryPoints: ["src/index.ts"],
  formats: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  external: [
    "react",
    "react-dom", 
    "@assistant-ui/react",
    "assistant-stream",
    "ws",
    "zod"
  ],
  target: ["es2020"],
});