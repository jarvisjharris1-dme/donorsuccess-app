import test from 'node:test';
import assert from 'node:assert/strict';
import { collectWebEvidence, defaultDiscoveryProfile, discoveryOutputSchema, discoveryRequestSchema, prospectIdentity, publicUrl } from '../lib/jarvis-discovery';
import { emptyLead, readLead, writeLead, preserveApproval } from '../lib/jarvis-leads';

test('evidence is drawn only from actual provider citations',()=>{
  const content=[{type:'text',text:'An uncited claim with https://madeup.example.org'},
    {type:'text',citations:[{type:'web_search_result_location',url:'https://example.org/report',title:'Annual report',cited_text:'An example of public support for education.'}]},
    {type:'text',citations:[{type:'web_search_result_location',url:'javascript:alert(1)',cited_text:'Unsafe URL'}]}];
  const evidence=collectWebEvidence(content);
  assert.equal(evidence.length,1);assert.equal(evidence[0].url,'https://example.org/report');
  assert.equal(collectWebEvidence({content}).length,0);
});
test('citation duplicates are removed and excerpts bounded',()=>{
  const citation={type:'web_search_result_location',url:'https://example.org/a',title:'A',cited_text:'a'.repeat(300)};
  const evidence=collectWebEvidence([{type:'text',citations:[citation,citation]}]);
  assert.equal(evidence.length,1);assert.equal(evidence[0].excerpt.length,150);
});
test('public source URLs reject credentials, local addresses and unsafe schemes',()=>{
  for(const url of ['http://example.org','https://127.0.0.1','https://localhost','https://host.local','https://user:secret@example.org','javascript:alert(1)']) assert.equal(publicUrl.safeParse(url).success,false,url);
  assert.equal(publicUrl.safeParse('https://example.org/report').success,true);
});
test('United Way profile has primary source and confirmed geography',()=>{
  const profile=defaultDiscoveryProfile('United Way of The Midsouth');
  assert.ok(discoveryRequestSchema.safeParse({category:'Corporate',profile}).success);
  assert.ok(discoveryRequestSchema.safeParse({category:'Individual',profile}).success);
  assert.match(profile.geography,/Crittenden/);assert.equal(profile.missionSource,'https://uwmidsouth.org/about/');
  assert.equal(discoveryRequestSchema.safeParse({category:'Other',profile}).success,false);
});
test('corporate and individual category and discovery provenance persist',()=>{
  const lead={...emptyLead(),name:'Example Company',rationale:'Possible education connection in a public report.',source:'https://example.org/report',
    discovery:{matchedFocus:'Education',geographicConnection:'Public report describes Memphis programs.',outreachAngle:'Explore alignment with education programs.',searchedAt:'2026-11-02T00:00:00.000Z',evidence:[{url:'https://example.org/report',title:'Report',excerpt:'Education program in Memphis.'}],status:'research hypothesis' as const}};
  assert.equal(readLead(writeLead(lead))?.category,'Corporate');
  assert.equal(readLead(writeLead({...lead,category:'Individual'}))?.category,'Individual');
  const approved={...lead,subject:'Hi',body:'Hello',communicationStatus:'approved' as const,approvedBy:'u1'};
  assert.equal(preserveApproval(approved,{...approved,category:'Individual'}).communicationStatus,'pending review');
});
test('invalid extraction shapes and name dedupe normalization',()=>{
  assert.equal(discoveryOutputSchema.safeParse({prospects:[{name:'Imagined',evidenceIndexes:[]}]}).success,false);
  assert.equal(prospectIdentity(' Example, Inc. '),prospectIdentity('EXAMPLE INC'));
  assert.ok(discoveryOutputSchema.safeParse({prospects:[]}).success);
});
