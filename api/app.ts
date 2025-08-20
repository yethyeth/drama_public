/**
 * This is a API server
 */

import express, { type Request, type Response, type NextFunction, type Application }  from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { initDatabase } from './database/index.ts';
import authRoutes from './routes/auth.ts';
import crawlerRoutes from './routes/crawler.ts';
import rankingsRoutes from './routes/rankings.ts';
import dramaRoutes from './routes/drama.ts';
import celebritiesRoutes from './routes/celebrities.ts';
import dashboardRoutes from './routes/dashboard.ts';
import testDataRoutes from './routes/test-data.ts';
import dataRoutes from './routes/data.ts';
import configRoutes from './routes/config.ts';
import cleanupRoutes from './routes/cleanup.ts';
import crawlerDebugRoutes from './routes/crawler-debug.ts';
import selectorDebugRoutes from './routes/selector-debug.ts';
import testCrawlerRoutes from './routes/test-crawler.ts';

// for esm mode
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// load env
dotenv.config();

// 初始化数据库
initDatabase().catch(console.error);

const app: Application = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * API Routes
 */
app.use('/api/auth', authRoutes);
app.use('/api/crawler', crawlerRoutes);
app.use('/api/rankings', rankingsRoutes);
app.use('/api/drama', dramaRoutes);
app.use('/api/celebrities', celebritiesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/test-data', testDataRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/config', configRoutes);
app.use('/api/cleanup', cleanupRoutes);
app.use('/api/crawler-debug', crawlerDebugRoutes);
app.use('/api/selector-debug', selectorDebugRoutes);
app.use('/api/test-crawler', testCrawlerRoutes);

/**
 * health
 */
app.use('/api/health', (req: Request, res: Response, next: NextFunction): void => {
  res.status(200).json({
    success: true,
    message: 'ok'
  });
});

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error'
  });
});

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found'
  });
});

export default app;