import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// API Routes
app.use('/api', apiRoutes);

import { checkSupabaseHealth } from './config/supabase.js';
import { aiService } from './services/ai.service.js';

// Health check
app.get('/health', async (req, res) => {
  const supabaseHealth = await checkSupabaseHealth();
  const aiStatus = aiService.getAIStatus();

  res.json({
    status: 'healthy',
    product: 'MailPilot — AI Email Inbox Triage & Draft Assistant',
    timestamp: new Date().toISOString(),
    supabase: {
      status: supabaseHealth.available ? 'connected' : 'error_or_fallback',
      available: supabaseHealth.available,
      ...(supabaseHealth.error ? { error: supabaseHealth.error } : {})
    },
    ai: {
      provider: aiStatus.provider,
      model: aiStatus.model,
      configured: aiStatus.configured
    }
  });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 MailPilot Server running on http://localhost:${PORT}`);
  console.log(`⚡ API Endpoints mounted at http://localhost:${PORT}/api`);
  console.log(`=======================================================`);
});
