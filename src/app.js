// Configuração da aplicação Express (camadas: rotas → controladores → modelos → visões).
const path = require('path');
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const helmet = require('helmet');

const routes = require('./routes');
const { carregarUsuario } = require('./middlewares/auth');
const { csrf, flash } = require('./middlewares/seguranca');
const datas = require('./utils/datas');
const formato = require('./utils/formato');

const app = express();
const producao = process.env.NODE_ENV === 'production';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.disable('x-powered-by');
if (producao) app.set('trust proxy', 1);

// Cabeçalhos de segurança (RNF02). Scripts só do próprio servidor; fontes do Google Fonts.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      upgradeInsecureRequests: producao ? [] : null,
    },
  },
}));

// Arquivos estáticos: CSS/JS próprios e bibliotecas servidas localmente (funciona sem internet)
const nm = path.join(__dirname, '..', 'node_modules');
app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: producao ? '7d' : 0 }));
app.use('/vendor/bootstrap', express.static(path.join(nm, 'bootstrap', 'dist')));
app.use('/vendor/bootstrap-icons', express.static(path.join(nm, 'bootstrap-icons', 'font')));
app.use('/vendor/chart.js', express.static(path.join(nm, 'chart.js', 'dist')));

app.use(express.urlencoded({ extended: true, limit: '200kb' }));

// Sessão de login com cookie HttpOnly (RNF02), armazenada no MySQL
app.use(session({
  name: 'fittrack.sid',
  secret: process.env.SESSION_SECRET || 'dev-secret-troque',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  store: new MySQLStore({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'fittrack',
    createDatabaseTable: true,
    clearExpired: true,
  }),
  cookie: { httpOnly: true, sameSite: 'lax', secure: producao, maxAge: 24 * 60 * 60 * 1000 },
}));

app.use(flash);
app.use(csrf);
app.use(carregarUsuario);

// Auxiliares disponíveis em todas as visões
app.use((req, res, next) => {
  res.locals.d = datas;
  res.locals.f = formato;
  res.locals.caminho = req.path;
  res.locals.ctx = null;
  res.locals.titulo = 'FitTrack';
  next();
});

app.use(routes);

// 404
app.use((req, res) => {
  res.status(404).render('pages/erros/erro', {
    titulo: 'Página não encontrada', status: 404, mensagem: 'O endereço acessado não existe.',
  });
});

// 500
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('pages/erros/erro', {
    titulo: 'Algo deu errado', status: 500,
    mensagem: 'Ocorreu um erro inesperado. Tente novamente em instantes.',
  });
});

module.exports = app;
