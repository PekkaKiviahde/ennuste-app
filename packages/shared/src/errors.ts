export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(message: string, code = "APP_ERROR", status = 400, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class AuthError extends AppError {
  constructor(message = "Ei oikeuksia") {
    super(message, "AUTH_ERROR", 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Ei oikeuksia toimintaan") {
    super(message, "FORBIDDEN", 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Ei loydetty") {
    super(message, "NOT_FOUND", 404);
  }
}
