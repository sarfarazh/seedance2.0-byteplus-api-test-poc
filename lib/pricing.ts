const PACK_TOKENS=7000000; const PACK_USD=30.10; const M:Record<string,number>={'dreamina-seedance-2-0-260128':1,'dreamina-seedance-2-0-fast-260128':1};
export const estimate=(model:string,total:number)=>{const consumed=total*(M[model]??1); const usd=consumed*(PACK_USD/PACK_TOKENS); return {consumed,usd};};
export const metrics=(consumed:number,success:number)=>{const remaining=Math.max(0,PACK_TOKENS-consumed); return {remainingTokens:remaining,remainingUsd:remaining*(PACK_USD/PACK_TOKENS),approxVideos:success?Math.floor(remaining/(consumed/success)):null};};
