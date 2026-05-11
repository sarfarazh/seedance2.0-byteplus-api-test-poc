import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { OPENROUTER_MODEL, OPENROUTER_URL, parseStructuredPromptFromContent } from '@/lib/openrouter';
const schema=z.object({apiKey:z.string().min(1),logline:z.string().min(1)});
const SYSTEM_PROMPT=`You are a cinematic video prompt engineer for the Seedance 2.0 live-action video model. Given a logline, output ONE JSON object (no markdown, no commentary) with EXACTLY these string keys:
{"subject":"","setting":"","action":"","camera":"","lightingStyle":"","audio":"","constraints":""}
Every value must be a single concise descriptive sentence in English. Style: realistic live-action, cinematic. Do not include any other keys. Do not wrap the JSON in code fences.`;
export async function POST(req:NextRequest){
  const p=schema.safeParse(await req.json());
  if(!p.success) return NextResponse.json({error:'Invalid body'},{status:400});
  const refererHeader=req.headers.get('origin')||req.headers.get('referer')||'http://localhost:3000';
  const r=await fetch(OPENROUTER_URL,{method:'POST',headers:{Authorization:`Bearer ${p.data.apiKey}`,'Content-Type':'application/json','HTTP-Referer':refererHeader,'X-Title':'Seedance 2.0 PoC'},body:JSON.stringify({model:OPENROUTER_MODEL,response_format:{type:'json_object'},messages:[{role:'system',content:SYSTEM_PROMPT},{role:'user',content:p.data.logline}]})});
  const j=await r.json();
  if(!r.ok) return NextResponse.json({error:j?.error?.message||'OpenRouter failed',raw:j},{status:r.status});
  const content=j?.choices?.[0]?.message?.content;
  if(typeof content!=='string') return NextResponse.json({error:'No assistant content returned',raw:j},{status:502});
  const parsed=parseStructuredPromptFromContent(content);
  if(!parsed) return NextResponse.json({error:'Model output was not valid JSON for structured prompt',raw:j,content},{status:502});
  return NextResponse.json({structuredPrompt:parsed,raw:j});
}
