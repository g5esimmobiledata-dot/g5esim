"use strict";

/**
 * Base Application Error
 * All custom errors extend this class for consistent error handling
 * Implements CodeCanyon requirements for proper Error objects
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date();

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON for API responses
   */
  toJSON(): Record<string, unknown> {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

/**
 * Validation Error - 400 Bad Request
 * Used for invalid input data
 */
export class ValidationError extends AppError {
  public readonly fields?: Record<string, string>;

  constructor(
    message: string = 'Validation failed',
    fields?: Record<string, string>,
    details?: Record<string, unknown>
  ) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
    this.fields = fields;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      ...(this.fields && { fields: this.fields }),
    };
  }
}

/**
 * Not Found Error - 404
 * Used when a requested resource doesn't exist
 */
export class NotFoundError extends AppError {
  public readonly resource?: string;

  constructor(message: string = 'Resource not found', resource?: string) {
    super(message, 404, 'NOT_FOUND', true, resource ? { resource } : undefined);
    this.resource = resource;
  }
}

/**
 * Unauthorized Error - 401
 * Used when authentication is required but not provided or invalid
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED', true);
  }
}

/**
 * Forbidden Error - 403
 * Used when user is authenticated but lacks permission
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'FORBIDDEN', true);
  }
}

/**
 * Conflict Error - 409
 * Used for duplicate resources or conflicting operations
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', details?: Record<string, unknown>) {
    super(message, 409, 'CONFLICT', true, details);
  }
}

/**
 * Rate Limit Error - 429
 * Used when request limit is exceeded
 */
export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', true, retryAfter ? { retryAfter } : undefined);
    this.retryAfter = retryAfter;
  }
}

/**
 * Provider Error - 502/503
 * Used for external provider API failures
 */
export class ProviderError extends AppError {
  public readonly provider: string;
  public readonly providerCode?: string;

  constructor(
    message: string,
    provider: string,
    providerCode?: string,
    statusCode: number = 502
  ) {
    super(message, statusCode, 'PROVIDER_ERROR', true, { provider, providerCode });
    this.provider = provider;
    this.providerCode = providerCode;
  }
}

/**
 * Payment Error - 402
 * Used for payment processing failures
 */
export class PaymentError extends AppError {
  public readonly paymentProvider?: string;
  public readonly paymentCode?: string;

  constructor(
    message: string = 'Payment failed',
    paymentProvider?: string,
    paymentCode?: string
  ) {
    super(message, 402, 'PAYMENT_ERROR', true, { paymentProvider, paymentCode });
    this.paymentProvider = paymentProvider;
    this.paymentCode = paymentCode;
  }
}

/**
 * Service Unavailable Error - 503
 * Used when a service is temporarily unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE', true);
  }
}

/**
 * Helper function to wrap lower-level errors
 * Implements CodeCanyon requirement: "If you pass a lower-level error to your caller, consider wrapping it"
 */
export function wrapError(
  originalError: Error,
  message: string,
  statusCode: number = 500,
  code: string = 'WRAPPED_ERROR'
): AppError {
  const wrappedError = new AppError(message, statusCode, code, true, {
    originalMessage: originalError.message,
    originalName: originalError.name,
  });
  wrappedError.stack = `${wrappedError.stack}\nCaused by: ${originalError.stack}`;
  return wrappedError;
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if an error is operational (expected)
 */
export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}
