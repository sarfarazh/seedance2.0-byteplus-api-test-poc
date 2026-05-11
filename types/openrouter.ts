export interface OpenRouterChoice { message:{content:string}; }
export interface OpenRouterResponse { choices: OpenRouterChoice[]; }
export interface OpenRouterKeyInfo {
  data: {
    label: string;
    limit: number | null;
    limit_reset: string | null;
    limit_remaining: number | null;
    include_byok_in_limit: boolean;
    usage: number;
    usage_daily: number;
    usage_weekly: number;
    usage_monthly: number;
    byok_usage: number;
    byok_usage_daily: number;
    byok_usage_weekly: number;
    byok_usage_monthly: number;
    is_free_tier: boolean;
  };
}
