require('dotenv').config({ quiet: true });
const app = require('./app');
const db = require('./config/db');

const PORT = Number(process.env.PORT || 3000);

db.query('SELECT 1')
  .then(() => {
    app.listen(PORT, () => console.log(`FitTrack rodando em http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Não foi possível conectar ao MySQL:', err.message);
    console.error('Confira o arquivo .env e rode "npm run db:setup".');
    process.exit(1);
  });
