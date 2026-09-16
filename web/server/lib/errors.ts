"use strict";

export interface ErrorDetails {
  code?: string;
  field?: string;
  resource?: string;
  resourceId?: string;
  [key: string]: unknown;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: ErrorDetails;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "INTERNAL_ERROR",
    details: ErrorDetails = {}
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): object {
    return {
      success: false,
      message: this.message,
      code: this.code,
      details: this.details,
    };
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, resourceId?: string) {
    super(
      `${resource} not found`,
      404,
      "NOT_FOUND",
      { resource, resourceId }
    );
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string, details: ErrorDetails = {}) {
    super(
      message,
      400,
      "VALIDATION_ERROR",
      { field, ...details }
    );
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED", {});
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(message, 403, "FORBIDDEN", {});
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, resource?: string, details: ErrorDetails = {}) {
    super(
      message,
      409,
      "CONFLICT",
      { resource, ...details }
    );
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Too many requests", retryAfter?: number) {
    super(
      message,
      429,
      "RATE_LIMIT_EXCEEDED",
      { retryAfter }
    );
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export class ProviderError extends AppError {
  constructor(
    message: string,
    providerName: string,
    originalError?: Error,
    details: ErrorDetails = {}
  ) {
    super(
      message,
      502,
      "PROVIDER_ERROR",
      {
        provider: providerName,
        originalMessage: originalError?.message,
        ...details,
      }
    );
    Object.setPrototypeOf(this, ProviderError.prototype);
  }
}

export class PaymentError extends AppError {
  constructor(message: string, details: ErrorDetails = {}) {
    super(message, 402, "PAYMENT_ERROR", details);
    Object.setPrototypeOf(this, PaymentError.prototype);
  }
}
