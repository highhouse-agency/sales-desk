// Owner brief: refreshed and shared daily. The same structure: the headline sentence,
// the four numbers, and three lines of narrative.

import * as C from './components.js';
import { bigNumbers } from '../lib/card.js';
import { S } from '../lib/strings.js';
import { esc as h } from '../lib/format.js';

function lines(ctx) {
  const n = ctx.narrative;
  const sentences = n && n.summary ? n.summary.split(/(?<=\.)\s+/).filter(Boolean) : [];
  const att = n && n.attention && n.attention[0] ? n.attention[0] : S.attention.none;
  const list = [...sentences.slice(0, 2), att];
  return `<ul class="lines">${list.map((x) => `<li>${h(x)}</li>`).join('')}</ul><p class="note"><a href="index.html">${h(S.owner.openPulse)}</a></p>`;
}

function layout(ctx) {
  return [C.intro(ctx), C.numbers(ctx, bigNumbers(ctx)), C.section(S.owner.thisWeek, lines(ctx))].join('\n');
}

export default { key: 'owner-brief', layout, parts: { card: C.cardPart, intro: (ctx) => C.intro(ctx) }, drawers: C.sharedDrawers };
