"use strict";

import { Response } from "express";

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function success<T>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = 200
): Response {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
  };
  return res.status(statusCode).json(response);
}

export function successWithPagination<T>(
  res: Response,
  message: string,
  data: T,
  pagination: { page: number; limit: number; total: number },
  statusCode: number = 200
): Response {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    pagination: {
      ...pagination,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
  };
  return res.status(statusCode).json(response);
}

export function error(
  res: Response,
  message: string,
  statusCode: number = 500,
  errors?: any[]
): Response {
  const response: ApiResponse = {
    success: false,
    message,
    errors,
  };
  return res.status(statusCode).json(response);
}

export function created<T>(res: Response, message: string, data?: T): Response {
  return success(res, message, data, 201);
}

export function noContent(res: Response): Response {
  return res.status(204).send();
}

export function badRequest(res: Response, message: string, errors?: any[]): Response {
  return error(res, message, 400, errors);
}

export function unauthorized(res: Response, message: string = "Unauthorized"): Response {
  return error(res, message, 401);
}

export function forbidden(res: Response, message: string = "Forbidden"): Response {
  return error(res, message, 403);
}

export function notFound(res: Response, message: string = "Resource not found"): Response {
  return error(res, message, 404);
}

export function conflict(res: Response, message: string): Response {
  return error(res, message, 409);
}

export function tooManyRequests(res: Response, message: string = "Too many requests"): Response {
  return error(res, message, 429);
}

export function serverError(res: Response, message: string = "Internal server error"): Response {
  return error(res, message, 500);
}
