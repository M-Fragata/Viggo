import cors from 'cors';
import express from 'express';

import { routes } from './routes/index.js';

const app = express();
app.use(express.json());

app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(routes);

export { app }