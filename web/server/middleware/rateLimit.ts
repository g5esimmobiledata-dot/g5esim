"use strict";

import type { Request, Response, NextFunction } from "express";
import { tooManyRequests } from "../utils/response";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const stores: Map<string, RateLimitStore> = new Map();

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
}

export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (req) => req.ip || req.socket.remoteAddress || "unknown",
    message = "Too many requests, please try again later",
  } = options;

  const storeName = `${windowMs}-${maxRequests}`;
  if (!stores.has(storeName)) {
    stores.set(storeName, {});
  }
  const store = stores.get(storeName)!;

  setInterval(() => {
    const now = Date.now();
    for (const key in store) {
      if (store[key].resetTime < now) {
        delete store[key];
      }
    }
  }, windowMs);

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();

    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
      next();
      return;
    }

    store[key].count++;

    if (store[key].count > maxRequests) {
      const retryAfter = Math.ceil((store[key].resetTime - now) / 1000);
      res.setHeader("Retry-After", retryAfter.toString());
      res.setHeader("X-RateLimit-Limit", maxRequests.toString());
      res.setHeader("X-RateLimit-Remaining", "0");
      res.setHeader("X-RateLimit-Reset", store[key].resetTime.toString());
      tooManyRequests(res, message);
      return;
    }

    res.setHeader("X-RateLimit-Limit", maxRequests.toString());
    res.setHeader("X-RateLimit-Remaining", (maxRequests - store[key].count).toString());
    res.setHeader("X-RateLimit-Reset", store[key].resetTime.toString());
    next();
  };
}

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 100,
  message: "Too many API requests, please try again in a minute",
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: "Too many authentication attempts, please try again in 15 minutes",
});

export const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 5,
  message: "Rate limit exceeded, please try again later",
});
