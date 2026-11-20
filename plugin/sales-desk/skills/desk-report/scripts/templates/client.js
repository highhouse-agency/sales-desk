// Browser runtime for a published page. Reads the embedded report data, keeps the
// filter state, recomputes through lib/metrics.js via makeCtx, re-renders sections
// with the same component functions build.js used, and runs drawers.

import { makeCtx } from './components.js';

export function boot({ template, reportKey }) {
  const rd = JSON.parse(document.getElementById('report-data').textContent);
  let ctx = makeCtx(rd, reportKey);
  let state = { ...ctx.defaults };
  const drawer = document.getElementById('drawer');
  let opener = null;

  staleBanner();

  function rerender() {
    ctx = makeCtx(rd, reportKey, state);
    for (const el of [...document.querySelectorAll('[data-section]')]) {
      if (!el.isConnected) continue;
      const fn = template.parts[el.dataset.section];
      if (!fn) continue;
      const tmp = document.createElement('div');
      tmp.innerHTML = fn(ctx).trim();
      const next = tmp.firstElementChild;
      if (!next) continue;
      el.replaceWith(next);
    }
    for (const c of document.querySelectorAll('[data-filter]')) {
      const k = c.dataset.filter;
      if (c.type === 'checkbox') c.checked = !!state[k];
      else if (k === 'period') c.value = `${state.week_from}-${state.week_to}`;
      else if (String(c.value) !== String(state[k] ?? '')) c.value = state[k] ?? '';
    }
  }

  function setFilter(c) {
    const k = c.dataset.filter;
    if (k === 'period') { const [a, b] = c.value.split('-'); state = { ...state, week_from: a, week_to: b }; }
    else state = { ...state, [k]: c.type === 'checkbox' ? c.checked : c.value };
    rerender();
  }
  document.addEventListener('change', (ev) => { const c = ev.target.closest('[data-filter]'); if (c && c.type !== 'search') setFilter(c); });
  document.addEventListener('input', (ev) => { const c = ev.target.closest('input[data-filter]'); if (c) setFilter(c); });

  function activate(el) {
    const action = el.dataset.action;
    if (action === 'reset') { state = { ...ctx.defaults }; rerender(); return; }
    if (action === 'close') { drawer.close(); return; }
    if (el.dataset.sort) { state = { ...state, sort: el.dataset.sort }; rerender(); return; }
    if (el.dataset.open) openDrawer(el.dataset.open, el.dataset.id, el);
  }

  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-action], [data-open], [data-sort]');
    if (!el || el.closest('details > summary') === el) return;
    if (el.tagName === 'A') return;
    ev.preventDefault();
    activate(el);
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    const el = ev.target.closest('[data-open][role="button"]');
    if (!el || el.tagName === 'BUTTON') return;
    ev.preventDefault();
    activate(el);
  });

  function openDrawer(kind, id, from) {
    const fn = template.drawers[kind];
    if (!fn) return;
    const d = fn(ctx, id);
    if (!d) return;
    if (!drawer.open) opener = { kind, id, el: from };
    document.getElementById('drawer-title').textContent = d.title;
    document.getElementById('drawer-sub').textContent = d.sub || '';
    document.getElementById('drawer-body').innerHTML = d.body;
    if (!drawer.open) drawer.showModal();
    drawer.querySelector('.drawer__close').focus();
  }

  drawer.addEventListener('close', () => {
    if (!opener) return;
    let target = opener.el;
    if (!target || !target.isConnected) target = document.querySelector(`[data-open="${opener.kind}"][data-id="${CSS.escape(String(opener.id))}"]`);
    if (target && target.focus) target.focus();
    opener = null;
  });
  drawer.addEventListener('click', (ev) => { if (ev.target === drawer) drawer.close(); });

  function staleBanner() {
    const el = document.getElementById('stale');
    if (!el) return;
    const hours = Number(el.dataset.hours);
    const now = typeof window.__SALES_DESK_NOW === 'number' ? window.__SALES_DESK_NOW : Date.now();
    if (hours > 0 && now - Date.parse(el.dataset.asof) > hours * 3600000) el.hidden = false;
  }

  window.__salesDesk = { get ctx() { return ctx; }, get state() { return state; }, setState(s) { state = { ...state, ...s }; rerender(); } };
}
