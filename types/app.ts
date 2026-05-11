export type Screen = 'generate' | 'history' | 'usage' | 'logs' | 'settings';
export type ModelChoice = 'seedance2' | 'seedance2fast' | 'both';
export type Ratio = '9:16' | '16:9';
export type GenerationStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'expired' | 'timeout';
export interface StructuredPrompt { subject:string; setting:string; action:string; camera:string; lightingStyle:string; audio:string; constraints:string; }
export interface GenerationRecord { id:string; timestamp:string; model:string; duration:4|6; ratio:Ratio; generateAudio:boolean; status:GenerationStatus; logline:string; structuredPrompt:StructuredPrompt; taskId?:string; videoUrl?:string; usageTotalTokens?:number; usageCompletionTokens?:number; estimatedCostUsd?:number; error?:string; }
export interface AppLog { id:string; timestamp:string; actionType:string; status:string; message:string; model?:string; taskId?:string; errorDetails?:string; rawJson?:unknown; }
export interface UsageTotals { totalVideos:number; successVideos:number; failedVideos:number; totalTokens:number; totalCompletionTokens:number; resourceTokensConsumed:number; usdUsed:number; }
