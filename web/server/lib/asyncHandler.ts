"use strict";

import type { Request, Response, NextFunction, RequestHandler } from "express";
import { AppError } from "./errors";
import { logger } from "./logger";

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | Response>;

export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch((error: unknown) => {
      if (error instanceof AppError) {
        logger.warn(`AppError: ${error.message}`, {
          code: error.code,
          statusCode: error.statusCode,
          details: error.details,
          path: req.path,
          method: req.method,
        });
        res.status(error.statusCode).json(error.toJSON());
      } else if (error instanceof Error) {
        logger.error(`Unhandled error: ${error.message}`, {
          stack: error.stack,
          path: req.path,
          method: req.method,
        });
        res.status(500).json({
          success: false,
          message: "Internal server error",
          code: "INTERNAL_ERROR",
        });
      } else {
        logger.error("Unknown error type", { error, path: req.path });
        res.status(500).json({
          success: false,
          message: "Internal server error",
          code: "INTERNAL_ERROR",
        });
      }
    });
  };
}

export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    logger.warn(`AppError: ${err.message}`, {
      code: err.code,
      statusCode: err.statusCode,
      details: err.details,
    });
    res.status(err.statusCode).json(err.toJSON());
  } else {
    logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
}
