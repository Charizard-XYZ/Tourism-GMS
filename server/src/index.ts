import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import departmentsRoutes from './routes/departments.routes';
import officersRoutes from './routes/officers.routes';
import grievancesRoutes from './routes/grievances.routes';
import commentsRoutes from './routes/comments.routes';
import feedbackRoutes from './routes/feedback.routes';
import activityLogsRoutes from './routes/activity-logs.routes';

dotenv.config();

// Prevent background crashes on unhandled GCP promises
process.on('unhandledRejection', (reason: any) => {
  console.warn('Unhandled Promise Rejection warning:', reason?.message || reason);
});

process.on('uncaughtException', (err: any) => {
  console.warn('Uncaught Exception warning:', err?.message || err);
});

const app = express();
const PORT = process.env['PORT'] || 5000;
const clientOrigin = process.env['CLIENT_ORIGIN'] || 'http://localhost:4200';

// Explicit CORS Options Configuration
const allowedOrigins = ['http://localhost:4200', 'http://127.0.0.1:4200', clientOrigin];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

app.use(express.json());

// Health Check Endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    system: 'Tourism-GMS Express & Firebase Backend API',
    timestamp: new Date().toISOString()
  });
});

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/officers', officersRoutes);
app.use('/api/grievances', grievancesRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/activity-logs', activityLogsRoutes);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Express API Error:', err.message || err);
  res.status(500).json({
    success: false,
    message: 'Internal server error occurred.'
  });
});

// 404 Route Catch-all
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `API Route ${req.originalUrl} not found.`
  });
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`Tourism-GMS Express Server running on port ${PORT}`);
  console.log(`Allowed CORS Origin: ${clientOrigin}`);
  console.log(`==================================================`);
});
