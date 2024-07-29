import esbuild from 'esbuild'
import { fileURLToPath } from 'url'
import { dirname , resolve} from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)


esbuild.context({
  entryPoints: ['./src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'browser', 
  sourcemap: true,
  format: 'iife', // esm cjs iife
  globalName: 'BR'
}).then((ctx) => {
  console.log('start dev');
  ctx.watch()
})