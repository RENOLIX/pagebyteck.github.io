import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseEmbed } from '@portfolio/shared'

test('youtube watch, short link and embed urls', () => {
  for (const u of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtu.be/dQw4w9WgXcQ?t=3', 'https://m.youtube.com/embed/dQw4w9WgXcQ']) {
    const e = parseEmbed(u)
    assert.deepEqual(e, { kind: 'youtube', src: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', ratio: '16/9', thumb: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg' })
  }
})

test('youtube shorts are vertical', () => {
  const e = parseEmbed('https://youtube.com/shorts/abcDEF12345?feature=share')
  assert.equal(e?.src, 'https://www.youtube-nocookie.com/embed/abcDEF12345')
  assert.equal(e?.ratio, '9/16')
})

test('tiktok video uses the official player', () => {
  const e = parseEmbed('https://www.tiktok.com/@some.user/video/7234567890123456789?is_from_webapp=1')
  assert.deepEqual(e, { kind: 'tiktok', src: 'https://www.tiktok.com/player/v1/7234567890123456789', ratio: '9/16' })
})

test('instagram post and reel', () => {
  assert.equal(parseEmbed('https://www.instagram.com/p/C1a2B3c4D5e/')?.src, 'https://www.instagram.com/p/C1a2B3c4D5e/embed/')
  const r = parseEmbed('https://instagram.com/reel/C9zYxWvUtSr/?igsh=abc')
  assert.equal(r?.src, 'https://www.instagram.com/reel/C9zYxWvUtSr/embed/')
  assert.equal(r?.ratio, '9/16')
})

test('x and twitter posts', () => {
  for (const u of ['https://x.com/someone/status/1790000000000000000', 'https://twitter.com/someone/status/1790000000000000000?s=20']) {
    assert.equal(parseEmbed(u)?.src, 'https://platform.twitter.com/embed/Tweet.html?id=1790000000000000000')
  }
})

test('facebook video and post go through the plugin with an encoded href', () => {
  const v = parseEmbed('https://www.facebook.com/somepage/videos/1234567890/')
  assert.equal(v?.kind, 'facebook')
  assert.equal(v?.src, 'https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent('https://www.facebook.com/somepage/videos/1234567890/') + '&show_text=false')
  const p = parseEmbed('https://www.facebook.com/somepage/posts/pfbid0abc123')
  assert.ok(p?.src.startsWith('https://www.facebook.com/plugins/post.php?href='))
  assert.equal(parseEmbed('https://fb.watch/abcDEF/')?.kind, 'facebook')
})

test('rejects anything that is not an allowlisted provider', () => {
  for (const u of ['javascript:alert(1)', 'https://evil.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com.evil.com/watch?v=dQw4w9WgXcQ',
    'https://www.facebook.com.evil.com/x/videos/1', 'https://www.youtube.com/watch?v="><script>', '', 'not a url']) {
    assert.equal(parseEmbed(u), null, u)
  }
})
