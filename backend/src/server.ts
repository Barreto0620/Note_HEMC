// @ts-nocheck

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import connectDB from './config/db'; // Importa a função de conexão com o banco de dados
import notesRoutes from './routes/notes';     // Importa as rotas de notas
import authRoutes from './routes/auth';       // Importa as rotas de autenticação
import eventRoutes from './routes/events';    // Importa as rotas de eventos

// Carrega variáveis de ambiente do arquivo .env (para desenvolvimento local).
// Deve ser chamado o mais cedo possível no arquivo de entrada principal.
dotenv.config(); 

// Cria a instância da aplicação Express
const app = express();

// Conecta ao banco de dados MongoDB
connectDB();

// Configuração CORS restrita para aceitar apenas o frontend https://note-hemc.vercel.app
const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    const allowedOrigin = 'https://note-hemc.vercel.app';

    // Permite requisições sem origin (ex: Postman, apps mobile)
    if (!origin) return callback(null, true);

    if (origin === allowedOrigin) {
      callback(null, true);
    } else {
      callback(new Error(`CORS - Origem ${origin} não permitida.`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Middlewares essenciais
app.use(express.json({ limit: '10mb' })); // Middleware para analisar corpos de requisição JSON
app.use(cors(corsOptions));               // Habilita o Cross-Origin Resource Sharing com regras restritas
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Permite embeds de diferentes origens
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
})); // Adiciona cabeçalhos HTTP de segurança

// Middleware para log de requisições em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
  });
}

// Definição das rotas da API
app.use('/api/notes', notesRoutes);   // Rotas de notas
app.use('/api/auth', authRoutes);     // Rotas de autenticação
app.use('/api/events', eventRoutes);  // Rotas de eventos

// Rota de Health Check para serviços de deploy verificarem se a aplicação está online
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'UP', 
    message: 'Serviço de Notas Internas está operacional.',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rota para testar CORS
app.get('/api/test-cors', (req, res) => {
  res.status(200).json({ 
    message: 'CORS está funcionando!',
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// Rota raiz para uma mensagem de boas-vindas simples
app.get('/', (req, res) => {
  res.json({
    message: 'API de Notas Internas está online e funcionando!',
    status: 'active',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Middleware para capturar rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    message: `A rota ${req.method} ${req.originalUrl} não existe nesta API`,
    availableRoutes: [
      'GET /',
      'GET /api/health',
      'GET /api/test-cors',
      '/api/auth/*',
      '/api/notes/*',
      '/api/events/*'
    ]
  });
});

// Middleware global de tratamento de erros
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erro capturado:', error);
  
  res.status(error.status || 500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'production' 
      ? 'Algo deu errado. Tente novamente mais tarde.' 
      : error.message,
    timestamp: new Date().toISOString()
  });
});

// Define a porta do servidor, usando a variável de ambiente PORT ou o padrão 5000
const PORT = process.env.PORT || 5000;

// Inicia o servidor Express
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em modo ${process.env.NODE_ENV || 'development'} na porta ${PORT}`);
  console.log(`📡 API disponível em: ${process.env.NODE_ENV === 'production' ? 'https://note-hemc.onrender.com' : `http://localhost:${PORT}`}`);
  console.log(`🔗 Health Check: ${process.env.NODE_ENV === 'production' ? 'https://note-hemc.onrender.com' : `http://localhost:${PORT}`}/api/health`);
  console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});
