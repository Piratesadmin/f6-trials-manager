import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { createServer } from 'vite'

const server=await createServer({configFile:false,server:{middlewareMode:true,hmr:false,ws:false,watch:null},optimizeDeps:{noDiscovery:true},appType:'custom'})
after(()=>server.close())
const {prepareInvoiceEdit}=await server.ssrLoadModule('/src/utils/invoiceEditing.ts')
const {coachInvoiceFinanceSummary,invoiceEntryRate,normaliseCoachInvoice}=await server.ssrLoadModule('/src/utils/timesheets.ts')

const invoice={id:'invoice-1',invoiceNumber:'F6-001',coachUid:'coach-1',coachName:'Test coach',coachEmail:'coach@example.test',entryIds:['entry-1','entry-2'],totalHours:3.5,hourlyRate:10,rateBreakdown:{Coyotes:10,Llamas:10},totalAmount:35,season:'2026 season',status:'Submitted',submittedAt:100}
const entry=(id,team,hours)=>({id,coachUid:invoice.coachUid,coachName:invoice.coachName,coachEmail:invoice.coachEmail,date:'2026-10-14',team,activity:'Training',hours,notes:'Session',season:invoice.season,invoiceId:invoice.id,createdAt:50,updatedAt:100})
const existing={'entry-1':entry('entry-1','Coyotes',1.5),'entry-2':entry('entry-2','Llamas',2)}
const edit=()=>({invoiceNumber:'F6-002',season:'2027 season',entries:Object.values(existing).map(row=>({...row,hourlyRate:10})),entryVersions:{'entry-1':100,'entry-2':100},feeAdjustment:0,feeNote:'',note:'Correct hours and rates'})

test('edits actual logs and per-entry rates and derives totals, retaining submission rates',()=>{
  const draft=edit()
  draft.entries[0]={...draft.entries[0],date:'2026-10-15',team:'Llamas',activity:'Match',hours:2.25,hourlyRate:12.5,notes:'Corrected fixture'}
  const result=prepareInvoiceEdit(invoice,existing,draft,'Admin',200)
  assert.equal(result.invoice.totalHours,4.25)
  assert.equal(result.invoice.totalAmount,48.13)
  assert.equal(result.entries[0].hours,2.25)
  assert.equal(result.entries[0].date,'2026-10-15')
  assert.equal(result.entries[0].activity,'Match')
  assert.equal(result.entries[0].notes,'Corrected fixture')
  assert.ok(result.entries.every(row=>row.season==='2027 season'&&row.invoiceId===invoice.id))
  assert.equal(invoiceEntryRate(result.invoice,result.entries[0]),12.5)
  assert.equal(invoiceEntryRate(result.invoice,result.entries[1]),10)
  assert.deepEqual(result.invoice.rateBreakdown,invoice.rateBreakdown)
  assert.equal(existing['entry-1'].hours,1.5)
})

test('adds and removes invoice entries without altering other drafts',()=>{
  const draft=edit()
  draft.entries=[draft.entries[1],{...draft.entries[0],id:'new-entry',updatedAt:0}]
  const result=prepareInvoiceEdit(invoice,{...existing,unrelated:{...existing['entry-1'],id:'unrelated',invoiceId:''}},draft,'Admin',200)
  assert.deepEqual(result.removedIds,['entry-1'])
  assert.deepEqual(result.invoice.entryIds,['entry-2','new-entry'])
  assert.equal(result.entries[1].createdAt,200)
})

test('paid corrections preserve payment status, date and payer',()=>{
  const paid={...invoice,status:'Paid',paidAt:150,paidBy:'Treasurer'}
  const result=prepareInvoiceEdit(paid,existing,edit(),'Admin',200)
  assert.equal(result.invoice.status,'Paid')
  assert.equal(result.invoice.paidAt,150)
  assert.equal(result.invoice.paidBy,'Treasurer')
})

test('fee adjustments reconcile exactly with finance team budgets, including pennies',()=>{
  for(const fee of [5.01,-4.99,0]){
    const draft={...edit(),season:invoice.season,feeAdjustment:fee,feeNote:'Travel adjustment'}
    const result=prepareInvoiceEdit(invoice,existing,draft,'Admin',200)
    const summary=coachInvoiceFinanceSummary({'coach-1':{'invoice-1':result.invoice}},{'coach-1':Object.fromEntries(result.entries.map(row=>[row.id,row]))},invoice.season)
    assert.equal(summary.totalAmount,Math.round((35+fee)*100)/100)
    assert.equal(Math.round(Object.values(summary.byTeam).reduce((sum,team)=>sum+team.invoiced,0)*100)/100,summary.totalAmount)
  }
})

test('retains minute precision and rounds each entry to pennies',()=>{
  const draft=edit()
  draft.entries[0].hours=1/60
  draft.entries[0].hourlyRate=10
  assert.equal(prepareInvoiceEdit(invoice,existing,draft,'Admin').invoice.totalAmount,20.17)
})

test('retains zero rate overrides after normalisation',()=>{
  const draft=edit()
  draft.entries[0].hourlyRate=0
  const result=prepareInvoiceEdit(invoice,existing,draft,'Admin')
  const normal=normaliseCoachInvoice(invoice.coachUid,invoice.id,result.invoice)
  assert.equal(invoiceEntryRate(normal,result.entries[0]),0)
  assert.equal(normal.totalAmount,20)
})

test('older invoices retain their original rates and aggregate rounding',()=>{
  const rows=Object.fromEntries(Object.values(existing).map(row=>[row.id,{...row,hours:1/60,team:'Coyotes'}]))
  const legacy={...invoice,totalHours:2/60,totalAmount:0.33,rateBreakdown:{Coyotes:10}}
  const summary=coachInvoiceFinanceSummary({'coach-1':{'invoice-1':legacy}},{'coach-1':rows},invoice.season)
  assert.equal(summary.byTeam.Coyotes.invoiced,0.33)
  assert.equal(invoiceEntryRate(legacy,rows['entry-1']),10)
})

test('edits invoices from before team-rate snapshots while satisfying existing database validation',()=>{
  const legacy={...invoice,rateBreakdown:{}}
  const draft={...edit(),feeAdjustment:5,feeNote:'Travel'}
  draft.entries[0].hourlyRate=15
  const result=prepareInvoiceEdit(legacy,existing,draft,'Admin')
  assert.equal(result.invoice.totalAmount,47.5)
  assert.ok(Math.abs(result.invoice.hourlyRate*result.invoice.totalHours-result.invoice.totalAmount)<0.011)
  assert.equal(invoiceEntryRate(result.invoice,result.entries[0]),15)
  assert.equal(invoiceEntryRate(result.invoice,result.entries[1]),10)
})

test('rejects invalid durations, dates, rates, totals and incomplete reasons',()=>{
  for(const patch of [{hours:0},{hours:24.1},{hours:1.234},{hours:NaN},{date:'2026-02-30'},{hourlyRate:-1},{hourlyRate:1000.01},{hourlyRate:Infinity},{team:'Unknown'}]){
    const draft=edit()
    Object.assign(draft.entries[0],patch)
    assert.throws(()=>prepareInvoiceEdit(invoice,existing,draft,'Admin'))
  }
  assert.throws(()=>prepareInvoiceEdit(invoice,existing,{...edit(),feeAdjustment:-100,feeNote:'Discount'},'Admin'),/total/)
  assert.throws(()=>prepareInvoiceEdit(invoice,existing,{...edit(),feeAdjustment:5},'Admin'),/Describe/)
  assert.throws(()=>prepareInvoiceEdit(invoice,existing,{...edit(),note:'  '},'Admin'),/Explain/)
  assert.throws(()=>prepareInvoiceEdit(invoice,existing,{...edit(),entries:[]},'Admin'),/between 1 and 200/)
})

test('rejects stale, missing, duplicated and cross-invoice entries, including removals',()=>{
  assert.throws(()=>prepareInvoiceEdit(invoice,{...existing,'entry-1':{...existing['entry-1'],updatedAt:101}},edit(),'Admin'),/has changed/)
  assert.throws(()=>prepareInvoiceEdit(invoice,{'entry-2':existing['entry-2']},edit(),'Admin'),/has changed/)
  const draft=edit()
  draft.entries=[draft.entries[1]]
  assert.throws(()=>prepareInvoiceEdit(invoice,{...existing,'entry-1':{...existing['entry-1'],updatedAt:101}},draft,'Admin'),/has changed/)
  assert.throws(()=>prepareInvoiceEdit(invoice,existing,{...edit(),entries:[edit().entries[0],edit().entries[0]]},'Admin'),/unique/)
  const other={...existing,'stolen-entry':{...existing['entry-1'],id:'stolen-entry',invoiceId:'other-invoice'}}
  assert.throws(()=>prepareInvoiceEdit(invoice,other,{...edit(),entries:[...edit().entries,{...edit().entries[0],id:'stolen-entry'}]},'Admin'),/another invoice/)
})
