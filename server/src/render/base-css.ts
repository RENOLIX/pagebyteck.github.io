// Link-in-bio layout: one centered column, logical properties only so RTL works without overrides.
export const BASE_CSS = `
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;text-size-adjust:100%}
body{margin:0;min-height:100svh;color:var(--fg);font-family:var(--font-body);font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased}
body::before,body::after{content:"";position:fixed;inset:0;pointer-events:none}
body::before{z-index:-2}body::after{z-index:-1}
img{max-width:100%;display:block}
a{color:inherit;text-decoration:none}
h1,h2{font-family:var(--font-display);margin:0;line-height:1.2}
p{margin:0}
.page{max-width:560px;margin-inline:auto;padding:48px 20px calc(48px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:14px}
.profile{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;margin-block-end:8px}
.avatar-wrap{position:relative}
.avatar{position:relative;width:112px;height:112px;border-radius:50%;object-fit:cover;box-shadow:var(--shadow)}
/* logo glow: a blurred copy of the logo, so the halo takes the logo's own colors */
.avatar-glow{display:none;position:absolute;inset:0;width:100%;height:100%;border-radius:50%;object-fit:cover;pointer-events:none}
.profile h1{font-size:24px;font-weight:700}
.bio{opacity:.85;white-space:pre-line;max-width:44ch}
/* mixed Arabic/French text: each line takes its own direction, so punctuation stays on the right side */
.profile h1,.bio,.lbl,.embeds h2,.gallery h2,.phone-row span:first-child{unicode-bidi:plaintext}
.links{display:flex;flex-direction:column;gap:12px}
.btn{position:relative;display:flex;align-items:center;justify-content:center;gap:10px;min-height:56px;padding:14px 52px;
  border-radius:var(--radius);background:var(--btn-bg);color:var(--btn-fg);border:1.5px solid var(--btn-border);box-shadow:var(--shadow);
  -webkit-backdrop-filter:var(--btn-blur);backdrop-filter:var(--btn-blur);font-weight:600;text-align:center;cursor:pointer;transition:transform .15s ease}
.btn:active{transform:scale(.98)}
@media(hover:hover){.btn:hover{transform:translateY(-2px)}}
.btn .ico{position:absolute;inset-inline-start:18px;width:20px;height:20px;display:grid;place-items:center;object-fit:contain}
.btn .ico svg{width:20px;height:20px}
.lbl{overflow-wrap:anywhere}
.socials{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}
.soc{width:48px;height:48px;display:grid;place-items:center;border-radius:50%;background:var(--btn-bg);color:var(--btn-fg);
  border:1.5px solid var(--btn-border);box-shadow:var(--shadow);-webkit-backdrop-filter:var(--btn-blur);backdrop-filter:var(--btn-blur)}
.phone>summary{list-style:none}
.phone>summary::-webkit-details-marker{display:none}
.phone-list{display:flex;flex-direction:column;gap:4px;margin-block-start:8px;padding:6px;border-radius:var(--radius);background:var(--btn-bg);color:var(--btn-fg);
  border:1.5px solid var(--btn-border);box-shadow:var(--shadow);-webkit-backdrop-filter:var(--btn-blur);backdrop-filter:var(--btn-blur)}
.phone-row{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:48px;padding:10px 14px;border-radius:calc(var(--radius) * .7);font-weight:600}
.phone-row .num{opacity:.75;font-variant-numeric:tabular-nums}
.phone-row:active{background:color-mix(in srgb,currentColor 12%,transparent)}
.embeds,.gallery{display:flex;flex-direction:column;gap:12px;margin-block-start:6px}
.embeds h2,.gallery h2{font-size:17px;text-align:center}
.embed{position:relative;width:100%;border-radius:var(--radius);overflow:hidden;background:#000;box-shadow:var(--shadow)}
.r-16-9{aspect-ratio:16/9}.r-4-5{aspect-ratio:4/5}.r-9-16{aspect-ratio:9/16;max-width:340px;margin-inline:auto}
.embed iframe,.facade{position:absolute;inset:0;width:100%;height:100%;border:0}
.facade{padding:0;margin:0;background:linear-gradient(160deg,#27272a,#000);color:#fff;cursor:pointer}
.facade img{width:100%;height:100%;object-fit:cover}
.facade .brand{position:absolute;inset-block-start:22px;inset-inline:0;display:grid;justify-items:center;opacity:.9}
.play{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:64px;height:64px;border-radius:50%;display:grid;place-items:center;background:rgba(0,0,0,.6);color:#fff}
.gallery .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.gallery img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:calc(var(--radius) * .6)}
@media(prefers-reduced-motion:reduce){.btn{transition:none}}
`
