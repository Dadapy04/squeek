import { mountWeb3 } from './web3/ui.ts'

const STATUS_URL = 'https://api.squeekchain.com/v1/status'

const playBtn = document.querySelector<HTMLButtonElement>('#playBtn')
const hub = document.querySelector<HTMLElement>('#hub')
const stage = document.querySelector<HTMLElement>('#stage')
const wheel = document.querySelector<HTMLElement>('#wheelStatus')
const web3Root = document.querySelector<HTMLElement>('#web3Root')

if (web3Root) mountWeb3(web3Root)

if (wheel) {
  wheel.textContent = 'Roda: memeriksa…'
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 8000)
  void fetch(STATUS_URL, { method: 'GET', credentials: 'omit', cache: 'no-store', signal: controller.signal })
    .then((res) => {
      window.clearTimeout(timer)
      wheel.textContent = res.ok ? 'Roda: terbaca, tidak mengunci permainan' : 'Roda: offline'
    })
    .catch(() => {
      wheel.textContent = 'Roda: offline'
    })
}

let stop: (() => void) | null = null
playBtn?.addEventListener('click', () => {
  if (!hub || !stage) return
  hub.hidden = true
  stage.hidden = false
  void import('./rpg/play.ts').then(({ startPlay }) => {
    const canvas = document.querySelector<HTMLCanvasElement>('#rpg')
    const hud = document.querySelector<HTMLElement>('#rpgHud')
    if (!canvas || !hud) return
    stop?.()
    const handle = startPlay(canvas, hud, () => {
      handle.stop()
      stop = null
      stage.hidden = true
      hub.hidden = false
    })
    stop = handle.stop
  })
})
