import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';

export function authorizeRoles(...allowedRoles: Array<'admin' | 'officer' | 'tourist'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Unauthenticated user request.'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to ${allowedRoles.join(', ')} accounts only.`
      });
      return;
    }

    next();
  };
}
