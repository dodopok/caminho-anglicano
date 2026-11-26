import { nowFor } from '../../mocks/index.mjs'
import { mockScenario } from '../utils/mockScenario'

// The fixtures are pinned to 2026-11-26; so is the browser here. Each page
// starts at the fixture's instant and the clock runs from there, so "hoje",
// "há 5 min" and the charts' last day match the data. The instant follows the
// tab the page opens on (`?aba=`); `?agora=2026-11-20T09:00:00-03:00` picks
// another one and `?agora=real` keeps the machine's clock.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html, { event }) => {
    const query = getQuery(event)
    const requested = typeof query.agora === 'string' ? query.agora : ''
    if (requested === 'real') return
    const now = requested || nowFor(mockScenario(), typeof query.aba === 'string' ? query.aba : '')
    if (Number.isNaN(Date.parse(now))) return

    html.head.unshift(`<script>(() => {
  const RealDate = Date
  const offset = RealDate.parse(${JSON.stringify(now)}) - RealDate.now()
  function MockDate (...args) {
    if (!new.target) return new RealDate(RealDate.now() + offset).toString()
    return args.length ? new RealDate(...args) : new RealDate(RealDate.now() + offset)
  }
  MockDate.prototype = RealDate.prototype
  MockDate.now = () => RealDate.now() + offset
  MockDate.parse = RealDate.parse
  MockDate.UTC = RealDate.UTC
  window.Date = MockDate
})()</script>`)
  })
})
