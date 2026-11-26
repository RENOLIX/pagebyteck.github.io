import { renderTokensCss } from './tokens-css'
import { BASE_CSS } from './base-css'
import { renderSection } from './sections'
import { fontFacesFor, fontPreloadFor } from './fonts'
import { EMBED_HOSTS } from '@portfolio/shared'
import { SiteTokens, SiteSeo, parseSectionData, isSectionType } from '@portfolio/shared'

// Inline scripts below must never contain a literal closing script tag.

// Tap on an embed facade swaps in the provider iframe; the src is re-checked against the host allowlist.
const EMBED_JS =
  'var H=' + JSON.stringify(EMBED_HOSTS) + ';' +
  'document.addEventListener("click",function(e){var n=e.target;if(n&&n.nodeType===3)n=n.parentElement;' +
  'var f=n&&n.closest&&n.closest(".facade");if(!f)return;var u=f.getAttribute("data-embed")||"";' +
  'if(!H.some(function(h){return u.indexOf(h)===0}))return;var i=document.createElement("iframe");' +
  'i.src=u.indexOf("youtube-nocookie")>0?u+"?autoplay=1&playsinline=1":u;i.title="embed";' +
  'i.setAttribute("allow","autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture; web-share");' +
  'i.setAttribute("allowfullscreen","");f.parentNode.replaceChild(i,f)},false)'

// Click stats: fire-and-forget beacon per tracked element, never delays navigation.
const clickJs = (username: string) =>
  'document.addEventListener("click",function(e){var n=e.target;if(n&&n.nodeType===3)n=n.parentElement;' +
  'var a=n&&n.closest&&n.closest("[data-k]");if(!a)return;' +
  'try{navigator.sendBeacon("/c?u=' + username + '&k="+encodeURIComponent(a.getAttribute("data-k")))}catch(x){}},true)'

// Android in-app browsers (Instagram, TikTok, Facebook) trap links; punch out to the system browser.
// iOS has no working escape, so it is left untouched.
const ESCAPE_INAPP =
  '(function(){var ua=navigator.userAgent||"";if(!/Android/i.test(ua))return;' +
  'if(!/FBAN|FBAV|FB_IAB|Instagram|Line\\/|TikTok|musical_ly|Bytedance|Snapchat|WhatsApp|MicroMessenger|LinkedInApp|Pinterest\\/|TwitterAndroid/i.test(ua))return;' +
  'document.addEventListener("click",function(e){var n=e.target;if(n&&n.nodeType===3)n=n.parentElement;' +
  'var a=n&&n.closest&&n.closest("a[href]");if(!a)return;var u=a.href;if(!/^https?:\\/\\//i.test(u))return;e.preventDefault();' +
  'location.href="intent://"+u.replace(/^https?:\\/\\//i,"")+"#Intent;scheme="+(/^https/i.test(u)?"https":"http")+";S.browser_fallback_url="+encodeURIComponent(u)+";end"},true)})()'

// editor preview: links and buttons don't navigate (the phone list still opens, embeds still load)
const PREVIEW_JS = 'document.addEventListener("click",function(e){var n=e.target;if(n&&n.nodeType===3)n=n.parentElement;' +
  'var t=n&&n.closest&&n.closest("a[href]");if(t)e.preventDefault()},true)'

export interface RenderInput {
  username: string
  title: string
  tokens: unknown
  seo: unknown
  sections: { id: string; type: string; data: unknown }[]
  previewMode?: boolean
}

/** Pure function: page data + tokens -> one self-contained HTML document. */
export function renderPortfolioHtml(input: RenderInput): string {
  const tokens = SiteTokens.parse(input.tokens ?? {})
  const seo = SiteSeo.parse(input.seo ?? {})
  const css = fontFacesFor(tokens.fontPair) + renderTokensCss(tokens) + BASE_CSS
  const title = seo.title || input.title || input.username
  const username = /^[a-z0-9-]+$/.test(input.username) ? input.username : ''

  const blocks = input.sections.map((s) => {
    if (!isSectionType(s.type)) return null
    try {
      return renderSection(s.type, parseSectionData(s.type, s.data), username)
    } catch (e) {
      console.error(`[render] skipped block ${s.id} (${s.type}):`, (e as Error).message)
      return null
    }
  })

  const script = input.previewMode ? PREVIEW_JS + ';' + EMBED_JS : EMBED_JS + ';' + clickJs(username) + ';' + ESCAPE_INAPP
  const doc = (
    <html lang="en" dir={tokens.direction}>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="color-scheme" content={tokens.mode} />
        <title>{title}</title>
        {seo.description ? <meta name="description" content={seo.description} /> : null}
        <meta property="og:title" content={title} />
        {seo.description ? <meta property="og:description" content={seo.description} /> : null}
        {seo.favicon && /^(\/uploads\/|https:\/\/)/i.test(seo.favicon) ? <link rel="icon" href={seo.favicon} /> : null}
        {fontPreloadFor(tokens.fontPair).map((u) => <link rel="preload" href={u} as="font" type="font/woff2" crossorigin="anonymous" />)}
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body>
        <main class="page">{blocks}</main>
        <script dangerouslySetInnerHTML={{ __html: script }} />
      </body>
    </html>
  )
  return '<!doctype html>' + doc.toString()
}
