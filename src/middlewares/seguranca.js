const crypto = require('crypto');

function csrf(req, res, next) {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  res.locals.csrfToken = req.session.csrfToken;
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const enviado = Buffer.from(String((req.body && req.body._csrf) || req.get('x-csrf-token') || ''));
  const esperado = Buffer.from(req.session.csrfToken);
  const ok = enviado.length === esperado.length && crypto.timingSafeEqual(enviado, esperado);
  if (!ok) {
    if (['/entrar', '/cadastro'].includes(req.path)) {
      req.session.flash = [{ tipo: 'erro', msg: 'A página ficou aberta por muito tempo. Tente novamente.' }];
      return res.redirect(req.path);
    }
    return res.status(403).render('pages/erros/erro', {
      titulo: 'Sessão expirada', status: 403,
      mensagem: 'O formulário expirou ou veio de outra origem. Volte, recarregue a página e tente de novo.',
    });
  }
  return next();
}

function flash(req, res, next) {
  req.flash = (tipo, msg) => {
    req.session.flash = req.session.flash || [];
    req.session.flash.push({ tipo, msg });
  };
  res.locals.flash = req.session.flash || [];
  delete req.session.flash;
  return next();
}

module.exports = { csrf, flash };
