import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error: any) {
      if (error instanceof ZodError) {
        const formattedErrors: Record<string, string> = {};
        const issues = (error as any).issues || (error as any).errors || [];
        issues.forEach((err: any) => {
          const path = Array.isArray(err.path) ? err.path.join('.') : 'field';
          formattedErrors[path || 'field'] = err.message;
        });

        const errorMessages = Object.values(formattedErrors);
        const primaryMessage = errorMessages.length > 0 ? errorMessages.join('. ') : 'Validation failed';

        console.warn(`[VALIDATION 400] ${req.method} ${req.originalUrl} failed:`, formattedErrors);

        res.status(400).json({
          success: false,
          message: primaryMessage,
          errors: formattedErrors
        });
        return;
      }

      console.warn(`[VALIDATION 400] ${req.method} ${req.originalUrl} invalid payload:`, error?.message || error);
      res.status(400).json({
        success: false,
        message: 'Invalid request payload'
      });
    }
  };
}
