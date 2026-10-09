export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (msg, details) => new AppError(400, msg, details);
export const notFound = (msg = 'Not found') => new AppError(404, msg);
export const unprocessable = (msg) => new AppError(422, msg);
export const upstream = (msg) => new AppError(502, msg);
