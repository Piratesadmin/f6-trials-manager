import { useMemo, useState, type FormEvent } from 'react'
import { ArrowLeft, CheckCircle2, ImagePlus, LockKeyhole, Send, ShieldCheck, Trash2, UserRound, UserPlus } from 'lucide-react'
import { ClubLogo } from '../components/ClubLogo'
import { positions } from '../data/constants'
import { blobToDataUrl, preparePlayerPhoto } from '../utils/photo'
import { submitClubSignup, type ClubSignupInput } from '../signup/api'
import '../signup/Signup.css'

const categories=['Mens','Women’s']
const divisions:Record<string,string[]>={
  'Mens':['NVL Div 1','LVA Div 2','LVA Div 3'],
  'Women’s':['NVL Div 2','LVA Div 1','LVA Div 2'],
}
const blank:ClubSignupInput={name:'',email:'',phone:'',profilePhoto:'',dateOfBirth:'',playingCategory:'',interestedDivisions:[],primaryPosition:'',secondaryPosition:'',playingExperience:'',highestLevelPlayed:'',currentClub:'',availability:'',heardAboutUs:'',notes:'',guardianName:'',guardianEmail:'',guardianPhone:'',consent:false,website:''}

function errorMessage(error:unknown){
  const message=error instanceof Error?error.message:''
  if(message.includes('already have an active'))return 'We already have an active sign-up for that email address. If you need to update it, please contact the club.'
  if(message.includes('resource-exhausted'))return 'The sign-up form is temporarily at capacity. Please contact the club directly.'
  if(message.includes('invalid-argument'))return message.replace(/^FirebaseError:\s*/, '').replace(/^functions\/invalid-argument:\s*/, '')
  return 'We could not send your details. Please check your connection and try again.'
}

function isUnder18(dateOfBirth:string){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth))return false
  const birth=new Date(`${dateOfBirth}T12:00:00`)
  const today=new Date()
  let age=today.getFullYear()-birth.getFullYear()
  if(today.getMonth()<birth.getMonth()||(today.getMonth()===birth.getMonth()&&today.getDate()<birth.getDate()))age--
  return age<18
}

export function SignupPage({exit}:{exit:()=>void}){
  const [form,setForm]=useState(blank)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [receipt,setReceipt]=useState('')
  const [photoBusy,setPhotoBusy]=useState(false)
  const [photoError,setPhotoError]=useState('')
  const under18=useMemo(()=>isUnder18(form.dateOfBirth),[form.dateOfBirth])
  const change=<K extends keyof ClubSignupInput>(key:K,value:ClubSignupInput[K])=>setForm(current=>({...current,[key]:value}))
  const changeCategory=(playingCategory:string)=>setForm(current=>({...current,playingCategory,interestedDivisions:[]}))
  const toggleDivision=(division:string)=>setForm(current=>({...current,interestedDivisions:current.interestedDivisions.includes(division)?current.interestedDivisions.filter(value=>value!==division):[...current.interestedDivisions,division]}))
  const choosePhoto=async(file?:File)=>{
    if(!file)return
    setPhotoBusy(true);setPhotoError('')
    try{change('profilePhoto',await blobToDataUrl(await preparePlayerPhoto(file)))}
    catch(photoFailure){setPhotoError(photoFailure instanceof Error?photoFailure.message:'The photo could not be prepared.')}
    finally{setPhotoBusy(false)}
  }
  const submit=async(event:FormEvent)=>{
    event.preventDefault();setBusy(true);setError('')
    try{const result=await submitClubSignup(form);setReceipt(result.signupId);setForm(blank);window.scrollTo({top:0,behavior:'smooth'})}
    catch(submitError){setError(errorMessage(submitError))}
    finally{setBusy(false)}
  }

  if(receipt)return <div className="signup-app"><SignupHeader exit={exit}/><main><section className="signup-success"><CheckCircle2/><p className="signup-eyebrow">Interest registered</p><h1>Thanks — we’ll be in touch</h1><p>Your details have been sent to the Flaming Six team. We’ll use the email address or phone number you provided to contact you about the next suitable opportunity.</p><span>Reference <b>{receipt}</b></span><button type="button" onClick={()=>setReceipt('')}>Send another sign-up</button></section></main><SignupFooter/></div>

  return <div className="signup-app"><SignupHeader exit={exit}/><main>
    <section className="signup-hero"><div><p className="signup-eyebrow">Join Flaming Six Volleyball Club</p><h1>Ready for your next team?</h1><p>Tell us a little about you and your volleyball experience. Our club team will review your details and contact you about trials, training or the squad that may suit you best.</p><div className="signup-trust"><span><ShieldCheck/>Your details go directly to the club team</span><span><UserPlus/>This is an expression of interest, not a commitment</span></div></div><ClubLogo/></section>
    <form className="signup-form" onSubmit={submit}>
      <section><header><span>1</span><div><h2>Your details</h2><p>How we can identify and contact you.</p></div></header><div className="signup-grid">
        <label>Full name<input required minLength={2} maxLength={120} autoComplete="name" value={form.name} onChange={event=>change('name',event.target.value)}/></label>
        <label>Email address<input required type="email" maxLength={200} autoComplete="email" value={form.email} onChange={event=>change('email',event.target.value)}/></label>
        <label>Mobile number<input required type="tel" minLength={7} maxLength={30} autoComplete="tel" value={form.phone} onChange={event=>change('phone',event.target.value)}/></label>
        <label>Date of birth<input required type="date" max={new Date().toISOString().slice(0,10)} autoComplete="bday" value={form.dateOfBirth} onChange={event=>change('dateOfBirth',event.target.value)}/></label>
        <div className="signup-photo-field"><span className={form.profilePhoto?'has-photo':''}>{form.profilePhoto?<img src={form.profilePhoto} alt="Profile preview"/>:<UserRound/>}</span><div><b>Profile photo <small>Optional</small></b><p>Add a clear photo so coaches can recognise you at a trial. Images are resized before they are uploaded.</p>{photoError&&<em>{photoError}</em>}<div><label className="signup-photo-button"><ImagePlus/>{photoBusy?'Preparing…':form.profilePhoto?'Change photo':'Add photo'}<input type="file" accept="image/*" disabled={photoBusy} onChange={event=>void choosePhoto(event.target.files?.[0])}/></label>{form.profilePhoto&&<button type="button" onClick={()=>change('profilePhoto','')}><Trash2/>Remove</button>}</div></div></div>
      </div></section>
      {under18&&<section className="signup-guardian"><header><span><ShieldCheck/></span><div><h2>Parent or guardian</h2><p>Required because the player is currently under 18.</p></div></header><div className="signup-grid">
        <label>Parent or guardian name<input required minLength={2} maxLength={120} value={form.guardianName} onChange={event=>change('guardianName',event.target.value)}/></label>
        <label>Parent or guardian email<input required type="email" maxLength={200} value={form.guardianEmail} onChange={event=>change('guardianEmail',event.target.value)}/></label>
        <label>Parent or guardian phone<input required type="tel" minLength={7} maxLength={30} value={form.guardianPhone} onChange={event=>change('guardianPhone',event.target.value)}/></label>
      </div></section>}
      <section><header><span>2</span><div><h2>Your volleyball</h2><p>Help us find the most relevant team or trial.</p></div></header><div className="signup-grid">
        <label>Playing category<select required value={form.playingCategory} onChange={event=>changeCategory(event.target.value)}><option value="">Choose one…</option>{categories.map(value=><option key={value}>{value}</option>)}</select></label>
        {form.playingCategory&&<fieldset className="signup-division-picker"><legend>Divisions you’re interested in <small>Select all that apply</small></legend>{divisions[form.playingCategory].map((division,index)=><label key={division} className={form.interestedDivisions.includes(division)?'selected':''}><input type="checkbox" checked={form.interestedDivisions.includes(division)} required={index===0&&!form.interestedDivisions.length} onChange={()=>toggleDivision(division)}/><span>{division}</span></label>)}</fieldset>}
        <label>Primary position<select required value={form.primaryPosition} onChange={event=>change('primaryPosition',event.target.value)}><option value="">Choose one…</option>{[...positions,'Not sure'].map(value=><option key={value}>{value}</option>)}</select></label>
        <label>Secondary position <small>Optional</small><select value={form.secondaryPosition} onChange={event=>change('secondaryPosition',event.target.value)}><option value="">None / not sure</option>{positions.filter(value=>value!==form.primaryPosition).map(value=><option key={value}>{value}</option>)}</select></label>
        <label className="full">Tell us about your playing experience<textarea required minLength={10} maxLength={2000} rows={4} placeholder="How long you’ve played, recent teams, training frequency and anything else that helps us understand your experience." value={form.playingExperience} onChange={event=>change('playingExperience',event.target.value)}/><small>{form.playingExperience.length}/2000</small></label>
        <label>Highest level played<input required minLength={2} maxLength={200} placeholder="e.g. London League Division 1" value={form.highestLevelPlayed} onChange={event=>change('highestLevelPlayed',event.target.value)}/></label>
        <label>Current or most recent club <small>Optional</small><input maxLength={120} value={form.currentClub} onChange={event=>change('currentClub',event.target.value)}/></label>
      </div></section>
      <section><header><span>3</span><div><h2>Availability and preferences</h2><p>Anything that will help us make the right introduction.</p></div></header><div className="signup-grid">
        <label className="full">When are you generally available to train and play?<textarea required minLength={5} maxLength={1000} rows={3} placeholder="Include days or times you cannot usually make." value={form.availability} onChange={event=>change('availability',event.target.value)}/><small>{form.availability.length}/1000</small></label>
        <label>How did you hear about Flaming Six? <small>Optional</small><input maxLength={200} value={form.heardAboutUs} onChange={event=>change('heardAboutUs',event.target.value)}/></label>
        <label className="full">Anything else we should know? <small>Optional</small><textarea maxLength={2000} rows={3} value={form.notes} onChange={event=>change('notes',event.target.value)}/><small>{form.notes.length}/2000</small></label>
      </div></section>
      <input className="signup-honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={event=>change('website',event.target.value)}/>
      <section className="signup-consent"><LockKeyhole/><label><input required type="checkbox" checked={form.consent} onChange={event=>change('consent',event.target.checked)}/><span><b>I agree that Flaming Six may use these details to respond to my expression of interest.</b><small>Your information is visible only to signed-in Club Manager users. It will be used to contact you about club opportunities and should not include medical or other sensitive information.</small></span></label></section>
      {error&&<div className="signup-error">{error}</div>}
      <button className="signup-submit" disabled={busy||!form.consent}><Send/>{busy?'Sending…':'Register my interest'}</button>
    </form>
  </main><SignupFooter/></div>
}

function SignupHeader({exit}:{exit:()=>void}){return <header className="signup-header"><button type="button" className="signup-brand" onClick={exit}><ClubLogo/><span><b>Flaming Six</b><small>Volleyball Club</small></span></button><button type="button" onClick={exit}><ArrowLeft/>Club Manager</button></header>}
function SignupFooter(){return <footer className="signup-footer"><ClubLogo/><span><b>Flaming Six Volleyball Club</b><small>Expression of interest</small></span></footer>}
