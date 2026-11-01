import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyLead, leadSchema, readLead, writeLead, rateLead, preserveApproval, proposeCommunication } from '../lib/jarvis-leads';

const valid = () => ({ ...emptyLead(), name: 'Example Company', rationale: 'A staff referral suggests relevant program interests.', source: 'Staff referral; verify before outreach.' });

test('lead envelopes round-trip and invalid records fail closed', () => {
  const lead = valid();
  assert.deepEqual(readLead(writeLead(lead)), lead);
  assert.equal(readLead('ordinary task'), null);
  assert.equal(readLead('jarvis-lead:v1:{"version":2}'), null);
  assert.equal(readLead('jarvis-lead:v1:broken'), null);
});
test('unknown evidence is not presented as a qualified lead', () => {
  const result = rateLead(valid());
  assert.equal(result.score, 0);
  assert.equal(result.grade, 'Needs qualification');
  assert.ok(result.missing.includes('mission fit'));
});
test('rubric points are bounded, transparent, and add to 100', () => {
  const lead = { ...valid(), fit: 'verified' as const, relationship: 'active' as const, capacity: 'demonstrated' as const,
    timing: 'now' as const, contact: 'Example Contact', email: 'person@example.org', qualityEvidence: 'Verified source notes.' };
  const result = rateLead(lead);
  assert.equal(result.score, 100); assert.equal(result.grade, 'High');
  assert.equal(result.factors.reduce((n,f)=>n+f.points,0),result.score);
  assert.equal(rateLead({...lead,qualityEvidence:''}).grade,'Needs qualification');
});
test('recipient, message, and targeting edits invalidate approval; scheduling does not', () => {
  const lead = { ...valid(), subject: 'Introduction', body: 'Hello there', communicationStatus: 'approved' as const,
    approvedBy: 'user-1', approvedAt: '2026-11-01T12:00:00.000Z' };
  for (const changed of [{email:'new@example.org'},{body:'Edited message'},{rationale:'New targeting reason'},{source:'Different source'}]) {
    const next = preserveApproval(lead,{...lead,...changed});
    assert.equal(next.communicationStatus,'pending review'); assert.equal(next.approvedBy,undefined);
  }
  assert.equal(preserveApproval(lead,{...lead,dueDate:'2026-11-15'}).communicationStatus,'approved');
  assert.notEqual(preserveApproval(null,lead).communicationStatus,'approved');
});
test('invalid contact email and impossible dates are rejected', () => {
  assert.equal(leadSchema.safeParse({...valid(),email:'not an email'}).success,false);
  assert.equal(leadSchema.safeParse({...valid(),dueDate:'2026-02-31'}).success,false);
  assert.equal(leadSchema.safeParse({...valid(),dueDate:'2026-11-15'}).success,true);
});
test('proposals vary by outreach goal and require verified personalization', () => {
  const lead=valid();
  const corporate=proposeCommunication(lead,'Example Nonprofit','Officer');
  const foundation=proposeCommunication({...lead,goal:'Foundation introduction'},'Example Nonprofit','Officer');
  assert.notEqual(corporate.subject,foundation.subject);
  assert.match(corporate.body,/\[Contact name\]/);
  assert.match(corporate.body,/verified sentence/);
  assert.doesNotMatch(corporate.body,/prior donation|you promised|giving capacity/i);
});
