// Sales pulse: the position in one sentence, four numbers, the units, what changed,
// what needs attention, and active buyers by lead temperature and owner. No charts and no filters.

import * as C from './components.js';
import { bigNumbers } from '../lib/card.js';
import { S } from '../lib/strings.js';
import * as F from '../lib/format.js';

const h = F.esc;

const parts = { card: C.cardPart, intro: (ctx) => C.intro(ctx, { sub: ctx.narrative && ctx.narrative.summary ? h(ctx.narrative.summary) : '' }) };

/** Active buyers by lead temperature and by owner. Every count comes from the metric results. */
function activeBuyers(ctx) {
  const temp = ctx.m.buyers_by_temperature, own = ctx.m.buyers_by_owner;
  const list = (r, keys, label) => `<dl class="facts">${keys.map((k) => `<dt>${h(label(k))}</dt><dd>${h(F.displayPath(r, [k]))}</dd>`).join('')}</dl>`;
  const owners = Object.keys(own.value).filter((k) => k !== '__none').sort((a, b) => a.localeCompare(b));
  return `<h3 class="sec__sub">${h(S.pulse.byTemperature)}</h3>${list(temp, Object.keys(temp.value), (k) => S.temperature[k] || k)}`
    + `<h3 class="sec__sub">${h(S.pulse.byOwner)}</h3>${list(own, [...owners, '__none'], (k) => (k === '__none' ? S.noOwner : k))}`
    + `<p class="note">${h(S.pulse.buyersNote)}</p>`;
}

function layout(ctx) {
  const n = ctx.narrative;
  return [
    C.intro(ctx, { sub: n && n.summary ? h(n.summary) : '' }),
    C.numbers(ctx, bigNumbers(ctx)),
    C.section(S.pulse.units, C.unitsGrid(ctx)),
    C.section(S.pulse.changes, C.changeLines(ctx)),
    C.section(S.pulse.attention, C.attentionLines(ctx)),
    C.section(S.pulse.buyers, activeBuyers(ctx)),
  ].join('\n');
}

export default { key: 'sales-pulse', layout, parts, drawers: C.sharedDrawers };
