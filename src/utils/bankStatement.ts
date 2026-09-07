import workerSource from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

export type StatementCandidate = {
  id:string
  page:number
  date:string
  description:string
  reference:string
  amount:number
  raw:string
}

type PositionedText={text:string;x:number;y:number}

const monthNumbers:Record<string,string>={jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'}

function isoDate(value:string){
  const numeric=value.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/)
  if(numeric){const year=numeric[3].length===2?`20${numeric[3]}`:numeric[3];return `${year}-${numeric[2].padStart(2,'0')}-${numeric[1].padStart(2,'0')}`}
  const words=value.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2,4})$/)
  if(words){const month=monthNumbers[words[2].slice(0,3).toLowerCase()];const year=words[3].length===2?`20${words[3]}`:words[3];if(month)return`${year}-${month}-${words[1].padStart(2,'0')}`}
  return''
}

function money(value:string){
  const amount=Number(value.replace(/[£,\s]/g,'').replace(/(?:CR|DR)$/i,''))
  return Number.isFinite(amount)?Math.abs(Math.round(amount*100)/100):0
}

function linesFromItems(items:PositionedText[]){
  const rows:PositionedText[][]=[]
  items.sort((a,b)=>b.y-a.y||a.x-b.x).forEach(item=>{
    const row=rows.find(candidate=>Math.abs(candidate[0].y-item.y)<2.5)
    if(row)row.push(item);else rows.push([item])
  })
  return rows.map(row=>row.sort((a,b)=>a.x-b.x).map(item=>item.text).join(' ').replace(/\s+/g,' ').trim()).filter(Boolean)
}

function parseLine(raw:string,page:number,index:number,statementId:string):StatementCandidate|null{
  const dateMatch=raw.match(/\b(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})\b/)
  if(!dateMatch)return null
  const date=isoDate(dateMatch[1])
  const values=[...raw.matchAll(/(?:£\s*)?-?\d{1,3}(?:,\d{3})*\.\d{2}(?:\s*(?:CR|DR))?/gi)]
  if(!date||!values.length)return null
  // Most UK statement PDFs finish a row with transaction amount and balance. The
  // review screen deliberately exposes this provisional amount before it is saved.
  const amountToken=values.length>1?values.at(-2) as RegExpMatchArray:values[0]
  const amount=money(amountToken[0])
  if(!amount)return null
  const start=(dateMatch.index||0)+dateMatch[0].length
  const end=amountToken.index??raw.length
  const description=raw.slice(start,end).replace(/\s+/g,' ').trim()||raw
  const referenceMatch=description.match(/\bF6[-\s]?[A-Z0-9-]{5,}\b/i)
  return{id:`${statementId}-${page}-${index}`,page,date,description,reference:referenceMatch?.[0].replace(/\s+/g,'').toUpperCase()||'',amount,raw}
}

async function fileFingerprint(bytes:ArrayBuffer){
  const digest=await crypto.subtle.digest('SHA-256',bytes)
  return Array.from(new Uint8Array(digest)).slice(0,10).map(value=>value.toString(16).padStart(2,'0')).join('')
}

export async function extractStatementCandidates(file:File){
  const {GlobalWorkerOptions,getDocument}=await import('pdfjs-dist')
  GlobalWorkerOptions.workerSrc=workerSource
  const bytes=await file.arrayBuffer()
  const statementId=await fileFingerprint(bytes)
  const document=await getDocument({data:new Uint8Array(bytes)}).promise
  const candidates:StatementCandidate[]=[]
  let extractedCharacters=0
  for(let pageNumber=1;pageNumber<=document.numPages;pageNumber+=1){
    const page=await document.getPage(pageNumber)
    const content=await page.getTextContent()
    const items=content.items.flatMap(item=>{
      if(!('str'in item)||!item.str.trim())return[]
      extractedCharacters+=item.str.length
      return[{text:item.str,x:item.transform[4],y:item.transform[5]}]
    })
    linesFromItems(items).forEach((line,index)=>{const candidate=parseLine(line,pageNumber,index,statementId);if(candidate)candidates.push(candidate)})
  }
  if(extractedCharacters<10)throw new Error('This PDF does not contain readable text. It may be a scanned statement; export a text-based PDF or use the manual payment option.')
  if(!candidates.length)throw new Error('No transaction rows were recognised. The statement layout will need adapting once the real sample is available.')
  return{statementId,candidates}
}
