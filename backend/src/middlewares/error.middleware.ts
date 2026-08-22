import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  const requestId = req.requestId || 'unknown';

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      request_id: requestId,
    });
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Dados de entrada inválidos.',
      errors: err.flatten().fieldErrors,
      request_id: requestId,
    });
  }

  console.error(`[ERROR] [${requestId}] ${err.message}`, err.stack);

  return res.status(500).json({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Ocorreu um erro interno no servidor. Tente novamente mais tarde.',
    request_id: requestId,
  });
}
