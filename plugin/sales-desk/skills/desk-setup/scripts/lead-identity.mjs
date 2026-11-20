// Pure identity helpers. Callers must re-read People before a confirmed save and
// check uniqueness after read-back; this does not make Google Sheets atomic.
export function firstContactDay(value) {
  const text = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const parsed = new Date(`${text}T12:00:00Z`);
    if (!Number.isNaN(+parsed) && parsed.toISOString().slice(0, 10) === text) return text;
  } else if (/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(text)) {
    const calendarDay = new Date(`${text.slice(0, 10)}T12:00:00Z`);
    const date = new Date(text);
    if (!Number.isNaN(+date) && !Number.isNaN(+calendarDay) && calendarDay.toISOString().slice(0, 10) === text.slice(0, 10)) {
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
      const get = key => parts.find(p => p.type === key).value;
      return `${get('year')}-${get('month')}-${get('day')}`;
    }
  }
  throw new Error('Confirmed first-contact date required; open missing date Review.');
}
export function nextLeadId(firstContact, people, retiredLeadIds = []) {
  const day = firstContactDay(firstContact);
  const prefix = `OCN-${day.slice(2).replaceAll('-', '')}-`;
  const ids = [...people.map(p => p.lead_id).filter(Boolean), ...retiredLeadIds];
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate lead ID; reconcile in Review before allocating.');
  const allocated = ids.filter(id => id.startsWith(prefix));
  if (allocated.some(id => !/^OCN-\d{6}-\d{3}$/.test(id))) throw new Error('Malformed lead ID; reconcile in Review.');
  const next = Math.max(0, ...allocated.map(id => Number(id.slice(-3)))) + 1;
  if (next > 999) throw new Error('Daily lead ID sequence exhausted; open Review.');
  return `${prefix}${String(next).padStart(3, '0')}`;
}
const emails = value => String(value ?? '').split(';').map(s => s.trim().toLowerCase()).filter(Boolean);
// Last-ten-digit overlap is a possible duplicate, never proof of identity.
// Country codes are preserved in the source; this helper only routes to Review.
const phones = value => String(value ?? '').split(';').map(s => {
  const text = s.trim();
  if (!text) return '';
  const digits = text.replace(/\D/g, '');
  return text.startsWith('+') ? `+${digits}` : text.startsWith('00') ? `+${digits.slice(2)}` : digits;
}).filter(Boolean);
export function duplicateCandidates(candidate, people) {
  const e = emails(candidate.email), p = phones(candidate.phone);
  const hits = people.filter(row => row.person_id !== candidate.person_id &&
    (emails(row.email).some(v => e.includes(v)) || phones(row.phone).some(v => p.some(input => input === v || input.replace(/\D/g, '').length >= 10 && v.replace(/\D/g, '').length >= 10 && input.replace(/\D/g, '').slice(-10) === v.replace(/\D/g, '').slice(-10)))));
  const candidate_ids = [...new Set(hits.map(row => row.person_id))].sort();
  return candidate_ids.length ? {
    action: 'review', reason: 'possible duplicate', candidate_ids,
    question: 'Do these contact details belong to the existing buyer or a different person?',
    create_person: false,
  } : { action: 'confirm new buyer', candidate_ids: [], create_person: false };
}
