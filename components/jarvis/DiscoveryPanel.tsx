'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DiscoveryProfile } from '@/lib/jarvis-discovery';

const field='mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal';
export default function DiscoveryPanel({initialProfile,configured}:{initialProfile:DiscoveryProfile;configured:boolean}) {
  const router=useRouter();
  const [profile,setProfile]=useState(initialProfile), [category,setCategory]=useState<'Corporate'|'Individual'>('Corporate');
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[result,setResult]=useState<{text:string;error:boolean}|null>(null);
  async function search(e:React.FormEvent){
    e.preventDefault();if(busy)return;setBusy(true);setResult(null);
    try{const response=await fetch('/api/jarvis/discover',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({category,profile})});
      const data=await response.json();setResult({text:data.error||data.success||'Search finished.',error:!response.ok});
      if(response.ok)router.refresh();
    }catch{setResult({text:'Search did not finish. Check the saved list before retrying.',error:true});}
    finally{setBusy(false);}
  }
  return <section className="my-5 rounded-2xl border border-[#dce7d3] bg-[#edf3e6] p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Discover donors beyond your CRM</h2><p className="mt-1 text-sm text-gray-600">Mission-led web research, source evidence, and a proposed approach for each prospect.</p></div><button type="button" onClick={()=>setOpen(!open)} className="rounded-lg bg-evergreen px-4 py-2.5 text-sm font-semibold text-white">{open?'Close research criteria':'Find new prospects ↗'}</button></div>
    {open?<form onSubmit={search} className="mt-5">
      <fieldset disabled={busy||!configured} className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold">Prospect category<select className={field} value={category} onChange={e=>setCategory(e.target.value as typeof category)}><option>Corporate</option><option>Individual</option></select></label>
        <label className="text-xs font-semibold">Public mission source<input required type="url" maxLength={2000} className={field} value={profile.missionSource} onChange={e=>setProfile({...profile,missionSource:e.target.value})}/></label>
        <label className="text-xs font-semibold sm:col-span-2">Mission to match<textarea required minLength={30} maxLength={1500} className={field} value={profile.mission} onChange={e=>setProfile({...profile,mission:e.target.value})}/></label>
        <label className="text-xs font-semibold">Focus areas<textarea required minLength={5} maxLength={1000} className={field} value={profile.focusAreas} onChange={e=>setProfile({...profile,focusAreas:e.target.value})}/></label>
        <label className="text-xs font-semibold">Service area / geographic connection<textarea required maxLength={600} className={field} value={profile.geography} onChange={e=>setProfile({...profile,geography:e.target.value})}/></label>
        <label className="text-xs font-semibold">Other public sources to consider<textarea maxLength={2000} className={field} placeholder="Official annual reports, public donor recognition, chamber directories, corporate giving pages or public URLs" value={profile.sourceHints} onChange={e=>setProfile({...profile,sourceHints:e.target.value})}/></label>
        <label className="text-xs font-semibold">Exclude / avoid<textarea maxLength={1000} className={field} placeholder="Industries, names, or programs outside your fundraising scope" value={profile.exclusions} onChange={e=>setProfile({...profile,exclusions:e.target.value})}/></label>
        <button type="submit" className="rounded-lg bg-evergreen px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy?'Researching public sources…':`Find ${category.toLowerCase()} prospects`}</button>
      </fieldset>
      {!configured?<p role="alert" className="mt-3 text-sm text-amber-900">The AI connection is not configured on this deployment. CRM pipeline building still works.</p>:null}
      <p className="mt-3 text-xs leading-6 text-gray-600">Each click runs up to three live searches and saves up to five cited research hypotheses. Only the public mission criteria above are sent to the existing AI/search provider; CRM donor records are not sent. Use public information only. Search usage incurs the provider’s normal charges. No messages are sent and no schedule is enabled.</p>
      <p className="mt-2 text-xs leading-6 text-gray-600">Corporate: businesses and corporate foundations. Individual: publicly documented adult philanthropists. Personal wealth, private contact details, sensitive traits, and willingness to donate are not inferred. Licensed databases and private sources require separate integrations.</p>
    </form>:null}
    {result?<p role={result.error?'alert':'status'} className={`mt-4 rounded-lg p-3 text-sm ${result.error?'bg-amber-50 text-amber-900':'bg-white text-evergreen'}`}>{result.text} {!result.error?<a href={`/jarvis/leads?category=${category}`} className="font-bold underline">View {category.toLowerCase()} leads →</a>:null}</p>:null}
  </section>;
}
