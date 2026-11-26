import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getIcon, iconSvg, searchIcons } from './icons'

test('generic website icon and Google review icon are searchable and render inline', () => {
  assert.ok(getIcon('website'), 'website icon missing')
  assert.match(iconSvg('website')!, /stroke="currentColor"/)
  assert.match(iconSvg('website', '#64748b')!, /stroke="#64748b"/)
  assert.ok(searchIcons('website').some((i) => i.slug === 'website'))
  assert.ok(searchIcons('review').some((i) => i.slug === 'googlereview'), 'review search finds nothing')
  assert.match(iconSvg('googlereview')!, /<path d="M/)
})

test('brand icons still render and unknown slugs stay null', () => {
  assert.match(iconSvg('instagram')!, /<path d="M/)
  assert.equal(getIcon('definitely-not-an-icon'), null)
  assert.equal(iconSvg('definitely-not-an-icon'), null)
})
