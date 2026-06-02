require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/offers', require('./routes/offers'));
app.use('/api/bundles', require('./routes/bundles'));
app.use('/api/videos', require('./routes/videos'));
app.use('/api/metrics', require('./routes/metrics'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/workers',            require('./routes/workers'));
app.use('/api/proxies',            require('./routes/proxies'));
app.use('/api/assignment-center', require('./routes/assignment-center'));
app.use('/api/result-uploads',   require('./routes/result-uploads'));
app.use('/api/workspace', require('./routes/workspace'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Research Engine
app.use('/api/research/ideas',       require('./routes/research/ideas'));
app.use('/api/research/patterns',    require('./routes/research/patterns'));
app.use('/api/research/hypotheses',  require('./routes/research/hypotheses'));
app.use('/api/research/experiments', require('./routes/research/experiments'));
app.use('/api/research/results',     require('./routes/research/results'));
app.use('/api/research/winners',     require('./routes/research/winners'));

app.get('/api/health', (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;

async function start() {
  // Run schema migrations
  const fs = require('fs');
  const path = require('path');
  const schema = fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8');
  await db.query(schema);
  console.log('Schema applied');

  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
