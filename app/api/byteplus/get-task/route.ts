import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { BYTEPLUS_BASE } from '@/lib/byteplus';
const schema=z.object({apiKey:z.string().min(1),taskId:z.string().min(1)});
export async function POST(req:NextRequest){const p=schema.safeParse(await req.json()); if(!p.success) return NextResponse.json({error:'Invalid body'},{status:400}); const r=await fetch(`${BYTEPLUS_BASE}/contents/generations/tasks/${p.data.taskId}`,{headers:{Authorization:`Bearer ${p.data.apiKey}`}}); const j=await r.json(); if(!r.ok) return NextResponse.json({error:j?.error?.message||'Get task failed',raw:j},{status:r.status}); return NextResponse.json(j);}
