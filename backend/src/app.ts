import cors from 'cors';
import express from 'express';

import { routes } from './routes/index.js';

const app = express();

app.use(cors({
  origin: "*", // Libera geral para testarmos e garantir que o login passe
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}))

console.log(process.env.FRONTEND_URL)

app.use(express.json());

app.use(routes);

export { app }