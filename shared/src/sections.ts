import { z } from 'zod'

/**
 * The structured-data contract for a page: an ordered list of typed blocks, each validated here.
 * Templates never see raw input; every string is length-capped so a block can't bloat the render.
 */

const text = (max: number, def = '') => z.string().max(max).default(def)
// Stable per-item id (set by the editor) so click stats survive reordering.
const itemId = z.string().regex(/^[A-Za-z0-9_-]{0,24}$/).default('')

export const ImageRef = z.object({
  url: z.string().max(1000),
  alt: text(160),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
})
export type ImageRef = z.infer<typeof ImageRef>

export const ProfileData = z.object({
  name: text(80),
  bio: text(300),
  avatar: ImageRef.optional(),
})

export const LinkItem = z.object({
  id: itemId,
  label: text(80),
  url: text(1000),
  icon: text(64),                 // simple-icons slug
  iconImage: ImageRef.optional(), // uploaded logo, wins over icon
})
export const LinksData = z.object({ items: z.array(LinkItem).max(50).default([]) })

export const SocialItem = z.object({ id: itemId, icon: text(64), url: text(1000) })
export const SocialsData = z.object({ items: z.array(SocialItem).max(20).default([]) })

export const PhoneNumber = z.object({ label: text(40), number: text(32) })
// One button; tapping it lists every number so the visitor picks which one to call.
export const PhoneData = z.object({
  label: text(60, 'Call'),
  numbers: z.array(PhoneNumber).max(6).default([]),
})

export const VcardData = z.object({
  label: text(60, 'Save contact'),
  firstName: text(60),
  lastName: text(60),
  org: text(80),
  title: text(80),
  phones: z.array(PhoneNumber).max(6).default([]),
  email: text(120),
  website: text(300),
  address: text(200),
  note: text(300),
})

export const EmbedItem = z.object({ id: itemId, url: text(1000) })
export const EmbedData = z.object({ heading: text(80), items: z.array(EmbedItem).max(12).default([]) })

export const GalleryData = z.object({ heading: text(80), images: z.array(ImageRef).max(30).default([]) })

export const SECTION_SCHEMAS = {
  profile: ProfileData,
  links: LinksData,
  socials: SocialsData,
  phone: PhoneData,
  vcard: VcardData,
  embed: EmbedData,
  gallery: GalleryData,
} as const

export type SectionType = keyof typeof SECTION_SCHEMAS
export const SECTION_TYPES = Object.keys(SECTION_SCHEMAS) as SectionType[]
export type SectionDataMap = { [K in SectionType]: z.infer<(typeof SECTION_SCHEMAS)[K]> }

// The only blocks a non-admin account may edit ("icons / accounts").
export const USER_EDITABLE_TYPES: readonly SectionType[] = ['links', 'socials', 'phone']

/** Validate + fill defaults for a section's data given its type. Throws on invalid. */
export function parseSectionData<T extends SectionType>(type: T, data: unknown): SectionDataMap[T] {
  const schema = SECTION_SCHEMAS[type]
  if (!schema) throw new Error(`Unknown section type: ${type}`)
  return schema.parse(data ?? {}) as SectionDataMap[T]
}

export function isSectionType(v: string): v is SectionType {
  return Object.prototype.hasOwnProperty.call(SECTION_SCHEMAS, v)
}
