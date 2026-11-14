// UC02 – Visualizar página inicial e demais páginas públicas (RC09)
function inicio(req, res) {
  res.render('pages/publico/inicio', { titulo: 'Seu progresso, em cada treino', contaExcluida: req.query.conta === 'excluida' });
}
function sobre(req, res) { res.render('pages/publico/sobre', { titulo: 'Sobre / Contato' }); }
function privacidade(req, res) { res.render('pages/publico/privacidade', { titulo: 'Política de privacidade' }); }
function termos(req, res) { res.render('pages/publico/termos', { titulo: 'Termos de uso' }); }

module.exports = { inicio, sobre, privacidade, termos };
