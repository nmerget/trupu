import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist/index.js',
  banner: {
    js: "import{createRequire}from'module';const require=createRequire(import.meta.url);",
  },
});
