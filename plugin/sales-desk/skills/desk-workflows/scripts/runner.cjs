// Connector boundary: callers supply verified adapters. No email provider is assumed.
const R = require('./rules.cjs');
async function notifyOverdue({taskId, day, config, desk, mail}) {
  if (config.mode!=='live' || config.alerts_enabled!==true) return {status:'disabled'};
  if (!config.sender || !config.alix || !config.identity_verified) throw Error('Verify the sender and Alix recipient before activation.');
  // One existing morning runner owns this job. The ledger must reserve keys atomically.
  const task = await desk.task(taskId);
  const episode=R.alert(task, day, await desk.alerts());
  if (!episode) return {status:'suppressed'};
  if (!(await desk.reserve(episode.key))) return {status:'suppressed'};
  const fresh=await desk.task(taskId);
  if (!fresh || fresh.status!=='open' || fresh.due_date!==episode.due_date || fresh.owner!==episode.owner) {
    await desk.record({...episode,status:'suppressed'}); return {status:'suppressed'};
  }
  let receipt;
  try {
    receipt=await mail.send({from:config.sender, to:config.alix, idempotencyKey:episode.key,
      subject:'Follow-up needs a check', text:await desk.alertText(fresh)});
  } catch (e) {
    await desk.record({...episode,status:e.definitelyNotSent ? 'failed':'unknown'});
    return {status:e.definitelyNotSent ? 'failed':'unknown'};
  }
  if (!receipt?.messageId) {await desk.record({...episode,status:'unknown'});return {status:'unknown'};}
  await desk.record({...episode,status:'sent',message_id:receipt.messageId});
  return {status:'sent'};
}
async function processNurture({event, enrollmentId, desk, provider}) {
  // Reservation must be durable; duplicate or ambiguous claims require reconciliation.
  const key=`nurture-event:${enrollmentId}:${event.id}`;
  if (!(await desk.reserve(key))) return {status:'already claimed'};
  let state=R.nurture(await desk.enrollment(enrollmentId),event);
  await desk.saveEnrollment(enrollmentId,state); // stop future local work before a provider call
  if (state.handoff_key) await desk.ensureHandoff(state.handoff_key, enrollmentId);
  if (state.cancel_required) {
    let result;try {result=await provider.cancel(enrollmentId,{idempotencyKey:key});}catch {}
    if (!result?.confirmed) {
      state={...state,status:state.opted_out?'opted out':'needs attention',reason:'cancellation unverified'};
      await desk.saveEnrollment(enrollmentId,state);
      return {status:'cancellation unverified',state};
    }
    state=R.nurture(state,{id:key+':cancel',type:'cancel_confirmed'});
    await desk.saveEnrollment(enrollmentId,state);
  }
  await desk.finish(key);
  return {status:state.status,state};
}
module.exports={notifyOverdue,processNurture};
