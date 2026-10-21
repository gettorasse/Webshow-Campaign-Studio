/* Builds dist/webshow-preview.html: the whole app in one file, no server needed.
   Used to try the app inside Claude (as an artifact with the "sample" capability, so the
   real model answers) or to send to someone as a single file. The source stays the truth.
   node scripts/preview.mjs */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, posix, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, ".."); const PUB = join(ROOT, "public");
const mods = new Map();
function add(rel) {
  if (mods.has(rel)) return; mods.set(rel, null);
  let src = readFileSync(join(PUB, rel), "utf8"); const names = [];
  src = src.replace(/^import\s*\{([^}]*)\}\s*from\s*"([^"]+)";?/gm, (_, list, spec) => {
    const dep = posix.normalize(posix.join(posix.dirname(rel), spec)); add(dep);
    return `const {${list.replace(/\s+as\s+/g, ": ")}} = __req(${JSON.stringify(dep)});`;
  });
  src = src.replace(/^export\s+(const|let|function|async function|class)\s+([A-Za-z_$][\w$]*)/gm, (_, kw, n) => { names.push(n); return `${kw} ${n}`; });
  if (/^\s*(import|export)\s/m.test(src)) throw new Error(`Unsupported import/export form in ${rel}`);
  mods.set(rel, `__def(${JSON.stringify(rel)}, function (__req) {\n${src}\nreturn { ${names.join(", ")} };\n});`);
}
add("js/main.js");
const runtime = `const __m = {}, __f = {}; function __def(k, f) { __f[k] = f; } function __req(k) { if (!(k in __m)) { __m[k] = {}; __m[k] = __f[k](__req); } return __m[k]; }`;
const js = [runtime, ...[...mods.values()], `__req("js/main.js");`].join("\n\n");
let html = readFileSync(join(PUB, "index.html"), "utf8");
html = html.replace(/<link rel="stylesheet" href="styles.css">/, () => `<style>\n${readFileSync(join(PUB, "styles.css"), "utf8")}\n</style>`)
  .replace(/<script type="module" src="js\/main.js"><\/script>/, () => `<script>\n${js.replace(/<\/script/gi, "<\\/script")}\n</script>`)
  .replace(/<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\n?/g, "")
  .replace(/<script id="desktop-to-pro">[\s\S]*?<\/script>\n?/, "")
  .replace(/\s*<a class="btn sm" href="\.\/\?view=pro">[^<]*<\/a>/, "");
const out = join(ROOT, "dist", "webshow-preview.html"); mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, html);
console.log(`Wrote ${out} (${(html.length / 1024).toFixed(0)} KB, ${mods.size} modules)`);
