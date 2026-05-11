const PACK_TOKENS=7000000; const PACK_USD=30.10;
const RATES_PER_M_USD:Record<string,number>={'dreamina-seedance-2-0-260128':4.3,'dreamina-seedance-2-0-fast-260128':3.3};
const DEFAULT_RATE_PER_M_USD=4.3;
export const estimate=(model:string,total:number)=>{const usd=total*((RATES_PER_M_USD[model]??DEFAULT_RATE_PER_M_USD)/1000000); return {consumed:total,usd};};
export const metrics=(consumed:number,success:number)=>{const remaining=Math.max(0,PACK_TOKENS-consumed); return {remainingTokens:remaining,remainingUsd:remaining*(PACK_USD/PACK_TOKENS),approxVideos:success?Math.floor(remaining/(consumed/success)):null};};
