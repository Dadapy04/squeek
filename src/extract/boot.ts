import { applyWheelBody, createWheelSession, resetWheelBaseline, STATUS_URL } from '../arena/wheel.ts'
import { drawAssetSheet } from './patterns.ts'
import { drawBlockStrip, drawCarryStrip, drawContactSheet, drawDirectionStrip, drawHoldStrip, drawSwingStrip, drawWalkStrip } from './pose.ts'
import { paintTitleScreen, titleUsesDesktopPrompt } from './title.ts'
import { clampCenter, followBase, stickVector } from './float-stick.ts'
import { AUDIO_KEY, playBoom, playFuseTick, playSoulBurst, playSoulCharge, resumeAudio } from './soul-audio.ts'
import { bedFor, cuesFromDelta, deltaFromSnaps, playBed, playBossFinale, playCue, readAudioPref as readMix, unlockAudio, writeAudioPref, type Ear } from './game-audio.ts'
import { armAttack, attackLive, blockSecondTap, disarmAttack, holdReleased, type AttackBuffer } from './input-lock.ts'
import { bossTitle, drawChestStrip, drawExtract, drawGallery, drawLootStrip, drawRevealStrip, setEffectBudget } from './view.ts'
import { backingRatio } from './camera.ts'
import { drawMapSheet } from './map-sprites.ts'
import { drawBoomStrip, drawFoeRoster } from './view.ts'
import { drawMinimap, reveal } from './minimap.ts'
import { loadExtract, writeExtract } from './save.ts'
import { ITEM_NAME, RARITY_COLOR, RARITY_NAME, STASH_SLOTS, type CoinRarity, type ItemUnit } from './coins.ts'
import { bladeDisplay, bossDisplay, depthPlan } from './depths.ts'
import { currentLocale, onLocale, setLocale, t, type MsgKey } from './i18n.ts'
import { roomAt } from './dungeon.ts'
import { markSeen, replayTutorial, skipTutorial, tipAnchor, tipToShow, type TipId, type TutorialWorld } from './tutorial.ts'
import { bagSlotsOf, needsSellConfirm, nextBagUpgrade, shieldMaxFor, swordDamage, swordReadout } from './economy.ts'
import { spearLabel, spearPower, spearStatLine, type Spear } from './spear.ts'
import { applyWorkshop, workshopAsk, workshopView, type WorkshopAction } from './workshop.ts'
import {
  bagFull,
  bagLimit,
  buyGoods,
  EXTRACT_TIME,
  HP_MAX,
  SOUL_CAST,
  refreshBanner,
  soulLow,
  SOUL_STAM,
  STAM_MAX,
  addSupport,
  bankRun,
  carriedCount,
  claimLoot,
  claimSoul,
  dropFoundSpear,
  dropFromBag,
  depthMods,
  claimTarget,
  soulNear,
  count,
  deploy,
  fieldBuy,
  equipBlade,
  equipSpear,
  unequipBlade,
  foeView,
  runCrates,
  inExtract,
  killRun,
  nearestVein,
  onStairs,
  stairsOpen,
  freshValue,
  repairStack,
  insureHeld,
  insureStash,
  sellCommon,
  sellOne,
  stashValue,
  uninsure,
  uninsureStash,
  upgradeBag,
  upgradeGear,
  localValue,
  spendSupport,
  step,
  unequipSpear,
  PROP_REACH,
  usableProp,
  useItem,
  warpFloor,
  type ExtractSave,
  type Input,
  type ItemKind,
  type Stack,
  type ZoneId,
} from './sim.ts'

const LABELS = new Proxy({} as Record<ItemKind, string>, {
  get: (_target, prop: string) => t(`item.short.${prop}` as MsgKey),
})

document.querySelector('#bootSplash')?.remove()

const titleEl = document.querySelector<HTMLElement>('#title')!
const titleCanvas = document.querySelector<HTMLCanvasElement>('#titleView')!
const titleCtx = titleCanvas.getContext('2d')!
let titleOpen = true
let titleStarted = performance.now()
const base = document.querySelector<HTMLElement>('#base')!
const field = document.querySelector<HTMLElement>('#field')!
const result = document.querySelector<HTMLElement>('#result')!
const stashEl = document.querySelector<HTMLElement>('#stash')!
const trayEl = document.querySelector<HTMLElement>('#tray')!
const deployBtn = document.querySelector<HTMLButtonElement>('#deploy')!
const deployError = document.querySelector<HTMLElement>('#deployError')!
const canvas = document.querySelector<HTMLCanvasElement>('#view')!
const mapCanvas = document.querySelector<HTMLCanvasElement>('#minimap')!
const mapCtx = mapCanvas.getContext('2d')!
mapCanvas.addEventListener('pointerdown', (event) => {
  event.preventDefault()
  event.stopPropagation()
  mapCanvas.classList.toggle('big')
  rememberTip('map')
})
const ctx = canvas.getContext('2d')!
const blockBtn = document.querySelector<HTMLButtonElement>('#block')
field.addEventListener('contextmenu', (event) => event.preventDefault())
field.addEventListener('selectstart', (event) => event.preventDefault())
const storage = probe()
let save: ExtractSave = loadExtract(storage)
let picks: Stack[] = []
let stick = { x: 0, y: 0, active: false }
const tap = { attack: false, dodge: false, interact: false, claim: false, soul: false, use: null as ItemKind | null }
let blocking = false
let bringShield = false
let stashFocus: { kind: ItemKind; coins?: number; spearId?: string; box?: boolean } | null = null
let outcome: 'extracted' | 'dead' | null = null
type ResultRow = { kind: string; name: string; n: number; value: number; rarity?: CoinRarity; brought: boolean; live?: ItemKind; spear?: Spear }
let lastResult: { kind: 'extracted' | 'dead'; rows: ResultRow[]; gained: number } | null = null
const wheel = createWheelSession()

settleLoaded()
renderBase()

function isIOS(): boolean {
  const ua = navigator.userAgent || ''
  if (/iP(hone|ad|od)/.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

function requestStageFullscreen(): void {
  if (isIOS()) return
  try {
    const root = document.documentElement
    if (document.fullscreenElement || typeof root.requestFullscreen !== 'function') return
    void root.requestFullscreen().catch(() => undefined)
  } catch {
    /* Fullscreen is optional. A rejection must not stop the screen change. */
  }
}

window.addEventListener('pointerdown', () => { resumeAudio(); unlockAudio(); requestStageFullscreen() }, { once: true })
window.addEventListener('pointerdown', (event) => {
  const el = event.target instanceof Element ? event.target : null
  if (el?.closest('button')) playCue(el.closest('[data-set-lang]') ? 'ui.lang' : 'ui.tap', mixPref())
}, true)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    resumeAudio()
    unlockAudio()
  }
})

function dismissTitle(): void {
  if (!titleOpen) return
  titleOpen = false
  titleEl.hidden = true
  document.body.classList.remove('title')
  renderBase()
  show('base')
  requestStageFullscreen()
}

titleEl.addEventListener('pointerdown', (event) => {
  const hit = event.target as HTMLElement | null
  if (hit?.id === 'titleFull' || hit?.closest('#titleLang')) return
  event.preventDefault()
  dismissTitle()
})
document.querySelector<HTMLButtonElement>('#titleFull')!.addEventListener('pointerdown', (event) => {
  event.stopPropagation()
  event.preventDefault()
  requestStageFullscreen()
})

deployBtn.addEventListener('click', () => {
  requestStageFullscreen()
  const error = deploy(save, picks.map((stack) => ({ ...stack })), bringShield)
  if (error) {
    deployError.hidden = false
    deployError.textContent = error
    return
  }
  picks = []
  bringShield = false
  outcome = null
  writeExtract(storage, save)
  show('field')
})

document.querySelector<HTMLButtonElement>('#resume')!.addEventListener('click', () => {
  if (!save.run) return
  outcome = null
  show('field')
})

document.querySelector<HTMLButtonElement>('#again')!.addEventListener('click', () => {
  outcome = null
  renderBase()
  show('base')
})

let attackBuffer: AttackBuffer | null = null
let useFlip = false
function bindTap(id: string, onTap: (event: PointerEvent) => void): void {
  const button = document.querySelector<HTMLButtonElement>(id)
  if (!button) return
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault()
    try { button.setPointerCapture(event.pointerId) } catch { /* synthetic pointer */ }
    onTap(event)
  })
}
bindTap('#attack', () => { attackBuffer = armAttack(performance.now()) })
bindTap('#dodge', () => { tap.dodge = true })
bindTap('#open', () => { tap.interact = true })
bindTap('#claim', (event) => { event.stopPropagation(); tap.claim = true })
bindTap('#useBandage', () => { tap.use = 'bandage' })
bindTap('#useTonic', () => { tap.use = 'tonic' })
bindTap('#soul', () => { tap.soul = true })
bindTap('#useItem', () => {
  if (!save.run || hudOpen) return
  const band = count(save.run.bag, 'bandage')
  const tonic = count(save.run.bag, 'tonic')
  if (band > 0 && tonic > 0) {
    useFlip = !useFlip
    tap.use = useFlip ? 'tonic' : 'bandage'
  } else if (band > 0) tap.use = 'bandage'
  else if (tonic > 0) tap.use = 'tonic'
})
bindTap('#support', () => {
  if (hudOpen) return
  if (spendSupport(save)) writeExtract(storage, save)
})
function pressBlock(event: PointerEvent): void {
  if (!blockBtn) return
  event.preventDefault()
  blocking = true
  blockBtn.setAttribute('aria-pressed', 'true')
  try { blockBtn.setPointerCapture(event.pointerId) } catch { /* synthetic pointer */ }
}
function releaseBlock(): void {
  blocking = false
  blockBtn?.setAttribute('aria-pressed', 'false')
}
blockBtn?.addEventListener('pointerdown', pressBlock)
for (const kind of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
  blockBtn?.addEventListener(kind, () => { if (holdReleased(kind)) releaseBlock() })
}
window.addEventListener('blur', () => { if (holdReleased('blur')) releaseBlock() })
document.addEventListener('visibilitychange', () => { if (document.hidden && holdReleased('visibilitychange')) releaseBlock() })
window.addEventListener('touchcancel', (event) => {
  if (event.target instanceof Element && event.target.closest('#block') && holdReleased('touchcancel')) releaseBlock()
})
document.querySelector('#gear')!.addEventListener('click', () => {
  const panel = document.querySelector<HTMLElement>('#settings')!
  panel.hidden = !panel.hidden
  syncHud()
})
document.querySelector('#settingsClose')!.addEventListener('click', () => closeSettings())
document.querySelector('#fullToggle')!.addEventListener('click', () => {
  if (document.fullscreenElement) {
    void document.exitFullscreen?.().catch(() => undefined)
    return
  }
  requestStageFullscreen()
})
document.querySelector('#overlayClose')!.addEventListener('click', () => closeOverlay())
document.querySelector('#overlayX')!.addEventListener('click', () => closeOverlay())
document.querySelector('#settingsX')!.addEventListener('click', () => closeSettings())
document.querySelector('#workshopX')!.addEventListener('click', () => closeWorkshop())
document.querySelector('#overlay')!.addEventListener('pointerdown', (event) => {
  if (event.target === event.currentTarget) closeOverlay()
})
document.querySelector('#settings')!.addEventListener('pointerdown', (event) => {
  if (event.target === event.currentTarget) closeSettings()
})
document.querySelector('#workshop')!.addEventListener('pointerdown', (event) => {
  if (event.target === event.currentTarget) closeWorkshop()
})
document.querySelector('#openBag')!.addEventListener('click', () => {
  if (save.run && bagFull(save.run)) rememberTip('bagfull')
  playCue('ui.bag', mixPref())
  openBag()
})
document.querySelector('#bagSwap')!.addEventListener('click', () => openBag())
document.querySelector('#bagDrop1')!.addEventListener('click', () => dropBag(1))
document.querySelector('#bagDropAll')!.addEventListener('click', () => dropBag(99))
document.querySelector('#bagUse')!.addEventListener('click', () => useBag())
document.querySelector('#openShop')!.addEventListener('click', () => openPanel('btn.workshop', 'shop.leadRun'))
document.querySelector('#openWorkshop')!.addEventListener('click', () => { rememberTip('workshop'); openWorkshop() })
const musicVol = document.querySelector<HTMLInputElement>('#musicVol')
const sfxVol = document.querySelector<HTMLInputElement>('#sfxVol')
function paintMix(): void {
  const pref = mixPref()
  if (musicVol) musicVol.value = String(Math.round((pref.muted ? 0 : pref.music) * 100))
  if (sfxVol) sfxVol.value = String(Math.round((pref.muted ? 0 : pref.sfx) * 100))
}
function storeMix(music: number, sfx: number): void {
  storage?.setItem(AUDIO_KEY, writeAudioPref({ muted: music <= 0 && sfx <= 0, volume: sfx, music, sfx }))
  paintMix()
}
musicVol?.addEventListener('input', () => storeMix(Number(musicVol.value) / 100, Number(sfxVol?.value ?? 70) / 100))
sfxVol?.addEventListener('input', () => storeMix(Number(musicVol?.value ?? 45) / 100, Number(sfxVol.value) / 100))
document.querySelector('#muteMix')?.addEventListener('click', () => {
  storage?.setItem(AUDIO_KEY, mixPref().muted ? writeAudioPref({ muted: false, volume: 0.7, music: 0.35, sfx: 0.7 }) : 'mute')
  paintMix()
})
paintMix()
document.querySelector('#tutorialReplay')?.addEventListener('click', () => {
  const next = replayTutorial()
  save.tutorialSeen = next.seen
  save.tutorialSkip = next.skip
  writeExtract(storage, save)
  closeSettings()
  refreshTip()
})
document.querySelector('#tipX')?.addEventListener('click', () => {
  const id = document.querySelector<HTMLElement>('#tip')?.dataset.tip as TipId | undefined
  if (id) rememberTip(id)
  refreshTip()
})
document.querySelector('#tipSkip')?.addEventListener('click', () => {
  const next = skipTutorial({ seen: save.tutorialSeen ?? [], skip: false })
  save.tutorialSeen = next.seen
  save.tutorialSkip = true
  writeExtract(storage, save)
  refreshTip()
})
document.querySelector('#sellCommon')?.addEventListener('click', () => rememberTip('sell'))
document.querySelector('#buyBandage')?.addEventListener('click', () => buyFromMerchant('bandage'))
document.querySelector('#buyP3k')?.addEventListener('click', () => buyFromMerchant('p3k'))
document.querySelector('#sellCommon')?.addEventListener('click', () => {
  const gained = sellCommon(save)
  const note = document.querySelector('#merchantNote')
  if (note) note.textContent = gained > 0 ? t('merchant.sold', { n: gained }) : t('merchant.none')
  if (gained > 0) { writeExtract(storage, save); popCoins(gained); renderBase() }
})
function buyFromMerchant(kind: 'bandage' | 'p3k'): void {
  const result = buyGoods(save, kind)
  const note = document.querySelector('#merchantNote')
  if (note) note.textContent = result.ok ? t('merchant.bought', { name: t(kind === 'bandage' ? 'item.bandage' : 'item.p3k') }) : result.reason
  if (result.ok) { writeExtract(storage, save); renderBase() }
}
document.querySelector('#workshopClose')!.addEventListener('click', () => closeWorkshop())
document.querySelector('#workshopNo')!.addEventListener('click', () => cancelWorkshop())
document.querySelector('#workshopYes')!.addEventListener('click', () => confirmWorkshop())
document.querySelector('#openHome')!.addEventListener('click', () => openPanel('home.panelTitle', 'home.panelBody'))
for (const id of ['#slotSword', '#slotShield', '#slotSoon']) {
  document.querySelector(id)!.addEventListener('click', (event) => event.preventDefault())
}
function closeOverlay(): void {
  panelCopy = null
  document.querySelector<HTMLElement>('#overlay')!.hidden = true
  syncHud()
}
function closeSettings(): void {
  document.querySelector<HTMLElement>('#settings')!.hidden = true
  syncHud()
}
function syncHud(): void {
  const settings = document.querySelector<HTMLElement>('#settings')!
  const overlay = document.querySelector<HTMLElement>('#overlay')!
  hudOpen = !settings.hidden || !overlay.hidden
}
let panelCopy: { title: MsgKey; body: MsgKey } | null = null
function openPanel(title: MsgKey, body: MsgKey): void {
  panelCopy = { title, body }
  bagPick = null
  document.querySelector<HTMLElement>('#bagDetail')!.hidden = true
  document.querySelector('#overlayTitle')!.textContent = t(title)
  const host = document.querySelector('#overlayBody')!
  host.replaceChildren()
  host.textContent = t(body)
  document.querySelector<HTMLElement>('#overlay')!.hidden = false
  syncHud()
}
function applyDom(): void {
  document.documentElement.lang = currentLocale()
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n as MsgKey | undefined
    if (key) el.textContent = t(key)
  })
  document.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((el) => {
    const key = el.dataset.i18nAria as MsgKey | undefined
    if (key) el.setAttribute('aria-label', t(key))
  })
  document.querySelectorAll<HTMLButtonElement>('[data-set-lang]').forEach((btn) => {
    const on = btn.dataset.setLang === currentLocale()
    btn.classList.toggle('on', on)
    btn.setAttribute('aria-pressed', on ? 'true' : 'false')
  })
}
document.querySelectorAll<HTMLButtonElement>('[data-set-lang]').forEach((btn) => {
  btn.addEventListener('pointerdown', (event) => {
    event.preventDefault()
    event.stopPropagation()
    const next = btn.dataset.setLang === 'id' ? 'id' : 'en'
    if (next !== currentLocale()) setLocale(next)
  })
})
function bagUse(kind: ItemKind): string {
  return t(`use.${kind}` as MsgKey)
}
type BagPick = { kind: ItemKind; spearId?: string; bladeId?: string; worn?: boolean; coins?: number; box?: boolean }
let bagPick: BagPick | null = null
type InvGroup = { kind: ItemKind; name: string; rarity?: CoinRarity; coins: number; qty: number; spearId?: string; origin?: ItemUnit['origin'] }

function invHead(total: string, cap: string): HTMLElement {
  const head = document.createElement('div')
  head.className = 'inv-head'
  const value = document.createElement('p')
  value.className = 'inv-total'
  value.textContent = total
  const slots = document.createElement('p')
  slots.className = 'inv-cap'
  slots.textContent = cap
  head.append(value, slots)
  return head
}

function emptySlot(): HTMLElement {
  const slot = document.createElement('div')
  slot.className = 'inv-slot empty'
  return slot
}

function itemSlot(kind: string, name: string, rarity: CoinRarity | undefined, coins: number, qty: number): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'inv-slot'
  button.dataset.kind = kind
  if (rarity) {
    button.dataset.rarity = rarity
    button.style.color = RARITY_COLOR[rarity]
  }
  const icon = document.createElement('span')
  icon.className = 'inv-ico bag-slot'
  icon.dataset.kind = kind
  const label = document.createElement('span')
  label.className = 'inv-name'
  label.textContent = name
  button.append(icon)
  if (qty > 1) {
    const count = document.createElement('span')
    count.className = 'inv-qty'
    count.textContent = String(qty)
    button.append(count)
  }
  if (coins > 0) {
    const badge = document.createElement('span')
    badge.className = 'inv-coin'
    badge.textContent = String(coins)
    if (rarity) badge.style.color = RARITY_COLOR[rarity]
    button.append(badge)
  }
  button.append(label)
  return button
}

function insuranceButton(held: { kind: ItemKind; unit?: ItemUnit; spear?: { id: string; rarity: CoinRarity; coins?: number } } | null | undefined, onClick: () => void): HTMLButtonElement {
  const button = held
    ? itemSlot(held.kind, held.spear ? t('spear.named', { rarity: RARITY_NAME[held.spear.rarity] }) : ITEM_NAME[held.kind], held.spear?.rarity ?? held.unit?.rarity, held.spear?.coins ?? held.unit?.coins ?? 0, 1)
    : itemSlot('asuransi', '', undefined, 0, 1)
  button.classList.add('insured')
  if (!held) button.classList.add('empty')
  const mark = document.createElement('span')
  mark.className = 'insure-mark'
  mark.textContent = t('stash.mark')
  button.append(mark)
  button.addEventListener('click', onClick)
  return button
}

function gearSlot(kind: string, name: string, rarity: CoinRarity | undefined, coins: number, worn: boolean): HTMLButtonElement {
  const button = itemSlot(kind, name, rarity, coins, 1)
  button.classList.add('worn')
  if (worn) button.dataset.equipped = '1'
  return button
}

function bagGroups(run: NonNullable<ExtractSave['run']>): InvGroup[] {
  const groups: InvGroup[] = []
  for (const stack of run.bag) {
    if (stack.kind === 'sword') continue
    for (const unit of repairStack(stack)) {
      const hit = groups.find((group) => group.kind === stack.kind && group.coins === unit.coins && group.rarity === unit.rarity && group.origin === unit.origin && !group.spearId)
      if (hit) hit.qty += 1
      else groups.push({ kind: stack.kind, name: ITEM_NAME[stack.kind], rarity: unit.rarity, coins: unit.coins, qty: 1, origin: unit.origin })
    }
  }
  for (const spear of run.found ?? []) {
    groups.push({ kind: 'tombak', name: t('spear.named', { rarity: RARITY_NAME[spear.rarity] }), rarity: spear.rarity, coins: spear.coins ?? 0, qty: 1, spearId: spear.id, origin: spear.origin })
  }
  groups.sort((a, b) => b.coins - a.coins || a.name.localeCompare(b.name))
  return groups
}
function openBag(): void {
  if (!save.run) return
  document.querySelector('#overlayTitle')!.textContent = t('bag.title')
  paintBag()
  document.querySelector<HTMLElement>('#overlay')!.hidden = false
  syncHud()
}
function paintBag(): void {
  const run = save.run
  const host = document.querySelector('#overlayBody')!
  const detail = document.querySelector<HTMLElement>('#bagDetail')!
  host.replaceChildren()
  if (!run) {
    host.textContent = t('bag.emptyRun')
    detail.hidden = true
    return
  }
  const carried = carriedCount(run)
  const coins = localValue(run.bag) + (run.found ?? []).reduce((sum, spear) => sum + (spear.coins ?? 0), 0)
  const panel = document.createElement('div')
  panel.className = 'inv'
  panel.append(invHead(t('bag.value', { n: coins }), `${carried}/${bagLimit(run)}`))
  const gear = document.createElement('div')
  gear.className = 'inv-gear'
  const weapon = gearSlot(run.spear ? 'tombak' : 'sword', run.spear ? t('spear.named', { rarity: RARITY_NAME[run.spear.rarity] }) : run.sword ? t('hud.sword') : t('stash.empty'), run.spear?.rarity, run.spear?.coins ?? 0, true)
  weapon.disabled = run.spear == null
  if (run.spear) {
    const wornSpear = run.spear
    weapon.addEventListener('click', () => {
      bagPick = { kind: 'tombak', spearId: wornSpear.id, worn: true }
      paintBag()
    })
  }
  if (bagPick?.worn) weapon.classList.add('on')
  const shield = gearSlot('shield', run.shield == null ? t('stash.noShield') : t('stash.shield', { n: run.shield, max: shieldMaxFor(run.shieldLevel ?? 1) }), undefined, 0, true)
  shield.disabled = true
  const box = insuranceButton(run.insured, () => {
    if (!run.insured) {
      bagPick = null
      paintBag()
      return
    }
    bagPick = { kind: run.insured.kind, spearId: run.insured.spear?.id, coins: run.insured.unit?.coins, box: true }
    paintBag()
  })
  if (bagPick?.box) box.classList.add('on')
  gear.append(weapon, shield, box)
  const grid = document.createElement('div')
  grid.className = 'inv-grid'
  const groups = bagGroups(run)
  for (const blade of run.foundBlades ?? []) {
    const button = itemSlot('sword', bladeDisplay(blade.id, blade.name), blade.rarity, blade.coins, 1)
    if (bagPick?.bladeId === blade.id) button.classList.add('on')
    button.addEventListener('click', () => {
      bagPick = { kind: 'sword', bladeId: blade.id }
      paintBag()
    })
    grid.append(button)
  }
  for (const group of groups) {
    const button = itemSlot(group.kind, group.name, group.rarity, group.coins, group.qty)
    const selected = bagPick != null && !bagPick.worn && bagPick.kind === group.kind && bagPick.spearId === group.spearId && bagPick.coins === group.coins
    if (selected) button.classList.add('on')
    button.addEventListener('click', () => {
      bagPick = { kind: group.kind, spearId: group.spearId, coins: group.coins }
      paintBag()
    })
    grid.append(button)
  }
  for (let i = groups.length + (run.foundBlades?.length ?? 0); i < bagLimit(run); i += 1) grid.append(emptySlot())
  const main = document.createElement('div')
  main.className = 'inv-main'
  const side = document.createElement('aside')
  side.className = 'inv-detail'
  side.append(detail)
  main.append(grid, side)
  panel.append(gear, main)
  host.append(panel)
  fillBagDetail(run, detail)
}
function fillBagDetail(run: NonNullable<ExtractSave['run']>, detail: HTMLElement): void {
  const drop1 = document.querySelector<HTMLButtonElement>('#bagDrop1')!
  const dropAll = document.querySelector<HTMLButtonElement>('#bagDropAll')!
  const use = document.querySelector<HTMLButtonElement>('#bagUse')!
  const text = document.querySelector('#bagDetailText')!
  const pick = bagPick
  detail.hidden = false
  if (!pick) {
    text.textContent = t('bag.pick')
    drop1.hidden = true
    dropAll.hidden = true
    use.hidden = true
    detail.querySelector<HTMLButtonElement>('#bagInsure')?.setAttribute('hidden', '')
    return
  }
  if (pick.worn && run.spear) {
    const color = RARITY_COLOR[run.spear.rarity]
    text.innerHTML = `<b>${spearLabel(run.spear)}</b><br><span style="color:${color}">${RARITY_NAME[run.spear.rarity]} · ${run.spear.coins ?? 0} ${t('coin.word')}</span><br>${spearStatLine(run.spear)} ${t('bag.worn')}`
    drop1.hidden = true
    dropAll.hidden = true
    use.hidden = true
    return
  }
  const spear = pick.spearId ? (run.found ?? []).find((item) => item.id === pick.spearId) : null
  const stack = run.bag.find((item) => item.kind === pick.kind)
  const units = (stack?.units ?? []).filter((unit) => pick.coins == null || unit.coins === pick.coins)
  const n = spear ? 1 : units.length || count(run.bag, pick.kind)
  const coins = spear ? spear.coins ?? 0 : units[0]?.coins ?? 0
  const rarity = spear ? spear.rarity : units[0]?.rarity
  const color = rarity ? RARITY_COLOR[rarity] : '#c4b8a4'
  const full = spear ? spearLabel(spear) : ITEM_NAME[pick.kind]
  const tier = rarity ? `${RARITY_NAME[rarity]} · ${coins} ${t('coin.word')}` : t('bag.noCoins')
  const extra = spear ? spearStatLine(spear) : bagUse(pick.kind)
  const home = units.some((unit) => unit.origin === 'stash') ? ` ${t('bag.fromStash')}` : ''
  text.innerHTML = `<b>${full}</b><br><span style="color:${color}">${tier}</span> ×${n}.${home}<br>${extra}`
  drop1.hidden = false
  dropAll.hidden = n < 2
  use.hidden = pick.kind !== 'bandage' && pick.kind !== 'tonic' && pick.kind !== 'p3k'
  const row = detail.querySelector('.row')
  let insure = detail.querySelector<HTMLButtonElement>('#bagInsure')
  if (!insure && row) {
    insure = document.createElement('button')
    insure.id = 'bagInsure'
    insure.type = 'button'
    row.append(insure)
  }
  if (!insure) return
  if (pick.bladeId) {
    const held = (run.foundBlades ?? []).find((item) => item.id === pick.bladeId)
    text.innerHTML = held ? `<b>${bladeDisplay(held.id, held.name)}</b><br><span style="color:${held.rarity === 'legenda' ? '#f2c04a' : '#b388ff'}">${RARITY_NAME[held.rarity]} · ${t('blade.power', { n: held.damage })} · ${held.coins} ${t('coin.word')}</span><br>${t('bag.foundBlade')}` : t('bag.missingBlade')
    drop1.hidden = true
    dropAll.hidden = true
    use.hidden = true
    if (insure && held) {
      insure.hidden = false
      insure.textContent = t('bag.insure')
      insure.onclick = () => {
        if (!save.run || !held) return
        const reason = insureHeld(save.run, 'sword', undefined, undefined, held.id)
        if (reason) text.textContent = reason
        else { bagPick = { kind: 'sword', bladeId: held.id, box: true }; paintBag() }
      }
    }
    return
  }
  if (pick.box && run.insured) {
    const held = run.insured
    const rarity = held.blade?.rarity ?? held.spear?.rarity ?? held.unit?.rarity
    const coins = held.blade?.coins ?? held.spear?.coins ?? held.unit?.coins ?? 0
    const color = rarity ? RARITY_COLOR[rarity] : '#c4b8a4'
    const name = held.blade ? `${bladeDisplay(held.blade.id, held.blade.name)} · ${t('blade.power', { n: held.blade.damage })}` : held.spear ? spearLabel(held.spear) : ITEM_NAME[held.kind]
    text.innerHTML = `<b>${name}</b><br><span style="color:${color}">${rarity ? `${RARITY_NAME[rarity]} · ` : ''}${coins} ${t('coin.word')}</span><br>${t('bag.box')}`
    drop1.hidden = true
    dropAll.hidden = true
    use.hidden = true
    insure.hidden = false
    insure.textContent = t('bag.uninsure')
    insure.onclick = () => {
      if (!save.run) return
      const reason = uninsure(save.run)
      const note = document.querySelector('#bagDetailText')!
      if (reason) note.textContent = reason
      else { bagPick = null; paintBag() }
    }
    return
  }
  insure.hidden = pick.kind === 'sword'
  insure.textContent = t('bag.insure')
  insure.onclick = () => {
    if (!save.run || !bagPick || bagPick.worn) return
    const reason = insureHeld(save.run, bagPick.kind, bagPick.coins, bagPick.spearId)
    const note = document.querySelector('#bagDetailText')!
    if (reason) note.textContent = reason
    else { bagPick = { kind: bagPick.kind, coins: bagPick.coins, spearId: bagPick.spearId, box: true }; paintBag() }
  }
}

function dropBag(n: number): void {
  const run = save.run
  if (!run || !bagPick || bagPick.worn) return
  const result = bagPick.spearId ? dropFoundSpear(run, bagPick.spearId) : dropFromBag(run, bagPick.kind, n, bagPick.coins)
  if (!result.ok) return
  if (bagPick.spearId || count(run.bag, bagPick.kind) <= 0) bagPick = null
  paintBag()
}
function useBag(): void {
  const run = save.run
  if (!run || !bagPick || (bagPick.kind !== 'bandage' && bagPick.kind !== 'tonic' && bagPick.kind !== 'p3k')) return
  if (!useItem(run, bagPick.kind)) return
  if (count(run.bag, bagPick.kind) <= 0) bagPick = null
  paintBag()
}
let workshopAction: WorkshopAction | null = null
let upgradePick: 'sword' | 'shield' | 'bag' | null = null
function openWorkshop(): void {
  workshopAction = null
  document.querySelector<HTMLElement>('#workshopConfirm')!.hidden = true
  document.querySelector('#workshopNote')!.textContent = ''
  paintWorkshop()
  document.querySelector<HTMLElement>('#workshop')!.hidden = false
}
function closeWorkshop(): void {
  workshopAction = null
  document.querySelector<HTMLElement>('#workshop')!.hidden = true
}
function cancelWorkshop(): void {
  workshopAction = null
  document.querySelector<HTMLElement>('#workshopConfirm')!.hidden = true
}
function paintWorkshop(): void {
  const view = workshopView(save)
  document.querySelector('#workshopStateText')!.textContent = view.state
  document.querySelector('#workshopStock')!.textContent = t('shop.stock', { scrap: view.scrap, ore: view.ore })
  document.querySelector('#workshopLead')!.textContent = view.duringRun
    ? t('shop.leadRun')
    : t('shop.lead', { coins: view.coins })
  const upgrades = document.querySelector('#workshopUpgrades')
  if (upgrades) {
    upgrades.replaceChildren()
    for (const card of view.upgrades) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'shop-act'
      button.disabled = !card.enabled
      button.dataset.upgrade = card.which
      const text = document.createElement('span')
      text.className = 'shop-copy'
      const oreNote = card.ore > 0 ? ` + ${card.ore} ${t('item.ore')}` : ''
      text.textContent = card.cost == null ? `${card.title}. ${card.now}. ${card.next}` : `${card.title}. ${card.now} → ${card.next}. ${card.cost} ${t('coin.word')}${oreNote}`
      if (!card.enabled && card.reason) {
        const why = document.createElement('small')
        why.textContent = card.reason
        text.append(document.createElement('br'), why)
      }
      button.append(text)
      button.addEventListener('click', () => {
        workshopAction = null
        upgradePick = card.which
        document.querySelector('#workshopAsk')!.textContent = t('shop.askUpgrade', { cost: card.cost ?? 0, next: card.next })
        document.querySelector('#workshopYes')!.textContent = t('shop.yesUpgrade')
        document.querySelector<HTMLElement>('#workshopConfirm')!.hidden = false
      })
      upgrades.append(button)
    }
    const bag = view.bag
    const bagBtn = document.createElement('button')
    bagBtn.type = 'button'
    bagBtn.className = 'shop-act'
    bagBtn.disabled = !bag.enabled
    bagBtn.dataset.upgrade = 'bag'
    const bagText = document.createElement('span')
    bagText.className = 'shop-copy'
    bagText.textContent = `${bag.title}. ${bag.detail}`
    if (!bag.enabled && bag.reason) {
      const why = document.createElement('small')
      why.textContent = bag.reason
      bagText.append(document.createElement('br'), why)
    }
    bagBtn.append(bagText)
    bagBtn.addEventListener('click', () => {
      if (!bag.enabled || bag.cost == null) return
      workshopAction = null
      upgradePick = 'bag'
      document.querySelector('#workshopAsk')!.textContent = t('shop.askUpgrade', { cost: bag.cost, next: bag.detail })
      document.querySelector('#workshopYes')!.textContent = t('shop.yesUpgrade')
      document.querySelector<HTMLElement>('#workshopConfirm')!.hidden = false
    })
    upgrades.append(bagBtn)
  }
  const box = document.querySelector('#workshopActions')!
  box.replaceChildren()
  for (const offer of view.offers) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'shop-act'
    button.disabled = !offer.enabled
    const icons = document.createElement('span')
    icons.className = 'icons'
    for (const kind of offer.ore > 0 ? (['scrap', 'ore'] as const) : (['scrap'] as const)) {
      const ico = document.createElement('span')
      ico.className = 'ico'
      ico.dataset.kind = kind
      icons.append(ico)
    }
    const text = document.createElement('span')
    text.className = 'shop-copy'
    text.textContent = offer.label
    if (!offer.enabled && offer.reason) {
      const why = document.createElement('small')
      why.textContent = offer.reason
      text.append(document.createElement('br'), why)
    }
    button.append(icons, text)
    button.addEventListener('click', () => {
      workshopAction = offer.action
      document.querySelector('#workshopAsk')!.textContent = workshopAsk(save, offer.action)
      document.querySelector('#workshopYes')!.textContent = offer.action === 'forge' ? t('shop.yesForge') : t('shop.yesMend')
      document.querySelector<HTMLElement>('#workshopConfirm')!.hidden = false
    })
    box.append(button)
  }
}
function confirmWorkshop(): void {
  if (upgradePick === 'bag') {
    const result = upgradeBag(save)
    if (result.ok) rememberTip('bagslot')
    upgradePick = null
    document.querySelector<HTMLElement>('#workshopConfirm')!.hidden = true
    paintWorkshop()
    const note = document.querySelector('#workshopNote')!
    note.textContent = result.ok ? result.note : result.reason
    if (result.ok) {
      writeExtract(storage, save)
      renderBase()
      paintWorkshop()
    }
    return
  }
  if (upgradePick) {
    const result = upgradeGear(save, upgradePick)
    upgradePick = null
    document.querySelector<HTMLElement>('#workshopConfirm')!.hidden = true
    paintWorkshop()
    const note = document.querySelector('#workshopNote')!
    note.textContent = result.ok ? result.note : result.reason
    if (result.ok) {
      writeExtract(storage, save)
      renderBase()
      paintWorkshop()
    }
    return
  }
  if (!workshopAction) return
  const result = applyWorkshop(save, workshopAction)
  workshopAction = null
  document.querySelector<HTMLElement>('#workshopConfirm')!.hidden = true
  paintWorkshop()
  const note = document.querySelector('#workshopNote')!
  if (!result.ok) {
    note.textContent = result.reason
    return
  }
  writeExtract(storage, save)
  renderBase()
  paintWorkshop()
  note.textContent = result.note
  const card = document.querySelector<HTMLElement>('#workshopCard')!
  card.classList.remove('flash')
  void card.offsetWidth
  card.classList.add('flash')
  clink()
}
let soulHeard = ''
function mixPref() {
  return readMix(storage?.getItem(AUDIO_KEY) ?? null)
}
function audioPref() {
  const mix = mixPref()
  return { muted: mix.muted, volume: mix.sfx }
}
let lastEar: Ear | null = null
function earOf(run: NonNullable<ExtractSave['run']>): Ear {
  const chart = run.chart
  const veins = chart?.veins ?? []
  const props = chart?.props ?? []
  return {
    hp: run.hp,
    stepping: run.stepping,
    swing: run.swing,
    dodge: run.dodge,
    blocking: run.blocking,
    shield: run.shield,
    bag: run.bag.length,
    drops: run.drops.length,
    slain: run.slain.length,
    bossSlain: run.foes.some((foe) => foe.kind === 'boss' && run.slain.includes(foe.id)),
    keys: run.keys ?? 0,
    opened: run.opened.length,
    cracks: props.filter((prop) => prop.kind === 'crack' && ((prop.hp ?? 3) <= 0 || prop.state === 'open')).length,
    vein: veins.reduce((sum, vein) => sum + Math.max(0, vein.max - vein.hp), 0),
    veinsBroken: veins.filter((vein) => vein.hp <= 0).length,
    fuse: props.filter((prop) => (prop.fuse ?? 0) > 0).length,
    booms: run.booms?.length ?? 0,
    channel: run.channel,
    depth: run.depth,
    room: run.roomId ?? '',
    coins: save.coins,
    sword: run.swordLevel ?? 0,
    slots: run.bagSlots ?? 12,
    banner: run.banner?.key ?? '',
    wind: run.foes.reduce((sum, foe) => sum + (foe.zone === run.zone ? foe.wind : 0), 0),
    heard: run.foes.reduce((sum, foe) => sum + (foe.zone === run.zone ? (foe.heard ?? 0) : 0), 0),
    low: run.hp > 0 && run.hp < HP_MAX * 0.35,
    hum: run.channel > 0.2,
  }
}
function hear(run: ExtractSave['run']): void {
  const pref = mixPref()
  if (!run || outcome) {
    lastEar = null
    playBed(bedFor({ title: titleOpen, run: false }), pref)
    return
  }
  const cues = cuesFromDelta(deltaFromSnaps(lastEar, earOf(run)))
  lastEar = earOf(run)
  for (const cue of cues) {
    if (cue === 'fuse.tick' || cue === 'barrel.boom') continue
    if (cue === 'boss.die') {
      playBossFinale(run.depth || 1, pref)
      continue
    }
    playCue(cue, pref)
  }
  const near = foeView(run).some((foe) => foe.hp > 0 && (foe.wind > 0 || (foe.heard ?? 0) > 0 || Math.hypot(foe.x - run.x, foe.y - run.y) < 130))
  const boss = run.foes.some((foe) => foe.kind === 'boss' && foe.room === run.roomId && foe.hp > 0 && !run.slain.includes(foe.id))
  playBed(bedFor({ run: true, depth: run.depth, combat: near, boss }), pref)
}
function watchSoul(run: NonNullable<ExtractSave['run']>): void {
  const cast = run.soul?.cast ?? 0
  const elapsed = cast > 0 ? SOUL_CAST - cast : 0
  if (run.soul?.phase === 'live' && soulHeard !== 'live') {
    soulHeard = 'live'
    tone(220, 0.18, 'sine')
  }
  if (cast > 0 && elapsed < 0.25 && soulHeard !== 'wind') {
    soulHeard = 'wind'
    playSoulCharge(audioPref())
  } else if (cast > 0 && elapsed >= 0.55 && soulHeard !== 'burst') {
    soulHeard = 'burst'
    playSoulBurst(audioPref())
  } else if (cast <= 0 && run.soul?.phase !== 'live') soulHeard = run.soul?.phase ?? ''
}
function tone(freq: number, seconds: number, type: OscillatorType): void {
  const pref = audioPref()
  if (pref.muted || pref.volume <= 0) return
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime
    const gain = ctx.createGain()
    const peak = Math.min(0.08, 0.09 * pref.volume)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds)
    gain.connect(ctx.destination)
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.value = freq
    osc.connect(gain)
    osc.start(now)
    osc.stop(now + seconds)
    window.setTimeout(() => void ctx.close(), seconds * 1000 + 80)
  } catch {
    /* Audio is feedback only. */
  }
}
function clink(): void {
  const pref = audioPref()
  if (pref.muted || pref.volume <= 0) return
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime
    const gain = ctx.createGain()
    const peak = Math.min(0.08, 0.09 * pref.volume)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18)
    gain.connect(ctx.destination)
    for (const [freq, at] of [[392, 0], [588, 0.07]] as const) {
      const osc = ctx.createOscillator()
      osc.type = 'square'
      osc.frequency.value = freq
      osc.connect(gain)
      osc.start(now + at)
      osc.stop(now + at + 0.09)
    }
    window.setTimeout(() => void ctx.close(), 280)
  } catch {
    /* Audio is optional feedback. A rejection must not undo the repair. */
  }
}
document.querySelector('#surrender')!.addEventListener('click', () => {
  if (!save.run) return
  if (!window.confirm(t('settings.giveUp') + '?')) return
  finish('dead')
})

const stickEl = document.querySelector<HTMLElement>('#stick')!
const stickCol = document.querySelector<HTMLElement>('#stickCol')!
const moveZone = document.querySelector<HTMLElement>('#moveZone')!
const knob = document.querySelector<HTMLElement>('#knob')!
let stickPointer: number | null = null
moveZone.addEventListener('pointerdown', (event) => {
  if (hudOpen || stickPointer != null || !fieldVisible()) return
  if ((event.target as Element | null)?.closest?.('#minimap, #slots .slot, #actions button, #shortcuts button, #bars, #gear')) return
  stickPointer = event.pointerId
  try { moveZone.setPointerCapture(event.pointerId) } catch { /* synthetic pointer */ }
  stick.active = true
  stickCol.classList.add('live')
  placeBase(event.clientX, event.clientY)
  aimStick(event.clientX, event.clientY)
})
window.addEventListener('pointermove', (event) => {
  if (event.pointerId !== stickPointer) return
  aimStick(event.clientX, event.clientY)
})
function endStick(event: PointerEvent): void {
  if (event.pointerId !== stickPointer) return
  if (moveZone.hasPointerCapture(event.pointerId)) moveZone.releasePointerCapture(event.pointerId)
  stickPointer = null
  stick = { x: 0, y: 0, active: false }
  placeKnob()
  stickCol.classList.remove('live')
  stickCol.style.left = ''
  stickCol.style.top = ''
  stickCol.style.bottom = ''
}
window.addEventListener('pointerup', endStick)
window.addEventListener('pointercancel', (event) => {
  if (event.pointerId !== stickPointer) return
  event.preventDefault()
})

const keys = new Set<string>()
window.addEventListener('keydown', (event) => {
  if (titleOpen && event.key === 'Enter') {
    event.preventDefault()
    dismissTitle()
    return
  }
  if (event.key === 'Escape') {
    const workshop = document.querySelector<HTMLElement>('#workshop')!
    const overlay = document.querySelector<HTMLElement>('#overlay')!
    const settings = document.querySelector<HTMLElement>('#settings')!
    if (!workshop.hidden) { closeWorkshop(); return }
    if (!overlay.hidden) { closeOverlay(); return }
    if (!settings.hidden) { closeSettings(); return }
  }
  keys.add(event.key.toLowerCase())
  if (event.key.toLowerCase() === 'j') tap.attack = true
  if (event.key.toLowerCase() === 'f') { blocking = true; blockBtn?.setAttribute('aria-pressed', 'true') }
  if (event.key.toLowerCase() === 'k') tap.dodge = true
  if (event.key.toLowerCase() === 'e') tap.interact = true
  if (event.key.toLowerCase() === 'g') tap.claim = true
  if (event.key.toLowerCase() === 'r') tap.use = 'bandage'
  if (event.key.toLowerCase() === 'q') tap.soul = true
  if ((event.key.toLowerCase() === 'i' || event.key === 'Tab') && save.run && fieldVisible() && !titleOpen) {
    event.preventDefault()
    const overlay = document.querySelector<HTMLElement>('#overlay')!
    const title = document.querySelector('#overlayTitle')!.textContent
    if (!overlay.hidden && title === 'Tas') closeOverlay()
    else if (overlay.hidden) openBag()
  }
})
window.addEventListener('keyup', (event) => {
  keys.delete(event.key.toLowerCase())
  if (event.key.toLowerCase() === 'f') releaseBlock()
})

let hudOpen = false
let sheetHold = false
let boomHeard = 0
let fuseHeard = 0
let last = performance.now()
let sinceSave = 0
let workEma = 8
const hudCache = new Map<string, string>()
const frameWork = new Float64Array(240)
let frameWorkN = 0
let frameWorkI = 0
function noteFrameWork(ms: number): void {
  frameWork[frameWorkI] = ms
  frameWorkI = (frameWorkI + 1) % frameWork.length
  if (frameWorkN < frameWork.length) frameWorkN += 1
}
function frame(now: number): void {
  if (document.hidden || sheetHold) {
    last = now
    requestAnimationFrame(frame)
    return
  }
  if (location.hash === '#galeri') {
    titleOpen = false
    titleEl.hidden = true
    for (const id of ['#bars', '#actions', '#slots', '#shortcuts', '#minimap', '#stickCol', '#moveZone', '#banner', '#bossBar', '#note', '#channel']) {
      const el = document.querySelector<HTMLElement>(id)
      if (el) el.hidden = true
    }
    show('field')
    const width = Math.max(1, canvas.clientWidth)
    const height = Math.max(1, canvas.clientHeight)
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
    drawGallery(ctx, width, height)
    requestAnimationFrame(frame)
    return
  }
  if (titleOpen) {
    const fine = titleUsesDesktopPrompt({
      fine: window.matchMedia('(pointer: fine)').matches,
      coarse: window.matchMedia('(pointer: coarse)').matches,
      hover: window.matchMedia('(hover: hover)').matches,
      width: window.innerWidth,
    })
    const width = Math.max(1, titleCanvas.clientWidth)
    const height = Math.max(1, titleCanvas.clientHeight)
    sizeCanvas(titleCanvas, titleCtx, width, height)
    paintTitleScreen(titleCtx, width, height, (now - titleStarted) / 1000, fine)
    hear(null)
    requestAnimationFrame(frame)
    return
  }
  try {
    const workStart = performance.now()
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    if (save.run && !outcome && hudOpen && fieldVisible()) {
      paint()
    } else if (save.run && !outcome && fieldVisible()) {
      const now = performance.now()
      const input = readInput()
      if (input.interact && save.run) {
        const note = fieldBuy(save, 'bandage')
        if (note) save.run.floats.push({ text: note, life: 1.6 })
      }
      const cdBefore = save.run.attackCd
      const next = step(save.run, input, dt)
      const ping = save.run?.boomPing ?? 0
      if (ping !== boomHeard) {
        boomHeard = ping
        playBoom(audioPref())
      }
      const ticks = save.run?.fuseTick ?? 0
      if (ticks !== fuseHeard) {
        fuseHeard = ticks
        playFuseTick(audioPref())
      }
      attackBuffer = disarmAttack(attackBuffer, (save.run?.attackCd ?? 0) > cdBefore, now)
      if (soulNear(save.run) && (tap.claim || tap.interact)) claimSoul(save.run)
      else if (tap.claim && !bagFull(save.run)) {
        const target = claimTarget(save.run)
        if (target) claimLoot(save.run, target.id, 'local')
        rememberTip('take')
      }
      notePlay(save.run, input)
      hear(save.run)
      tap.attack = false
      tap.dodge = false
      tap.interact = false
      tap.claim = false
      tap.soul = false
      tap.use = null
      if (next === 'extracted' || next === 'dead') finish(next)
      else {
        sinceSave += dt
        if (sinceSave > 0.4) {
          writeExtract(storage, save)
          sinceSave = 0
        }
        paint()
      }
    }
    const spent = performance.now() - workStart
    noteFrameWork(spent)
    workEma = workEma * 0.85 + spent * 0.15
    if (workEma > 12) setEffectBudget('low')
    else if (workEma < 7) setEffectBudget('full')
  } catch (err) {
    console.error(err)
  }
  requestAnimationFrame(frame)
}
onLocale(() => {
  applyDom()
  if (save.run) refreshBanner(save.run)
  if (!base.hidden) renderBase()
  const workshop = document.querySelector<HTMLElement>('#workshop')
  if (workshop && !workshop.hidden) paintWorkshop()
  const overlay = document.querySelector<HTMLElement>('#overlay')
  if (overlay && !overlay.hidden) {
    if (panelCopy) openPanel(panelCopy.title, panelCopy.body)
    else paintBag()
  }
  if (outcome && lastResult) paintResult(lastResult.kind, lastResult.rows, lastResult.gained)
})
applyDom()
show(outcome ? 'result' : save.run ? 'field' : 'base')
requestAnimationFrame(frame)

function rowName(row: ResultRow): string {
  if (row.spear) return spearLabel(row.spear)
  if (row.kind === 'shield') return t('item.shield')
  if (row.live) return ITEM_NAME[row.live]
  return row.name
}

function carriedRows(run: NonNullable<ExtractSave['run']>): ResultRow[] {
  const rows: ResultRow[] = []
  if (run.spear) rows.push({ kind: 'tombak', name: '', spear: run.spear, n: 1, value: 0, rarity: run.spear.rarity, brought: true })
  else if (run.sword) rows.push({ kind: 'sword', name: '', live: 'sword', n: 1, value: 0, brought: true })
  for (const spear of run.found ?? []) rows.push({ kind: 'tombak', name: '', spear, n: 1, value: spear.coins ?? 0, rarity: spear.rarity, brought: false })
  if (run.shield != null && run.shield > 0) rows.push({ kind: 'shield', name: '', n: run.shield, value: 0, brought: true })
  for (const stack of run.bag) {
    const buckets = new Map<string, { n: number; coins: number; rarity?: CoinRarity; brought: boolean }>()
    for (const unit of stack.kind === 'sword' ? [] : repairStack(stack)) {
      const key = `${unit.rarity}:${unit.coins}:${unit.origin}`
      const hit = buckets.get(key)
      if (hit) hit.n += 1
      else buckets.set(key, { n: 1, coins: unit.coins, rarity: unit.rarity, brought: unit.origin === 'stash' })
    }
    if (buckets.size === 0 && stack.kind === 'sword') rows.push({ kind: 'sword', name: '', live: 'sword', n: stack.n, value: 0, brought: true })
    for (const bucket of buckets.values()) {
      rows.push({
        kind: stack.kind,
        name: '',
        live: stack.kind,
        n: bucket.n,
        value: bucket.brought ? 0 : bucket.coins * bucket.n,
        rarity: bucket.rarity,
        brought: bucket.brought,
      })
    }
  }
  return rows
}

function finish(kind: 'extracted' | 'dead'): void {
  const carried = save.run ? carriedRows(save.run) : []
  const gained = save.run ? freshValue(save.run) : 0
  if (kind === 'extracted') bankRun(save)
  else killRun(save)
  outcome = kind
  lastResult = { kind, rows: carried, gained }
  writeExtract(storage, save)
  paintResult(kind, carried, gained)
}

function paintResult(kind: 'extracted' | 'dead', carried: ResultRow[], gained: number): void {
  const title = document.querySelector('#resultTitle')!
  const body = document.querySelector('#resultBody')!
  const loot = document.querySelector('#resultLoot')!
  const value = document.querySelector('#resultValue')!
  const heading = document.querySelector('#resultHeading')!
  document.querySelector('#resultKind')!.textContent = kind === 'extracted' ? t('result.extract') : t('result.dead')
  title.textContent = kind === 'extracted' ? t('result.banked') : t('result.lostTitle')
  body.textContent = kind === 'extracted' ? t('result.bankBody') : t('result.deadBody')
  heading.textContent = kind === 'extracted' ? t('result.loot') : t('result.lost')
  loot.replaceChildren()
  loot.classList.toggle('lost', kind === 'dead')
  if (carried.length === 0) {
    const empty = document.createElement('li')
    empty.className = 'loot'
    const name = document.createElement('b')
    name.textContent = kind === 'extracted' ? t('result.none') : t('result.emptyBag')
    empty.append(name)
    loot.append(empty)
  }
  carried.forEach((row, index) => {
    const item = document.createElement('li')
    item.className = `loot${row.brought ? '' : ' precious'}${kind === 'dead' ? ' lost' : ''}`
    item.dataset.kind = row.kind
    if (row.rarity) item.dataset.rarity = row.rarity
    item.style.animationDelay = `${index * 70}ms`
    const name = document.createElement('b')
    name.textContent = rowName(row)
    if (row.rarity) name.style.color = RARITY_COLOR[row.rarity]
    const meta = document.createElement('span')
    const tier = row.rarity ? `${RARITY_NAME[row.rarity]} · ` : ''
    const shown = Number.isFinite(row.value) ? row.value : 0
    meta.textContent = shown > 0 ? `×${row.n} · ${tier}${shown} ${t('coin.word')}` : `×${row.n} · ${tier}${row.brought ? t('bag.fromStash') : t('bag.noCoins')}`
    if (row.rarity) meta.style.color = RARITY_COLOR[row.rarity]
    item.append(name, meta)
    loot.append(item)
  })
  const fresh = Number.isFinite(gained) ? gained : 0
  value.textContent = kind === 'extracted' ? t('result.fresh', { n: fresh }) : t('result.noGain')
  show('result')
  requestAnimationFrame(fitLootRows)
}

function fitLootRows(): void {
  const loot = document.querySelector<HTMLElement>('#resultLoot')
  if (!loot || result.hidden) return
  const card = loot.querySelector<HTMLElement>('.loot')
  loot.style.maxHeight = ''
  if (!card) return
  const style = getComputedStyle(loot)
  const gap = parseFloat(style.rowGap || style.gap) || 0
  const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
  const borderY = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)
  const cardH = card.getBoundingClientRect().height
  const row = cardH + gap
  if (row <= gap) return
  const inner = loot.clientHeight - padY
  const rows = Math.floor((inner + gap) / row)
  if (rows < 1) return
  const fitted = rows * cardH + (rows - 1) * gap + padY + borderY
  if (fitted < loot.offsetHeight - 1 && loot.scrollHeight > loot.clientHeight + 1) loot.style.maxHeight = `${Math.ceil(fitted)}px`
}

let viewportW = 0
let viewportH = 0
function pinField(): void {
  const view = window.visualViewport
  const width = Math.max(window.innerWidth, Math.round(view?.width ?? 0))
  const height = Math.max(window.innerHeight, Math.round(view?.height ?? 0))
  const left = 0
  const top = 0
  field.style.left = `${left}px`
  field.style.top = `${top}px`
  field.style.right = 'auto'
  field.style.bottom = 'auto'
  field.style.width = `${Math.max(1, width)}px`
  field.style.height = `${Math.max(1, height)}px`
  const bars = document.querySelector<HTMLElement>('#bars')
  const barH = bars?.getBoundingClientRect().height ?? 0
  if (barH > 0) field.style.setProperty('--hud-top', `${Math.ceil(barH)}px`)
}
function syncViewport(): void {
  const view = window.visualViewport
  const width = Math.max(window.innerWidth, Math.round(view?.width ?? 0))
  const height = Math.max(window.innerHeight, Math.round(view?.height ?? 0))
  pinField()
  if (viewportW > 0 && Math.abs(width - viewportW) < 4 && Math.abs(height - viewportH) < 4) return
  viewportW = width
  viewportH = height
  const root = document.documentElement
  root.style.setProperty('--vv-w', `${Math.max(1, width)}px`)
  root.style.setProperty('--vv-h', `${Math.max(1, height)}px`)
  if (!result.hidden) {
    const loot = document.querySelector<HTMLElement>('#resultLoot')
    if (loot) loot.style.maxHeight = ''
    requestAnimationFrame(fitLootRows)
  }
}

window.addEventListener('resize', syncViewport)
window.addEventListener('orientationchange', () => {
  syncViewport()
  window.setTimeout(syncViewport, 80)
  window.setTimeout(syncViewport, 320)
})
window.visualViewport?.addEventListener('resize', syncViewport)
window.visualViewport?.addEventListener('scroll', syncViewport)
syncViewport()

const stopGesture = (event: Event) => event.preventDefault()
for (const name of ['gesturestart', 'gesturechange', 'gestureend']) {
  window.addEventListener(name, stopGesture, { passive: false })
}
window.addEventListener('dblclick', (event) => event.preventDefault())
let lastTouchEnd = 0
window.addEventListener('touchend', (event) => {
  if (event.target instanceof Element && event.target.closest('#block') && holdReleased('touchend')) releaseBlock()
  const now = performance.now()
  const delta = now - lastTouchEnd
  lastTouchEnd = now
  const el = event.target instanceof Element ? event.target : null
  const scrollable = !!el?.closest('.modal-body, #baseScroll, #resultLoot, input, textarea, select')
  if (blockSecondTap(delta, scrollable)) event.preventDefault()
}, { passive: false })
document.querySelector('#view')!.addEventListener('wheel', (event) => {
  const wheel = event as WheelEvent
  if (!fieldVisible() || !save.run) return
  if (wheel.ctrlKey || wheel.metaKey) wheel.preventDefault()
}, { passive: false })

function readInput(): Input {
  let x = stick.x
  let y = stick.y
  if (keys.has('w') || keys.has('arrowup')) y -= 1
  if (keys.has('s') || keys.has('arrowdown')) y += 1
  if (keys.has('a') || keys.has('arrowleft')) x -= 1
  if (keys.has('d') || keys.has('arrowright')) x += 1
  const shrine = save.run != null && soulNear(save.run)
  return { moveX: x, moveY: y, attack: tap.attack || attackLive(attackBuffer, performance.now()), dodge: tap.dodge, interact: tap.interact && !shrine, block: blocking, use: tap.use, soul: tap.soul }
}

function putText(selector: string, value: string): void {
  if (hudCache.get(selector) === value) return
  hudCache.set(selector, value)
  const el = document.querySelector(selector)
  if (el) el.textContent = value
}

function sizeCanvas(board: HTMLCanvasElement, pen: CanvasRenderingContext2D, width: number, height: number): void {
  const ratio = backingRatio(width, height, window.devicePixelRatio || 1)
  const bw = Math.max(1, Math.round(width * ratio))
  const bh = Math.max(1, Math.round(height * ratio))
  if (board.width !== bw || board.height !== bh) {
    board.width = bw
    board.height = bh
  }
  pen.setTransform(ratio, 0, 0, ratio, 0, 0)
  pen.imageSmoothingEnabled = false
}

function paint(): void {
  const run = save.run
  if (!run || outcome) return
  pinField()
  const view = window.visualViewport
  const width = Math.max(240, window.innerWidth, Math.round(view?.width ?? 0))
  const height = Math.max(180, window.innerHeight, Math.round(view?.height ?? 0))
  sizeCanvas(canvas, ctx, width, height)
  reveal(run)
  drawExtract(ctx, run, width, height)
  const bars = document.querySelector<HTMLElement>('#bars')!
  const mapW = Math.max(64, Math.round(mapCanvas.clientWidth))
  const mapH = Math.max(80, Math.round(mapCanvas.clientHeight))
  if (mapCanvas.width !== mapW || mapCanvas.height !== mapH) {
    mapCanvas.width = mapW
    mapCanvas.height = mapH
  }
  drawMinimap(mapCtx, run, mapW, mapH)
  const hp = document.querySelector<HTMLElement>('#hpFill')!
  const stam = document.querySelector<HTMLElement>('#stamFill')!
  hp.style.width = `${(run.hp / HP_MAX) * 100}%`
  stam.style.width = `${(run.stam / STAM_MAX) * 100}%`
  putText('#hpText', t('hud.hp', { n: Math.ceil(run.hp), max: HP_MAX }))
  putText('#stamText', t('hud.stam', { n: Math.ceil(run.stam), max: STAM_MAX }))
  putText('#zoneText', zoneLabel(run.zone))
  putText('#bagText', t('hud.bag', { n: carriedCount(run), max: bagLimit(run) }))
  const bagLit = (run.bagPulse ?? 0) > 0
  document.querySelector('#openBag')?.classList.toggle('pulse', bagLit)
  document.querySelector('#bagText')?.classList.toggle('pulse', bagLit)
  putText('#swordDaya', run.spear ? `${t('hud.spear')} ${spearPower(run.spear)}` : run.blade ? `${run.blade.damage}` : swordReadout(run.swordLevel ?? 1))
  putText('#misi', t('hud.floor', { n: run.depth || 1 }))
  const cue = document.querySelector<HTMLElement>('#floorCue')
  if (cue) {
    const showing = (run.floorCue ?? 0) > 0
    cue.hidden = !showing
    if (showing) {
      const title = document.querySelector('#floorCueTitle')
      const body = document.querySelector('#floorCueBody')
      const plan = depthPlan(run.depth || 1)
      if (title) title.textContent = t('floor.title', { n: run.depth || 1 })
      if (body) body.textContent = t('floor.body', { boss: bossDisplay(plan.boss.id, plan.boss.name) })
    }
  }
  const channel = document.querySelector<HTMLElement>('#channel')!
  if (inExtract(run) && run.channel > 0) {
    channel.hidden = false
    channel.textContent = t('hud.extract', { n: (EXTRACT_TIME - run.channel).toFixed(1) })
  } else channel.hidden = true
  const boss = foeView(run).find((foe) => foe.kind === 'boss')
  const bossBar = document.querySelector<HTMLElement>('#bossBar')!
  bossBar.hidden = boss == null
  if (boss) {
    const maxHp = boss.maxHp ?? depthMods(run.depth || 1).bossHp
    document.querySelector<HTMLElement>('#bossFill')!.style.width = `${Math.max(0, Math.min(100, (boss.hp / maxHp) * 100))}%`
    putText('#bossHp', `${Math.ceil(boss.hp)}/${Math.ceil(maxHp)}`)
    putText('#bossName', bossTitle(run.depth || 1))
  }
  const fieldBox = field.getBoundingClientRect()
  const hudBottom = bossBar.hidden ? bars.getBoundingClientRect().bottom : bossBar.getBoundingClientRect().bottom
  mapCanvas.style.top = `${Math.ceil(hudBottom - fieldBox.top) + 4}px`
  const near = runCrates(run).some((crate) => crate.zone === run.zone && !run.opened.includes(crate.id) && Math.hypot(crate.x - run.x, crate.y - run.y) < PROP_REACH)
  const open = document.querySelector<HTMLButtonElement>('#open')!
  const propNear = usableProp(run)
  const veinNear = propNear == null && !near ? nearestVein(run) : null
  const stairsReady = onStairs(run) && stairsOpen(run)
  open.hidden = !near && propNear == null && veinNear == null && !stairsReady
  if (!open.hidden) open.textContent = stairsReady ? t('stairs.down') : propNear?.kind === 'barrel' ? t('hud.fuse') : veinNear ? t('hud.mine') : t('hud.open')
  const prize = claimTarget(run)
  const shrine = soulNear(run)
  const claim = document.querySelector<HTMLButtonElement>('#claim')!
  const full = bagFull(run)
  claim.hidden = prize == null && !shrine
  claim.disabled = shrine ? false : full
  if (shrine) {
    claim.dataset.kind = 'soul'
    claim.textContent = t('hud.claimSoul')
  } else if (prize) {
    claim.dataset.kind = prize.kind
    claim.textContent = full ? t('hud.bagFull') : t('hud.take', { name: LABELS[prize.kind] })
  }
  const swap = document.querySelector<HTMLButtonElement>('#bagSwap')!
  swap.hidden = shrine || prize == null || !full
  const banner = document.querySelector<HTMLElement>('#banner')!
  banner.hidden = !run.banner || run.banner.life <= 0
  banner.textContent = run.banner?.text ?? ''
  banner.classList.toggle('weak', run.banner?.tone === 'weak')
  const soulBtn = document.querySelector<HTMLButtonElement>('#soul')!
  const held = run.soul?.phase === 'held'
  soulBtn.hidden = !held
  const low = held && run.stam <= SOUL_STAM
  soulBtn.disabled = low
  soulBtn.dataset.low = low ? '1' : '0'
  soulBtn.textContent = low ? t('hud.soulLow') : t('hud.soul')
  soulBtn.title = low ? soulLow() : t('soul.name')
  soulBtn.setAttribute('aria-label', low ? soulLow() : t('soul.name'))
  watchSoul(run)
  const attackBtn = document.querySelector<HTMLButtonElement>('#attack')
  if (attackBtn) {
    attackBtn.disabled = !run.sword && run.spear == null
    attackBtn.textContent = run.spear ? t('hud.spear') : t('hud.sword')
    attackBtn.dataset.kind = run.spear ? 'tombak' : 'sword'
  }
  if (blockBtn) {
    blockBtn.disabled = run.shield == null
    blockBtn.textContent = run.shield == null ? t('hud.blockGone') : t('hud.block', { n: run.shield, max: shieldMaxFor(run.shieldLevel ?? 1) })
    blockBtn.dataset.cool = run.swing > 0 ? '1' : '0'
  }
  const bandN = count(run.bag, 'bandage')
  const tonicN = count(run.bag, 'tonic')
  document.querySelector<HTMLButtonElement>('#useBandage')!.textContent = t('hud.bandage', { n: bandN })
  document.querySelector<HTMLButtonElement>('#useTonic')!.textContent = t('hud.tonic', { n: tonicN })
  document.querySelector('#itemCount')!.textContent = String(bandN + tonicN)
  const itemBtn = document.querySelector<HTMLButtonElement>('#useItem')!
  const nextKind = bandN > 0 && tonicN > 0 ? (useFlip ? 'bandage' : 'tonic') : tonicN > 0 && bandN === 0 ? 'tonic' : 'bandage'
  itemBtn.dataset.kind = nextKind
  itemBtn.dataset.empty = bandN + tonicN === 0 ? '1' : '0'
  const support = document.querySelector<HTMLButtonElement>('#support')!
  support.hidden = save.support < 24
  support.disabled = save.support < 24
  support.textContent = t('hud.hold', { n: save.support })
  const swordSlot = document.querySelector<HTMLButtonElement>('#slotSword')!
  swordSlot.textContent = run.spear ? t('hud.spear') : t('hud.sword')
  swordSlot.dataset.kind = run.spear ? 'tombak' : 'sword'
  if (run.spear) swordSlot.dataset.rarity = run.spear.rarity
  else delete swordSlot.dataset.rarity
  swordSlot.classList.toggle('on', run.sword || run.spear != null)
  document.querySelector<HTMLButtonElement>('#slotShield')!.dataset.kind = 'shield'
  document.querySelector<HTMLButtonElement>('#slotSoon')!.dataset.kind = 'soon'
  const shieldSlot = document.querySelector<HTMLButtonElement>('#slotShield')!
  if (run.shield == null) {
    shieldSlot.textContent = t('item.shield')
    shieldSlot.classList.add('locked')
  } else {
    shieldSlot.textContent = t('hud.shield', { n: run.shield })
    shieldSlot.classList.remove('locked')
  }
  const shieldNote = run.shield == null ? t('hud.noShield') : t('hud.shieldNote', { n: run.shield, max: shieldMaxFor(run.shieldLevel ?? 1) })
  document.querySelector('#note')!.textContent = `${hint(run.zone)} ${shieldNote}`
  refreshTip()
}

function rememberTip(id: TipId): void {
  const next = markSeen({ seen: save.tutorialSeen ?? [], skip: save.tutorialSkip === true }, id)
  save.tutorialSeen = next.seen
}

function notePlay(run: NonNullable<ExtractSave['run']>, input: { moveX: number; moveY: number; attack: boolean; dodge: boolean; interact: boolean; block: boolean }): void {
  if (save.tutorialSkip) return
  if (Math.hypot(input.moveX, input.moveY) > 0.2) rememberTip('move')
  if (input.attack) rememberTip('sword')
  if (input.dodge) rememberTip('dodge')
  if (input.block) rememberTip('block')
  const prop = usableProp(run)
  if (input.attack && nearestVein(run)) rememberTip('vein')
  if (input.interact && prop?.kind === 'barrel') rememberTip('barrel')
  if (input.interact && prop && prop.kind !== 'barrel' && prop.kind !== 'vendor' && prop.kind !== 'shrine') rememberTip('open')
  if (run.chart?.props.some((item) => item.kind === 'barrel' && (item.fuse ?? 0) > 0)) rememberTip('barrel')
  if (run.channel > 0.15) {
    const room = run.chart ? roomAt(run.chart, run.roomId) : null
    rememberTip(room?.role === 'fast' ? 'fast' : 'extract')
  }
  if (run.hp < HP_MAX * 0.55) rememberTip('death')
}

function refreshTip(): void {
  const box = document.querySelector<HTMLElement>('#tip')
  if (!box) return
  const run = !outcome ? save.run : null
  const workshop = document.querySelector<HTMLElement>('#workshop')
  const room = run?.chart ? roomAt(run.chart, run.roomId) : null
  const prop = run ? usableProp(run) : null
  const world: TutorialWorld = run ? {
    inRun: true,
    calm: !foeView(run).some((foe) => (foe.heard ?? 0) > 0 || foe.wind > 0 || Math.hypot(foe.x - run.x, foe.y - run.y) < 100),
    nearVein: nearestVein(run) != null,
    nearLoot: claimTarget(run) != null,
    nearOpen: !!prop && prop.kind !== 'barrel' && prop.kind !== 'vendor' && prop.kind !== 'shrine',
    nearBarrel: prop?.kind === 'barrel' || !!run.chart?.props.some((item) => item.kind === 'barrel' && item.room === run.roomId && (item.fuse ?? 0) > 0),
    bagFull: bagFull(run) && claimTarget(run) != null,
    onExtract: inExtract(run),
    fastRoom: room?.role === 'fast',
    bossRoom: run.zone === 'sarang' || room?.role === 'boss',
    lowHp: run.hp < HP_MAX * 0.7,
    workshopOpen: false,
  } : {
    inRun: false,
    calm: true,
    nearVein: false,
    nearLoot: false,
    nearOpen: false,
    nearBarrel: false,
    bagFull: false,
    onExtract: false,
    fastRoom: false,
    bossRoom: false,
    lowHp: false,
    workshopOpen: workshop != null && !workshop.hidden,
  }
  const id = tipToShow({ seen: save.tutorialSeen ?? [], skip: save.tutorialSkip === true }, world)
  document.querySelectorAll('.tip-hot').forEach((el) => el.classList.remove('tip-hot'))
  if (!id) {
    box.hidden = true
    delete box.dataset.tip
    return
  }
  box.hidden = false
  const at = tipAnchor(id)
  box.dataset.at = at
  if (box.dataset.tip !== id) playCue('ui.tip', mixPref())
  box.dataset.tip = id
  const text = document.querySelector('#tipText')
  if (text) text.textContent = t(`tip.${id}` as MsgKey)
  const target = at === 'stick' ? '#stick' : at === 'attack' ? '#attack' : at === 'dodge' ? '#dodge' : at === 'block' ? '#block' : at === 'claim' ? '#claim' : at === 'open' ? '#open' : at === 'bag' ? '#openBag' : at === 'map' ? '#minimap' : at === 'workshop' ? '#openWorkshop' : at === 'sell' ? '#sellCommon' : ''
  if (target) document.querySelector(target)?.classList.add('tip-hot')
}

function hint(zone: ZoneId): string {
  if (zone === 'pangkalan') return t('hint.base')
  if (zone === 'tambang') return t('hint.mine')
  if (zone === 'sarang') return t('hint.nest')
  if (zone === 'kamar') return t('hint.side')
  return t('hint.ruins')
}

function zoneLabel(zone: ZoneId): string {
  if (zone === 'pangkalan') return t('zone.base')
  if (zone === 'tambang') return t('zone.mine')
  if (zone === 'sarang') return t('zone.nest')
  if (zone === 'kamar') return t('zone.side')
  return t('zone.ruins')
}

function paintDepthPick(): void {
  const label = document.querySelector('#depthLabel')
  const have = save.blade ? save.blade.damage : save.spear ? spearPower(save.spear) : swordDamage(save.swordLevel)
  const deepest = Math.max(1, Math.min(7, save.depth || 1))
  if (label) label.textContent = t('base.start', { n: deepest, power: have })
}

function paintBladeRack(): void {
  const rack = document.querySelector('#bladeRack')
  if (!rack) return
  rack.replaceChildren()
  if (save.blade) {
    const off = document.createElement('button')
    off.type = 'button'
    off.textContent = t('stash.unequip', { name: bladeDisplay(save.blade.id, save.blade.name), dmg: save.blade.damage })
    off.addEventListener('click', () => { unequipBlade(save); writeExtract(storage, save); renderBase() })
    rack.append(off)
  }
  for (const blade of save.blades) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = t('stash.equipBlade', { name: bladeDisplay(blade.id, blade.name), dmg: blade.damage })
    button.addEventListener('click', () => { equipBlade(save, blade.id); writeExtract(storage, save); renderBase() })
    rack.append(button)
  }
}

function renderBase(): void {
  stashEl.replaceChildren()
  trayEl.replaceChildren()
  paintDepthPick()
  paintBladeRack()
  const total = stashValue(save)
  const totalEl = document.querySelector('#stashTotalNum')
  if (totalEl) totalEl.textContent = t('stash.coins', { n: total })
  paintPurse()
  refreshTip()
  const bagBtn = document.querySelector<HTMLButtonElement>('#bagUpgrade')
  const nextBag = nextBagUpgrade(save.bagSlots)
  if (bagBtn) {
    bagBtn.disabled = save.run != null || nextBag == null || save.coins < (nextBag?.cost ?? 0)
    bagBtn.textContent = nextBag ? t('stash.widen', { from: bagSlotsOf(save.bagSlots), to: nextBag.slots, cost: nextBag.cost }) : t('err.bag20')
  }
  const held = stashGroups()
  const panel = document.createElement('div')
  panel.className = 'inv'
  panel.append(invHead(t('stash.value', { n: total }), `${held.used}/${STASH_SLOTS}`))
  const gear = document.createElement('div')
  gear.className = 'inv-gear'
  const swordLeft = count(save.stash, 'sword') - count(picks, 'sword')
  const sword = gearSlot('sword', swordLeft > 0 ? t('item.sword') : t('stash.swordGone'), undefined, 0, true)
  sword.disabled = swordLeft <= 0
  sword.addEventListener('click', () => { stashFocus = { kind: 'sword' }; renderBase() })
  const shield = gearSlot('shield', save.shield == null || bringShield ? t('stash.noShield') : t('stash.shield', { n: save.shield, max: shieldMaxFor(save.shieldLevel) }), undefined, 0, true)
  shield.disabled = save.shield == null || bringShield
  shield.addEventListener('click', () => { bringShield = true; renderBase() })
  const cover = insuranceButton(save.insured, () => { stashFocus = save.insured ? { kind: save.insured.kind, coins: save.insured.unit?.coins, spearId: save.insured.spear?.id, box: true } : null; renderBase() })
  if (stashFocus?.box) cover.classList.add('on')
  gear.append(sword, shield, cover)
  if (save.spear) {
    const worn = gearSlot('tombak', t('spear.named', { rarity: RARITY_NAME[save.spear.rarity] }), save.spear.rarity, save.spear.coins ?? 0, true)
    worn.addEventListener('click', () => { unequipSpear(save); writeExtract(storage, save); renderBase() })
    gear.append(worn)
  }
  const grid = document.createElement('div')
  grid.className = 'inv-grid'
  for (const group of held.groups) {
    const button = itemSlot(group.kind, group.name, group.rarity, group.coins, group.qty)
    if (stashFocus && stashFocus.kind === group.kind && stashFocus.spearId === group.spearId && stashFocus.coins === group.coins) button.classList.add('on')
    button.addEventListener('click', () => {
      stashFocus = { kind: group.kind, coins: group.coins, spearId: group.spearId }
      renderBase()
    })
    grid.append(button)
  }
  for (let i = held.groups.length; i < Math.max(STASH_SLOTS, held.groups.length); i += 1) {
    if (i >= STASH_SLOTS && i >= held.groups.length) break
    if (i < held.groups.length) continue
    grid.append(emptySlot())
  }
  const side = document.createElement('aside')
  side.className = 'inv-detail'
  side.append(stashDetail())
  const main = document.createElement('div')
  main.className = 'inv-main'
  main.append(grid, side)
  panel.append(gear, main)
  stashEl.append(panel)
  if (bringShield && save.shield != null) trayEl.append(chip(t('loadout.shield', { n: save.shield }), () => { bringShield = false }, 'shield'))
  if (save.spear) {
    const worn = chip(t('bag.equipped', { name: spearLabel(save.spear) }), () => { unequipSpear(save) }, 'tombak')
    worn.dataset.rarity = save.spear.rarity
    trayEl.append(worn)
  }
  for (const stack of picks) trayEl.append(chip(`${LABELS[stack.kind]} ${stack.n}`, () => returnPick(stack.kind), stack.kind))
  const resume = document.querySelector<HTMLButtonElement>('#resume')!
  resume.hidden = save.run == null
}

function stashGroups(): { groups: InvGroup[]; used: number } {
  const groups: InvGroup[] = []
  let used = 0
  for (const stack of save.stash) {
    if (stack.kind === 'sword') continue
    const reserved = count(picks, stack.kind)
    const units = [...repairStack(stack)]
    units.splice(0, Math.min(reserved, units.length))
    for (const unit of units) {
      used += 1
      const hit = groups.find((group) => group.kind === stack.kind && group.coins === unit.coins && group.rarity === unit.rarity && !group.spearId)
      if (hit) hit.qty += 1
      else groups.push({ kind: stack.kind, name: ITEM_NAME[stack.kind], rarity: unit.rarity, coins: unit.coins, qty: 1, origin: unit.origin })
    }
  }
  for (const spear of save.spears) {
    used += 1
    groups.push({ kind: 'tombak', name: t('spear.named', { rarity: RARITY_NAME[spear.rarity] }), rarity: spear.rarity, coins: spear.coins ?? 0, qty: 1, spearId: spear.id, origin: spear.origin })
  }
  groups.sort((a, b) => b.coins - a.coins || a.name.localeCompare(b.name))
  return { groups, used }
}

function stashDetail(): HTMLElement {
  const box = document.createElement('div')
  const focus = stashFocus
  if (focus?.box && save.insured) {
    const held = save.insured
    const rarity = held.spear?.rarity ?? held.unit?.rarity
    const coins = held.spear?.coins ?? held.unit?.coins ?? 0
    const color = rarity ? RARITY_COLOR[rarity] : '#c4b8a4'
    const name = held.spear ? spearLabel(held.spear) : ITEM_NAME[held.kind]
    box.innerHTML = `<b>${name}</b><p class="insure-note">${t('stash.box')}</p><p style="color:${color}">${rarity ? RARITY_NAME[rarity] : ''} · ${coins} ${t('coin.word')}</p>`
    const out = document.createElement('button')
    out.type = 'button'
    out.textContent = t('bag.uninsure')
    out.addEventListener('click', () => {
      const reason = uninsureStash(save)
      if (reason) box.append(noteLine(reason))
      else { stashFocus = null; writeExtract(storage, save); renderBase() }
    })
    box.append(out)
    return box
  }
  if (!focus) {
    box.textContent = t('stash.pick')
    return box
  }
  if (focus.spearId) {
    const spear = save.spears.find((item) => item.id === focus.spearId)
    if (!spear) {
      box.textContent = 'Tombak tidak ada.'
      return box
    }
    const color = RARITY_COLOR[spear.rarity]
    box.innerHTML = `<b>${spearLabel(spear)}</b><p style="color:${color}">${RARITY_NAME[spear.rarity]} · ${spear.coins ?? 0} ${t('coin.word')}</p><p>${spearStatLine(spear)}</p>`
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'primary'
    button.textContent = t('stash.equip')
    button.addEventListener('click', () => { equipSpear(save, spear.id); writeExtract(storage, save); stashFocus = null; renderBase() })
    box.append(button, sellButtons(box, 'tombak', spear.coins, spear.id, spear.rarity), insureStashButton('tombak', spear.coins, spear.id))
    return box
  }
  const name = ITEM_NAME[focus.kind]
  const unit = save.stash.find((stack) => stack.kind === focus.kind)?.units?.find((item) => focus.coins == null || item.coins === focus.coins)
  const color = unit ? RARITY_COLOR[unit.rarity] : '#c4b8a4'
  box.innerHTML = `<b>${name}</b><p style="color:${color}">${unit ? `${RARITY_NAME[unit.rarity]} · ${unit.coins} ${t('coin.word')}` : t('bag.noCoins')}</p><p>${bagUse(focus.kind)}</p>`
  if (focus.kind !== 'sword' || count(save.stash, 'sword') - count(picks, 'sword') > 0) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'primary'
    button.textContent = t('stash.take')
    button.addEventListener('click', () => { takePick(focus.kind); renderBase() })
    box.append(button)
  }
  if (focus.kind !== 'sword' && unit) box.append(sellButtons(box, focus.kind, unit.coins, undefined, unit.rarity), insureStashButton(focus.kind, unit.coins))
  return box
}

function noteLine(text: string): HTMLElement {
  const p = document.createElement('p')
  p.className = 'warn'
  p.textContent = text
  return p
}

function insureStashButton(kind: ItemKind, coins?: number, spearId?: string): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.id = 'stashInsure'
  button.textContent = t('bag.insure')
  button.addEventListener('click', () => {
    const reason = insureStash(save, kind, coins, spearId)
    if (reason) {
      document.querySelector('.inv-detail')?.append(noteLine(reason))
      return
    }
    writeExtract(storage, save)
    stashFocus = { kind, coins, spearId, box: true }
    renderBase()
  })
  return button
}

let sellReady = false
function sellButtons(box: HTMLElement, kind: ItemKind, coins?: number, spearId?: string, rarity?: CoinRarity): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = 'sell-row'
  const jual = document.createElement('button')
  jual.type = 'button'
  jual.id = 'sellItem'
  jual.textContent = t('stash.sell')
  jual.addEventListener('click', () => {
    if (needsSellConfirm(rarity) && !sellReady) {
      sellReady = true
      const ask = document.createElement('p')
      ask.id = 'sellAsk'
      ask.textContent = t('stash.sellAsk', { name: ITEM_NAME[kind], rarity: rarity ? RARITY_NAME[rarity] : '', coins: coins ?? 0 })
      const yes = document.createElement('button')
      yes.type = 'button'
      yes.id = 'sellYes'
      yes.className = 'primary'
      yes.textContent = t('stash.sellYes')
      yes.addEventListener('click', () => { commitSale(kind, coins, spearId) })
      const no = document.createElement('button')
      no.type = 'button'
      no.textContent = t('shop.no')
      no.addEventListener('click', () => { sellReady = false; renderBase() })
      box.append(ask, yes, no)
      return
    }
    commitSale(kind, coins, spearId)
  })
  wrap.append(jual)
  return wrap
}

function commitSale(kind: ItemKind, coins?: number, spearId?: string): void {
  const gained = sellOne(save, kind, coins, spearId)
  sellReady = false
  if (gained == null) return
  stashFocus = null
  writeExtract(storage, save)
  popCoins(gained)
  renderBase()
}

function popCoins(gained: number): void {
  paintPurse()
  const pop = document.querySelector<HTMLElement>('#coinPop')
  if (!pop) return
  pop.textContent = `+${gained}`
  pop.classList.remove('pop')
  void pop.offsetWidth
  pop.classList.add('pop')
}

function paintPurse(): void {
  const text = String(save.coins)
  const home = document.querySelector('#purseNum')
  const title = document.querySelector('#titlePurseNum')
  if (home) home.textContent = text
  if (title) title.textContent = text
}

function takePick(kind: ItemKind): void {
  if (count(save.stash, kind) - count(picks, kind) <= 0) return
  if (kind === 'sword' && count(picks, 'sword') >= 1) return
  const carried = picks.filter((stack) => stack.kind !== 'sword').reduce((sum, stack) => sum + stack.n, 0)
  if (kind !== 'sword' && carried >= bagSlotsOf(save.bagSlots)) return
  const dest = picks.find((stack) => stack.kind === kind)
  if (dest) dest.n += 1
  else picks.push({ kind, n: 1 })
}

function returnPick(kind: ItemKind): void {
  const stack = picks.find((item) => item.kind === kind)
  if (!stack) return
  stack.n -= 1
  if (stack.n <= 0) picks.splice(picks.indexOf(stack), 1)
}

function chip(label: string, onClick: () => void, kind?: string): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'chip'
  if (kind) button.dataset.kind = kind
  button.textContent = label
  button.addEventListener('click', () => {
    onClick()
    renderBase()
  })
  return button
}

function show(which: 'base' | 'field' | 'result'): void {
  base.hidden = which !== 'base'
  field.hidden = which !== 'field'
  result.hidden = which !== 'result'
  document.body.classList.toggle('playing', which === 'field')
  if (which !== 'field') window.scrollTo(0, 0)
  if (which === 'field' && location.hash !== '#galeri') paint()
}

function fieldVisible(): boolean {
  return !field.hidden
}

function safePx(name: string): number {
  const n = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name))
  return Number.isFinite(n) ? n : 0
}
function stickBounds(): { left: number; top: number; right: number; bottom: number } {
  const box = field.getBoundingClientRect()
  const bars = document.querySelector('#bars')!.getBoundingClientRect()
  const actions = document.querySelector('#actions')!.getBoundingClientRect()
  const map = mapCanvas.getBoundingClientRect()
  const belowMap = map.height > 0 ? map.bottom + 4 : bars.bottom
  return {
    left: box.left + safePx('--safe-l'),
    top: Math.max(bars.bottom, belowMap),
    right: Math.min(box.right - safePx('--safe-r'), actions.left - 4),
    bottom: box.bottom,
  }
}

function placeBase(clientX: number, clientY: number): void {
  const half = stickEl.offsetWidth / 2
  const spot = clampCenter(clientX, clientY, half, stickBounds())
  const box = field.getBoundingClientRect()
  stickCol.style.bottom = 'auto'
  stickCol.style.left = `${spot.x - box.left - half}px`
  stickCol.style.top = `${spot.y - box.top - half}px`
}

function aimStick(clientX: number, clientY: number): void {
  const rect = stickEl.getBoundingClientRect()
  const radius = rect.width / 2
  let centerX = rect.left + radius
  let centerY = rect.top + radius
  const next = followBase(clientX, clientY, centerX, centerY, radius)
  if (next.x !== centerX || next.y !== centerY) {
    const half = stickEl.offsetWidth / 2
    const spot = clampCenter(next.x, next.y, half, stickBounds())
    const box = field.getBoundingClientRect()
    stickCol.style.left = `${spot.x - box.left - half}px`
    stickCol.style.top = `${spot.y - box.top - half}px`
    centerX = spot.x
    centerY = spot.y
  }
  const vec = stickVector(clientX - centerX, clientY - centerY, radius)
  stick.x = vec.x
  stick.y = vec.y
  placeKnob()
}

function placeKnob(): void {
  const rest = Math.max(0, (stickEl.clientWidth - knob.offsetWidth) / 2)
  knob.style.left = `${rest + stick.x * rest}px`
  knob.style.top = `${rest + stick.y * rest}px`
}

function settleLoaded(): void {
  if (!save.run) return
  if (save.run.hp <= 0) finish('dead')
  else if (save.run.channel >= EXTRACT_TIME) finish('extracted')
}

function probe(): Storage | null {
  try {
    localStorage.setItem('__npcs_probe__', '1')
    localStorage.removeItem('__npcs_probe__')
    return localStorage
  } catch {
    return null
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) resetWheelBaseline(wheel)
})

async function pollWheel(): Promise<void> {
  if (document.hidden) return
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const response = await fetch(STATUS_URL, { method: 'GET', credentials: 'omit', cache: 'no-store', signal: controller.signal, headers: { Accept: 'application/json' } })
    const text = await response.text()
    let body: unknown = null
    try { body = JSON.parse(text) } catch { body = null }
    const decision = applyWheelBody(wheel, body, Date.now(), response.status)
    if (decision.energy > 0) {
      addSupport(save, decision.energy)
      writeExtract(storage, save)
      if (!field.hidden) paint()
    }
  } catch {
    // The feed only tops up the hold reserve. A miss leaves the saved reserve as it is.
  } finally {
    clearTimeout(timer)
  }
}
void pollWheel()
window.setInterval(() => void pollWheel(), 12000)

declare global {
  interface Window {
    __npcsExtract?: {
      save: () => ExtractSave
      frameWork: () => { n: number; avg: number; med: number; p95: number; max: number }
      mode: () => string
      markStaged: () => void
      sheet: () => string
      assets: () => string
      swing: () => string
      block: () => string
      dirs: () => string
      walk: () => string
      carry: () => string
      hold: () => string
      chests: () => string
      loot: () => string
      reveal: () => string
      pose: (depth: number, kind: string) => { depth: number; theme: string; room: string; zone: string } | null
      mapSheet: () => void
      boomSheet: () => void
      foeSheet: () => void
    }
  }
}
window.__npcsExtract = {
  save: () => save,
  pose: (depth: number, kind: string) => {
    if (!save.run) deploy(save, [{ kind: 'sword', n: 1 }])
    const run = save.run
    if (!run) return null
    const want = Math.max(1, Math.min(7, depth))
    for (let i = 0; i < 16; i += 1) {
      run.seed = i + 1
      warpFloor(run, want)
      const chart = run.chart
      if (!chart) continue
      if (kind === 'big' && !chart.veins.some((vein) => vein.big)) continue
      if (kind === 'merchant' && !chart.rooms.some((room) => room.role === 'merchant')) continue
      if (kind === 'secret' && !chart.rooms.some((room) => room.role === 'secret')) continue
      break
    }
    titleOpen = false
    titleEl.hidden = true
    document.body.classList.remove('title')
    show('field')
    const chart = run.chart
    if (kind === 'vein' || kind === 'big') {
      const vein = chart?.veins.find((item) => (kind === 'big' ? item.big : !item.big)) ?? chart?.veins[0]
      if (vein) {
        vein.x = 26
        vein.y = 0
        run.zone = vein.zone
        run.roomId = vein.room
        run.x = 0
        run.y = 0
        run.facing = 0
        vein.hp = Math.max(1, vein.max - 2)
      }
    } else if (kind === 'map') {
      run.seenRooms = chart?.rooms.filter((room) => !room.secret).map((room) => room.id) ?? []
      run.zone = 'pangkalan'
      run.roomId = 'room-start'
      run.x = 0
      run.y = 40
    } else if (kind === 'theme') {
      run.zone = 'tambang'
      run.roomId = 'room-mine'
      run.x = 0
      run.y = 10
    } else {
      const room = chart?.rooms.find((item) => item.role === kind) ?? chart?.rooms[0]
      if (room) {
        run.zone = room.zone
        run.roomId = room.id
        const stall = chart?.props.find((item) => item.kind === 'vendor' && item.room === room.id)
        if (room.role === 'merchant' && stall) {
          run.x = stall.x - 28
          run.y = stall.y + 16
          run.facing = 0
        } else {
          run.x = room.role === 'extract' || room.role === 'fast' ? 0 : 8
          run.y = room.role === 'extract' || room.role === 'fast' ? -80 : 16
        }
        run.seenRooms = [...new Set([...(run.seenRooms ?? []), room.id])]
      }
    }
    return { depth: run.depth, theme: run.chart?.theme ?? '', room: run.roomId ?? '', zone: run.zone }
  },
  mapSheet: () => {
    sheetHold = true
    const board = document.querySelector<HTMLCanvasElement>('#view')
    const pen = board?.getContext('2d')
    if (!board || !pen) return
    board.width = 844
    board.height = 390
    drawMapSheet(pen, board.width, board.height)
  },
  boomSheet: () => {
    sheetHold = true
    const board = document.querySelector<HTMLCanvasElement>('#view')
    const pen = board?.getContext('2d')
    if (!board || !pen) return
    board.width = 844
    board.height = 390
    drawBoomStrip(pen, board.width, board.height)
  },
  foeSheet: () => {
    sheetHold = true
    const board = document.querySelector<HTMLCanvasElement>('#view')
    const pen = board?.getContext('2d')
    if (!board || !pen) return
    board.width = 844
    board.height = 780
    drawFoeRoster(pen, board.width, board.height)
  },
  frameWork: () => {
    const sample = Array.from(frameWork.subarray(0, frameWorkN))
    sample.sort((a, b) => a - b)
    const avg = sample.reduce((sum, n) => sum + n, 0) / (sample.length || 1)
    const pick = (q: number) => sample[Math.min(sample.length - 1, Math.floor(q * (sample.length - 1)))] ?? 0
    return { n: sample.length, avg, med: pick(0.5), p95: pick(0.95), max: sample[sample.length - 1] ?? 0 }
  },
  mode: () => document.body.dataset.drive ?? 'normal',
  markStaged: () => { document.body.dataset.drive = 'staged' },
  sheet: () => {
    const board = document.createElement('canvas')
    board.width = 880
    board.height = 660
    const pen = board.getContext('2d')
    if (!pen) return ''
    drawContactSheet(pen, board.width, board.height)
    return board.toDataURL('image/png')
  },
  assets: () => {
    const board = document.createElement('canvas')
    board.width = 780
    board.height = 520
    const pen = board.getContext('2d')
    if (!pen) return ''
    drawAssetSheet(pen, board.width, board.height)
    return board.toDataURL('image/png')
  },
  swing: () => {
    const board = document.createElement('canvas')
    board.width = 1080
    board.height = 640
    const pen = board.getContext('2d')
    if (!pen) return ''
    drawSwingStrip(pen, board.width, board.height)
    return board.toDataURL('image/png')
  },
  block: () => {
    const board = document.createElement('canvas')
    board.width = 1080
    board.height = 640
    const pen = board.getContext('2d')
    if (!pen) return ''
    drawBlockStrip(pen, board.width, board.height)
    return board.toDataURL('image/png')
  },
  dirs: () => {
    const board = document.createElement('canvas')
    board.width = 1100
    board.height = 560
    const pen = board.getContext('2d')
    if (!pen) return ''
    drawDirectionStrip(pen, board.width, board.height)
    return board.toDataURL('image/png')
  },
  walk: () => {
    const board = document.createElement('canvas')
    board.width = 980
    board.height = 760
    const pen = board.getContext('2d')
    if (!pen) return ''
    drawWalkStrip(pen, board.width, board.height)
    return board.toDataURL('image/png')
  },
  carry: () => {
    const board = document.createElement('canvas')
    board.width = 980
    board.height = 640
    const pen = board.getContext('2d')
    if (!pen) return ''
    drawCarryStrip(pen, board.width, board.height)
    return board.toDataURL('image/png')
  },
  hold: () => {
    const board = document.createElement('canvas')
    board.width = 1480
    board.height = 560
    const pen = board.getContext('2d')
    if (!pen) return ''
    drawHoldStrip(pen, board.width, board.height)
    return board.toDataURL('image/png')
  },
  chests: () => {
    const board = document.createElement('canvas')
    board.width = 720
    board.height = 420
    const pen = board.getContext('2d')
    if (!pen) return ''
    drawChestStrip(pen, board.width, board.height)
    return board.toDataURL('image/png')
  },
  loot: () => {
    const board = document.createElement('canvas')
    board.width = 880
    board.height = 520
    const pen = board.getContext('2d')
    if (!pen) return ''
    drawLootStrip(pen, board.width, board.height)
    return board.toDataURL('image/png')
  },
  reveal: () => {
    const board = document.createElement('canvas')
    board.width = 1100
    board.height = 420
    const pen = board.getContext('2d')
    if (!pen) return ''
    drawRevealStrip(pen, board.width, board.height)
    return board.toDataURL('image/png')
  },
}
