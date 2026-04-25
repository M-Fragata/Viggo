import { app } from './app.js';

const PORT = process.env.PORT || 3333;

app.use((err: any, req: any, res: any, next: any) => {
  console.error("=== ERRO NO SERVIDOR ===");
  console.error(err); 
  res.status(500).json({ 
    message: "Erro interno capturado no middleware global",
    error: err.message 
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});