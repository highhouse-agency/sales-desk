// Provider-independent planner. It performs no writes or sends.
const DeskIntake = (() => {
  const R = typeof DeskRules !== 'undefined' ? DeskRules : require('./rules.cjs');
  const fields = ['submission_id','received_at','received_date','property_id','full_name','email','phone_number','text','campaign_id','ad_id','utm_source','utm_medium','utm_campaign','utm_content','utm_term','marketing_permission'];
  const email = v => String(v || '').trim().toLowerCase();
  const validEmail = v => /^[^\s@;]+@[^\s@;.]+\.[^\s@;]+$/.test(v);
  const phone = v => /^\+[1-9]\d{7,14}$/.test(String(v || '').trim()) ? String(v).trim() : '';
  const values = v => String(v || '').split(';').map(x => x.trim()).filter(Boolean);
  function plan(submission, {people=[], policy={}, propertyIds=[], campaignIds=[]}={}) {
    const retained = Object.fromEntries(fields.filter(k=>submission[k]!==undefined).map(k=>[k,String(submission[k]).trim()]));
    const id = retained.submission_id;
    if (!id || /[\r\n]/.test(id)) throw Error('A stable, provider-namespaced submission identity is required.');
    const source_key = 'form:'+id;
    const result = {source_key, retained, status:'review', review:[], actions:[], acknowledgment:{key:source_key+':ack',status:'not configured'}};
    const e = email(retained.email), p = phone(retained.phone_number);
    if (retained.email && !validEmail(e)) result.review.push('Invalid supplied email');
    if (retained.phone_number && !p) result.review.push('Phone requires a verified country code');
    if (!R.date(retained.received_date) || !/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(retained.received_at||'') || (!R.date((retained.received_at||'').slice(0,10)) || !Number.isFinite(Date.parse(retained.received_at)))) result.review.push('Verified reporting date and timestamp required');
    if (!propertyIds.includes(retained.property_id)) result.review.push('Unconfirmed property');
    const emailMatches=validEmail(e)?people.filter(x=>values(x.email).some(v=>email(v)===e)):[];
    const phoneMatches=p?people.filter(x=>values(x.phone).some(v=>phone(v)===p)):[];
    const matches=[...new Map([...emailMatches,...phoneMatches].map(x=>[x.person_id,x])).values()];
    if (matches.length>1) result.review.push('Identity uncertainty');
    if (!validEmail(e) && !p) result.review.push('Identity uncertainty');
    if (retained.campaign_id && !campaignIds.includes(retained.campaign_id)) result.review.push('Missing attribution');
    // Ad IDs need provider mapping, not just syntactic validation.
    if (retained.ad_id) result.review.push('Ad attribution needs verified campaign mapping');
    result.candidate_ids=matches.map(x=>x.person_id);
    const supported = policy.enabled===true && policy.version==='website-v1' && policy.new_buyer_owner==='Freddie' && policy.owners?.includes('Freddie') && policy.approved_by && R.date(policy.approved_at);
    if (!supported) result.review.push('Website standing policy is not activated');
    if (supported && validEmail(e) && policy.ack_enabled===true && policy.sender_verified===true && policy.ack_content_approved===true) result.acknowledgment.status='eligible';
    if (!matches.length && !retained.full_name) result.review.push('Confirm the new buyer name');
    if (matches.length===1 && !policy.owners?.includes(matches[0].owner)) result.review.push('Confirm existing buyer owner');
    if (result.review.length) return result;
    const existing=matches[0], owner=existing?.owner||'Freddie';
    result.status='ready';
    result.person_id=existing?.person_id||'';
    if (!existing) result.actions.push({key:source_key+':person',type:'create_buyer',name:retained.full_name,email:retained.email||'',phone:retained.phone_number||'',owner,stage:'lead',property_id:retained.property_id,source:'website',first_channel:'form',first_touch_date:retained.received_date});
    result.actions.push({key:source_key+':e1',type:'inquiry',person_id:result.person_id,channel:'web form',event:'inquiry',stage:existing?'':'lead',timestamp:retained.received_at,source_key:source_key+':e1',preserve_existing:!!existing});
    result.actions.push({key:source_key+':followup',type:'propose_task',owner,task:'Respond to the website inquiry',due_date:R.businessDate(retained.received_date,1)});
    // This is eligibility for a separate durable acknowledgment job, never proof of sending.
    result.nurture={status:retained.marketing_permission==='yes'?'approval required':'permission required'};
    return result;
  }
  function pending(plan, receipts={}) {
    // Receipts must represent read-back/reconciled effects, not attempted writes.
    return plan.actions.filter(a=>receipts[a.key]?.status!=='verified');
  }
  function acknowledgment(receipt) {
    if (receipt?.status==='verified' && receipt.message_id) return 'sent';
    if (receipt?.status==='failed' && receipt.definitely_not_sent===true) return 'retry eligible';
    if (receipt?.status) return 'reconcile before retry';
    return 'not sent';
  }
  return {plan,pending,acknowledgment};
})();
if (typeof module !== 'undefined') module.exports = DeskIntake;
