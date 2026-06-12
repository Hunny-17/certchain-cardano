import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Each mint takes ~30-60s on Cardano, so 10/60s is very generous for legitimate use.
export const mintRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  prefix: "certchain:mint",
  analytics: true,
});

// IPFS uploads are fast; 20/60s prevents bulk abuse while allowing normal workflow.
export const uploadRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "60 s"),
  prefix: "certchain:ipfs",
  analytics: true,
});
