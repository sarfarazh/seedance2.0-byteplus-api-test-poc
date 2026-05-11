import { StructuredPrompt } from '@/types/app';
export const OPENROUTER_URL='https://openrouter.ai/api/v1/chat/completions';
export const OPENROUTER_MODEL='anthropic/claude-sonnet-4.6';
const PROMPT_KEYS:(keyof StructuredPrompt)[]=['subject','setting','action','camera','lightingStyle','audio','constraints'];
const stripFences=(s:string)=>s.replace(/^\s*```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim();
const extractJsonObject=(s:string)=>{const a=s.indexOf('{'); const b=s.lastIndexOf('}'); return a>=0&&b>a?s.slice(a,b+1):s;};
export const parseStructuredPromptFromContent=(raw:string):StructuredPrompt|null=>{
  const candidates=[raw,stripFences(raw),extractJsonObject(stripFences(raw))];
  for(const c of candidates){
    try{
      const o=JSON.parse(c);
      if(o&&typeof o==='object'&&!Array.isArray(o)){
        const out={} as StructuredPrompt;
        for(const k of PROMPT_KEYS){const v=(o as Record<string,unknown>)[k]; out[k]=typeof v==='string'?v:v==null?'':String(v);}
        return out;
      }
    }catch{}
  }
  return null;
};
