import { useEffect, useRef, useState, type ComponentType } from 'react'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowLeft, Contact, ExternalLink, Eye, EyeOff, GripVertical, Images, Link as LinkIcon, LoaderCircle, Phone, Plus, Share2, SquarePlay, Trash2, User,
} from 'lucide-react'
import { api, ApiError, type SiteFull, type SectionT } from '@/lib/api'
import { useMe } from '@/lib/me'
import { navigate } from '@/lib/nav'
import { useT, LangSwitcher } from '@/lib/i18n'
import { ThemeToggle } from '@/lib/theme'
import { Loading } from '@/components/Loading'
import { UserMenu } from '@/components/UserMenu'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Field, Fields, ImageField } from './Fields'
import { DesignPanel } from './DesignPanel'
import { StatsPanel } from './StatsPanel'

const BLOCKS: { type: string; icon: ComponentType<{ className?: string }> }[] = [
  { type: 'profile', icon: User }, { type: 'links', icon: LinkIcon }, { type: 'socials', icon: Share2 }, { type: 'phone', icon: Phone },
  { type: 'vcard', icon: Contact }, { type: 'embed', icon: SquarePlay }, { type: 'gallery', icon: Images },
]
const iconFor = (type: string) => BLOCKS.find((b) => b.type === type)?.icon ?? LinkIcon

type Saver = { timer: ReturnType<typeof setTimeout>; run: () => Promise<unknown> }
type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'adminOnly'

export function Editor({ siteId }: { siteId: string }) {
  const { t } = useT()
  const me = useMe()
  const admin = me.isAdmin
  const [site, setSite] = useState<SiteFull | null>(null)
  const [sections, setSections] = useState<SectionT[]>([])
  const [open, setOpen] = useState('')
  const [nonce, setNonce] = useState(0)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [view, setView] = useState<'edit' | 'preview'>('edit')
  const [publishing, setPublishing] = useState(false)
  const [picker, setPicker] = useState(false)
  // Debounced savers keyed by target. Refs mirror the latest state so a save never merges into a stale closure,
  // and publish flushes pending saves instead of dropping them.
  const savers = useRef<Record<string, Saver>>({})
  const siteRef = useRef<SiteFull | null>(null)
  const sectionsRef = useRef<SectionT[]>([])
  const pendingSite = useRef<Record<string, unknown>>({})

  const setSite2 = (next: SiteFull) => { siteRef.current = next; setSite(next) }
  const setSections2 = (fn: (s: SectionT[]) => SectionT[]) => { sectionsRef.current = fn(sectionsRef.current); setSections(sectionsRef.current) }

  async function track(p: Promise<unknown>): Promise<boolean> {
    try {
      await p
      setSaveState(Object.keys(savers.current).length ? 'saving' : 'saved')
      setNonce((n) => n + 1)
      return true
    } catch (e) {
      console.error('[editor] save failed', e)
      setSaveState(e instanceof ApiError && e.status === 403 ? 'adminOnly' : 'error')
      return false
    }
  }
  function schedule(key: string, ms: number, run: () => Promise<unknown>) {
    const prev = savers.current[key]
    if (prev) clearTimeout(prev.timer)
    setSaveState('saving')
    savers.current[key] = { run, timer: setTimeout(() => { delete savers.current[key]; void track(run()) }, ms) }
  }
  async function flushSaves(): Promise<boolean> {
    const pending = Object.values(savers.current)
    savers.current = {}
    for (const p of pending) clearTimeout(p.timer)
    const results = await Promise.all(pending.map((p) => track(p.run())))
    return results.every(Boolean)
  }

  useEffect(() => {
    api.getSite(siteId).then((r) => {
      siteRef.current = r.site
      sectionsRef.current = r.sections
      setSite(r.site)
      setSections(r.sections)
    }).catch((e) => { console.error('[editor] load failed', e); navigate('/', true) })
    const warn = (e: BeforeUnloadEvent) => { if (Object.keys(savers.current).length) e.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => { window.removeEventListener('beforeunload', warn); void flushSaves() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId])

  function editData(id: string, data: SectionT['data']) {
    setSections2((s) => s.map((x) => (x.id === id ? { ...x, data } : x)))
    schedule('sec_' + id, 500, () => api.updateSection(id, { data }))
  }
  function setSiteField(patch: Record<string, unknown>, ms = 400) {
    const cur = siteRef.current
    if (!cur) return
    setSite2({ ...cur, ...patch } as SiteFull)
    pendingSite.current = { ...pendingSite.current, ...patch }
    schedule('site', ms, () => {
      const p = pendingSite.current
      pendingSite.current = {}
      return api.updateSite(siteId, p)
    })
  }
  const setTokens = (patch: Record<string, unknown>) => setSiteField({ tokens: { ...(siteRef.current?.tokens ?? {}), ...patch } }, 300)
  const setSeo = (patch: Record<string, unknown>) => setSiteField({ seo: { ...(siteRef.current?.seo ?? {}), ...patch } })

  async function toggleVisible(s: SectionT) {
    setSections2((all) => all.map((x) => (x.id === s.id ? { ...x, visible: !s.visible } : x)))
    await track(api.updateSection(s.id, { visible: !s.visible }))
  }
  async function addBlock(type: string) {
    setPicker(false)
    setSaveState('saving')
    try {
      const r = await api.addSection(siteId, type)
      setSections2((s) => [...s, r.section])
      setOpen(r.section.id)
      setSaveState('saved')
      setNonce((n) => n + 1)
    } catch (e) {
      console.error('[editor] add block failed', e)
      setSaveState('error')
    }
  }
  async function deleteBlock(id: string) {
    const pending = savers.current['sec_' + id]
    if (pending) { clearTimeout(pending.timer); delete savers.current['sec_' + id] }
    setSections2((s) => s.filter((x) => x.id !== id))
    await track(api.deleteSection(id))
  }
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const s = sectionsRef.current
    const moved = arrayMove(s, s.findIndex((x) => x.id === active.id), s.findIndex((x) => x.id === over.id))
    setSections2(() => moved)
    void track(api.reorder(siteId, moved.map((x) => x.id)))
  }
  async function publish() {
    if (publishing) return
    setPublishing(true)
    try {
      if (!(await flushSaves())) return
      await api.publish(siteId)
      setSite2({ ...(siteRef.current as SiteFull), status: 'published' })
      setNonce((n) => n + 1)
    } catch (e) {
      console.error('[editor] publish failed', e)
      setSaveState('error')
    } finally {
      setPublishing(false)
    }
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))

  if (!site) return <Loading />
  const liveUrl = `${me.publicBaseUrl}/${site.username}`
  const saveLabel = saveState === 'saving' ? t('common.saving') : saveState === 'saved' ? t('common.saved')
    : saveState === 'adminOnly' ? t('ed.adminOnly') : saveState === 'error' ? t('common.saveError') : ''

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-2 sm:px-4">
        {admin && (
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label={t('ed.back')}><ArrowLeft className="rtl:rotate-180" /></Button>
        )}
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{site.title || site.username}</div>
          <div className="truncate text-xs text-muted-foreground" dir="ltr">{liveUrl.replace(/^https:\/\//, '')}</div>
        </div>
        {admin && <Badge variant={site.status === 'published' ? 'secondary' : 'outline'} className="hidden sm:inline-flex">{t(`dash.${site.status}`)}</Badge>}
        <span className={`hidden text-xs md:inline ${saveState === 'error' || saveState === 'adminOnly' ? 'text-destructive' : 'text-muted-foreground'}`} role="status" aria-live="polite">{saveLabel}</span>
        <div className="ms-auto flex items-center gap-1">
          <div className="hidden items-center sm:flex"><LangSwitcher /><ThemeToggle /></div>
          {site.status === 'published' && (
            <Button variant="outline" size="sm" asChild>
              <a href={liveUrl} target="_blank" rel="noopener"><ExternalLink /><span className="hidden sm:inline">{t('ed.viewLive')}</span></a>
            </Button>
          )}
          {admin && (
            <Button size="sm" onClick={publish} disabled={publishing}>
              {publishing && <LoaderCircle className="animate-spin" />}
              {publishing ? t('ed.publishing') : site.status === 'published' ? t('ed.update') : t('ed.publish')}
            </Button>
          )}
          <UserMenu />
        </div>
      </header>

      <div className="flex justify-center border-b py-2 md:hidden">
        <Tabs value={view} onValueChange={(v) => setView(v as 'edit' | 'preview')}>
          <TabsList><TabsTrigger value="edit" className="px-6">{t('ed.edit')}</TabsTrigger><TabsTrigger value="preview" className="px-6">{t('ed.preview')}</TabsTrigger></TabsList>
        </Tabs>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className={`${view === 'preview' ? 'hidden' : 'flex'} w-full shrink-0 flex-col border-e md:flex md:w-[420px]`}>
          <Tabs defaultValue="content" className="min-h-0 flex-1 gap-0">
            <div className="shrink-0 border-b px-3 pt-2">
              <TabsList variant="line" className="w-full">
                <TabsTrigger value="content">{t('ed.tabContent')}</TabsTrigger>
                {admin && <TabsTrigger value="design">{t('ed.tabDesign')}</TabsTrigger>}
                {admin && <TabsTrigger value="settings">{t('ed.tabSettings')}</TabsTrigger>}
                <TabsTrigger value="stats">{t('ed.tabStats')}</TabsTrigger>
              </TabsList>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <TabsContent value="content" className="grid gap-3">
                <p className="text-xs text-muted-foreground">{admin ? t('ed.adminHint') : t('ed.userHint')}</p>
                {sections.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">{t('ed.noBlocks')}</p>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                      <Accordion type="single" collapsible value={open} onValueChange={setOpen} className="gap-2">
                        {sections.map((s) => (
                          <BlockRow key={s.id} s={s} admin={admin} onData={(d) => editData(s.id, d)} onToggle={() => toggleVisible(s)} onDelete={() => deleteBlock(s.id)} />
                        ))}
                      </Accordion>
                    </SortableContext>
                  </DndContext>
                )}
                {admin && <Button variant="outline" onClick={() => setPicker(true)}><Plus />{t('ed.addBlock')}</Button>}
              </TabsContent>

              {admin && (
                <TabsContent value="design">
                  <DesignPanel tokens={site.tokens} onChange={setTokens} />
                </TabsContent>
              )}

              {admin && (
                <TabsContent value="settings" className="grid gap-4">
                  <Field label={t('s.title')}><Input maxLength={120} value={site.title} onChange={(e) => setSiteField({ title: e.target.value })} /></Field>
                  <Field label={t('s.seoTitle')}><Input maxLength={120} value={site.seo?.title ?? ''} onChange={(e) => setSeo({ title: e.target.value })} /></Field>
                  <Field label={t('s.seoDesc')}><Textarea maxLength={300} rows={3} value={site.seo?.description ?? ''} onChange={(e) => setSeo({ description: e.target.value })} /></Field>
                  <Field label={t('s.favicon')}>
                    <ImageField value={site.seo?.favicon ? { url: site.seo.favicon } : undefined} onChange={(img) => setSeo({ favicon: img?.url ?? '' })} />
                  </Field>
                </TabsContent>
              )}

              <TabsContent value="stats">
                <StatsPanel siteId={siteId} />
              </TabsContent>
            </div>
          </Tabs>
        </aside>

        <main className={`${view === 'edit' ? 'hidden' : 'flex'} min-w-0 flex-1 flex-col bg-muted/40 md:flex`}>
          <div className="min-h-0 flex-1 p-3 sm:p-6">
            <div className="mx-auto h-full w-full max-w-[420px] overflow-hidden rounded-3xl border bg-background shadow-sm">
              <Preview siteId={siteId} nonce={nonce} title={t('ed.previewTitle')} />
            </div>
          </div>
        </main>
      </div>

      <Dialog open={picker} onOpenChange={setPicker}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{t('ed.pickBlock')}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {BLOCKS.map(({ type, icon: Icon }) => (
              <button key={type} type="button" onClick={() => addBlock(type)}
                className="flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50">
                <span className="grid size-10 place-items-center rounded-lg bg-muted"><Icon className="size-5" /></span>
                <span className="text-sm font-medium">{t(`b.${type}`)}</span>
                <span className="text-[11px] leading-tight text-muted-foreground">{t(`bd.${type}`)}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function BlockRow({ s, admin, onData, onToggle, onDelete }: {
  s: SectionT; admin: boolean; onData: (d: SectionT['data']) => void; onToggle: () => void; onDelete: () => void
}) {
  const { t } = useT()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.id, disabled: !admin })
  const Icon = iconFor(s.type)
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}>
      <AccordionItem value={s.id} className="rounded-lg border bg-card px-2">
        <div className="flex items-center gap-1">
          {admin && (
            <button type="button" className="cursor-grab touch-none rounded p-1 text-muted-foreground" aria-label={t('ed.drag')} {...attributes} {...listeners}>
              <GripVertical className="size-4" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <AccordionTrigger className="px-1 hover:no-underline">
              <span className="flex min-w-0 items-center gap-2">
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <span className={`truncate ${s.visible ? '' : 'text-muted-foreground line-through'}`}>{t(`b.${s.type}`)}</span>
              </span>
            </AccordionTrigger>
          </div>
          {admin && (
            <>
              <Button variant="ghost" size="icon-sm" onClick={onToggle} aria-label={s.visible ? t('ed.hide') : t('ed.show')} title={s.visible ? t('ed.hide') : t('ed.show')}>
                {s.visible ? <Eye /> : <EyeOff />}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={t('common.delete')} title={t('common.delete')}><Trash2 /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('ed.confirmDel')}</AlertDialogTitle>
                    <AlertDialogDescription>{t('ed.confirmDelDesc')}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete}>{t('common.delete')}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
        <AccordionContent className="px-1 pb-4 pt-1">
          <Fields type={s.type} data={s.data} onChange={onData} />
        </AccordionContent>
      </AccordionItem>
    </div>
  )
}

// Reloads on each saved edit but keeps the scroll position, so editing a lower block doesn't jump to the top.
function Preview({ siteId, nonce, title }: { siteId: string; nonce: number; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null)
  const y = useRef(0)
  function onLoad() {
    const w = ref.current?.contentWindow
    if (!w) return
    if (y.current) w.scrollTo(0, y.current)
    w.addEventListener('scroll', () => { y.current = w.scrollY || 0 }, { passive: true })
  }
  return <iframe ref={ref} key={nonce} title={title} onLoad={onLoad} src={api.previewUrl(siteId, nonce)} className="size-full border-0" />
}
