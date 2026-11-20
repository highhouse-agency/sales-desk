import test from 'node:test';
import assert from 'node:assert/strict';
import { firstContactDay, nextLeadId, duplicateCandidates } from '../scripts/lead-identity.mjs';
test('lead IDs use Mexico City first-contact day and largest allocated suffix, including retired IDs', () => {
  assert.equal(firstContactDay('2026-11-19T02:00:00Z'), '2026-11-18');
  assert.equal(nextLeadId('2026-11-19T02:00:00Z', [{lead_id:'OCN-261118-001'}, {lead_id:'OCN-261118-004'}, {lead_id:'OCN-261119-099'}], ['OCN-261118-009']), 'OCN-261118-010');
  assert.equal(nextLeadId('2026-11-19', []), 'OCN-261119-001');
});
test('unknown dates, collisions and exhausted sequence block allocation', () => {
  for (const value of ['', '2026-02-30', '2026-02-30T10:00:00Z', '2026-11-18T10:00:00']) assert.throws(() => nextLeadId(value, []));
  assert.throws(() => nextLeadId('2026-11-18', [{lead_id:'OCN-261118-001'}, {lead_id:'OCN-261118-001'}]));
  assert.throws(() => nextLeadId('2026-11-18', [{lead_id:'OCN-261118-999'}]));
});
test('case-normalized semicolon emails and international phones open Review without another buyer', () => {
  const rows = [{person_id:'B1',email:'one@example.test; TWO@EXAMPLE.TEST',phone:'+1 (303) 555-0142'}, {person_id:'B2',email:'other@example.test',phone:'+52 55 5555 0123'}];
  assert.deepEqual(duplicateCandidates({email:' two@example.test ',phone:'0052-55-5555-0123'}, rows).candidate_ids, ['B1', 'B2']);
  const match = duplicateCandidates({phone:'+1 303 555 0142'}, rows);
  assert.equal(match.action, 'review'); assert.equal(match.reason, 'possible duplicate'); assert.equal(match.create_person, false);
  assert.equal(duplicateCandidates({phone:'3035550142'}, rows).action, 'review');
  assert.deepEqual(duplicateCandidates({phone:'3035550142'}, rows).candidate_ids, ['B1']);
  assert.equal(duplicateCandidates({phone:'+44 303 555 0142'}, rows).create_person, false);
  assert.equal(duplicateCandidates({phone:'5550142'}, rows).action, 'confirm new buyer');
  assert.equal(duplicateCandidates({person_id:'B1',email:'one@example.test'}, rows).action, 'confirm new buyer');
});
