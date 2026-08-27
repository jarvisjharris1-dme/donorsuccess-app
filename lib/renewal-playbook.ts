import type { CustomerLifecycleRecord } from '@/lib/customer-lifecycle';
import { daysToRenewal } from '@/lib/customer-lifecycle';

export type RenewalStage = 'NO_DATE'|'180_DAY'|'120_DAY'|'90_DAY'|'60_DAY'|'30_DAY'|'DUE'|'OVERDUE'|'RENEWED';
export type RenewalPlaybookStep = { id:string; label:string; description:string; dueStage:RenewalStage; complete:boolean };

export function renewalStage(record: CustomerLifecycleRecord | null): RenewalStage {
  if (!record?.renewalDate) return 'NO_DATE';
  if (record.renewalStatus === 'RENEWED') return 'RENEWED';
  const days = daysToRenewal(record.renewalDate);
  if (days == null) return 'NO_DATE';
  if (days < 0) return 'OVERDUE';
  if (days === 0) return 'DUE';
  if (days <= 30) return '30_DAY';
  if (days <= 60) return '60_DAY';
  if (days <= 90) return '90_DAY';
  if (days <= 120) return '120_DAY';
  return '180_DAY';
}

export function stageLabel(stage: RenewalStage) {
  return ({NO_DATE:'Date Needed',180_DAY:'180-Day Discovery',120_DAY:'120-Day Value Review',90_DAY:'90-Day Renewal Plan',60_DAY:'60-Day Decision',30_DAY:'30-Day Close',DUE:'Due Today',OVERDUE:'Overdue',RENEWED:'Renewed'})[stage];
}

const stageRank: Record<RenewalStage,number>={NO_DATE:0,180_DAY:1,120_DAY:2,90_DAY:3,60_DAY:4,30_DAY:5,DUE:6,OVERDUE:7,RENEWED:8};
export function playbookFor(record: CustomerLifecycleRecord | null): RenewalPlaybookStep[] {
  const stage=renewalStage(record), rank=stageRank[stage];
  const steps=[
    ['discovery','Confirm renewal date, owner and decision process','Validate contract timing, stakeholders, budget cycle and renewal path.','180_DAY'],
    ['value','Document value and outcomes','Capture adoption, donor outcomes, wins, gaps and executive value story.','120_DAY'],
    ['plan','Lock renewal strategy','Confirm risks, pricing path, decision makers, next meeting and close plan.','90_DAY'],
    ['decision','Drive customer decision','Resolve objections, confirm procurement/legal steps and secure verbal direction.','60_DAY'],
    ['close','Close renewal','Complete paperwork, payment/procurement and final renewal confirmation.','30_DAY'],
  ] as const;
  return steps.map(([id,label,description,dueStage])=>({id,label,description,dueStage,complete:stage==='RENEWED'||rank>stageRank[dueStage]}));
}

export function renewalRisk(record: CustomerLifecycleRecord | null, lastLogin: Date | null, donorHealth: number | null) {
  const days=record?.renewalDate?daysToRenewal(record.renewalDate):null;
  const reasons:string[]=[];
  if(record?.renewalStatus==='AT_RISK')reasons.push('Renewal marked at risk');
  if(days!=null&&days<=60&&record?.renewalStatus!=='COMMITTED'&&record?.renewalStatus!=='RENEWED')reasons.push(`${Math.max(days,0)} days to renewal without commitment`);
  if(lastLogin&&Date.now()-lastLogin.getTime()>30*86400000)reasons.push('No login in 30+ days');
  if(!lastLogin)reasons.push('No customer login recorded');
  if(donorHealth!=null&&donorHealth<60)reasons.push('Low average donor health');
  return {atRisk:reasons.length>0,reasons};
}
