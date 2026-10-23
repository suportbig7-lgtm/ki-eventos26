import express from 'express';
import dotenv from 'dotenv';
import { apiRouter } from '../server/apiRouter';

dotenv.config();

const app = express();
app.use(express.json());

// Handle both /api/... prefixes and direct paths when invoked by Vercel serverless
app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;
