"use strict";

import { Response } from 'express';

/**
 * Standard API Response structure
 * All API responses follow this format for consistency
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

/**
 * HTTP Status Codes with descriptions
 */
export const HttpStatus = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  
  // Redirection
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,
  
  // Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  
  // Server Errors
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Send a success response
 * @param res Express response object
 * @param data Response data
 * @param message Success message
 * @param statusCode HTTP status code (default: 200)
 */
export function sendSuccess<T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode: number = HttpStatus.OK
): Response {
  const response: ApiResponse<T> = {
    success: true,
    ...(message && { message }),
    ...(data !== undefined && { data }),
  };
  return res.status(statusCode).json(response);
}

/**
 * Send a paginated success response
 * @param res Express response object
 * @param data Response data array
 * @param pagination Pagination info
 * @param message Success message
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: { page: number; limit: number; total: number },
  message?: string
): Response {
  const response: ApiResponse<T[]> = {
    success: true,
    ...(message && { message }),
    data,
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
  };
  return res.status(HttpStatus.OK).json(response);
}

/**
 * Send a created response (201)
 * @param res Express response object
 * @param data Created resource data
 * @param message Success message
 */
export function sendCreated<T>(
  res: Response,
  data?: T,
  message: string = 'Resource created successfully'
): Response {
  return sendSuccess(res, data, message, HttpStatus.CREATED);
}

/**
 * Send a no content response (204)
 * @param res Express response object
 */
export function sendNoContent(res: Response): Response {
  return res.status(HttpStatus.NO_CONTENT).send();
}

/**
 * Send an error response
 * @param res Express response object
 * @param message Error message
 * @param statusCode HTTP status code (default: 500)
 * @param code Error code
 * @param details Additional error details
 */
export function sendError(
  res: Response,
  message: string,
  statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
  code?: string,
  details?: Record<string, unknown>
): Response {
  const response = {
    success: false,
    error: {
      code: code || 'ERROR',
      message,
      statusCode,
      ...(details && { details }),
    },
  };
  return res.status(statusCode).json(response);
}

/**
 * Send a bad request error (400)
 */
export function sendBadRequest(
  res: Response,
  message: string = 'Bad request',
  details?: Record<string, unknown>
): Response {
  return sendError(res, message, HttpStatus.BAD_REQUEST, 'BAD_REQUEST', details);
}

/**
 * Send an unauthorized error (401)
 */
export function sendUnauthorized(
  res: Response,
  message: string = 'Authentication required'
): Response {
  return sendError(res, message, HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED');
}

/**
 * Send a forbidden error (403)
 */
export function sendForbidden(
  res: Response,
  message: string = 'Access denied'
): Response {
  return sendError(res, message, HttpStatus.FORBIDDEN, 'FORBIDDEN');
}

/**
 * Send a not found error (404)
 */
export function sendNotFound(
  res: Response,
  message: string = 'Resource not found'
): Response {
  return sendError(res, message, HttpStatus.NOT_FOUND, 'NOT_FOUND');
}

/**
 * Send a conflict error (409)
 */
export function sendConflict(
  res: Response,
  message: string = 'Resource conflict'
): Response {
  return sendError(res, message, HttpStatus.CONFLICT, 'CONFLICT');
}

/**
 * Send a rate limit error (429)
 */
export function sendRateLimited(
  res: Response,
  message: string = 'Too many requests',
  retryAfter?: number
): Response {
  if (retryAfter) {
    res.setHeader('Retry-After', retryAfter);
  }
  return sendError(res, message, HttpStatus.TOO_MANY_REQUESTS, 'RATE_LIMITED', { retryAfter });
}
