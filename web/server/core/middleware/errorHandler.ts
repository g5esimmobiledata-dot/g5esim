"use strict";

import { Request, Response, NextFunction } from 'express';
import { AppError, isAppError, isOperationalError } from '../errors';

/**
 * Global error handling middleware
 * Handles all errors passed to next() and returns consistent JSON responses
 * Implements CodeCanyon requirements for proper error handling
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error for debugging
  console.error(`[Error] ${req.method} ${req.path}:`, {
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
  });

  // If it's our custom AppError, use its properties
  if (isAppError(err)) {
    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        statusCode: 400,
      },
    });
    return;
  }

  if (err.name === 'UnauthorizedError' || err.message.includes('jwt')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        statusCode: 401,
      },
    });
    return;
  }

  // Handle syntax errors (malformed JSON)
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Invalid JSON in request body',
        statusCode: 400,
      },
    });
    return;
  }

  // Default to 500 Internal Server Error for unknown errors
  // Don't expose internal error details in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction ? 'An unexpected error occurred' : err.message,
      statusCode: 500,
      ...(isProduction ? {} : { stack: err.stack }),
    },
  });
}

/**
 * 404 Not Found handler for unmatched routes
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      statusCode: 404,
    },
  });
}

/**
 * Async handler wrapper to catch errors in async route handlers
 * Passes errors to the error handling middleware
 */
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Handle uncaught exceptions and unhandled rejections
 * Should be called once during app initialization
 */
export function setupGlobalErrorHandlers(): void {
  process.on('uncaughtException', (error: Error) => {
    console.error('[FATAL] Uncaught Exception:', error);
    
    // Only exit for non-operational errors
    if (!isOperationalError(error)) {
      console.error('Non-operational error - shutting down...');
      process.exit(1);
    }
  });

  process.on('unhandledRejection', (reason: unknown) => {
    console.error('[FATAL] Unhandled Rejection:', reason);
    
    // Convert to error and check if operational
    const error = reason instanceof Error ? reason : new Error(String(reason));
    if (!isOperationalError(error)) {
      console.error('Non-operational rejection - shutting down...');
      process.exit(1);
    }
  });
}
