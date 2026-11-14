# FitTrack

Plataforma web para registro e acompanhamento de treinos, metas e medidas corporais.
Projeto final da disciplina **OTES02 – UDESC** · Hellen Figueiredo Ramos e Lize Ana Zabote.

## Como executar (local)

Pré-requisitos: **Node.js 20+** e **MySQL 8** em execução.

```bash
cd fittrack
npm install
cp .env.example .env        # ajuste DB_USER / DB_PASSWORD se necessário
npm run db:reset            # cria o banco, o catálogo e os dados de demonstração
npm start                   # http://localhost:3000
```

| Script | O que faz |
|---|---|
| `npm start` | inicia o servidor na porta `PORT` (padrão 3000) |
| `npm run dev` | inicia com recarregamento automático (`node --watch`) |
| `npm run db:setup` | recria as tabelas e carrega o catálogo (modalidades e exercícios) |
| `npm run db:demo` | carrega os usuários e registros de demonstração |
| `npm run db:reset` | `db:setup` + `db:demo` (volta ao estado inicial da apresentação) |

### Contas de demonstração (senha `fittrack123`)

| Perfil | E-mail | Observação |
|---|---|---|
| Usuário pessoal | ana.souza@email.com | treinos, metas e medidas próprios |
| Administrador | marina.alves@email.com | personal trainer de Bruno, Carla, Diego e Elisa |
| Vinculado | bruno.lima@email.com | plano atribuído pela Marina |
| Vinculado | carla.m@email.com | |
| Vinculado | diego.rocha@email.com | sem treinos na semana |
| Vinculado (inativo) | elisa.p@email.com | login bloqueado (UC03 A2 / RN08) |

## Tecnologias (Tabela 6 do documento)

Node.js + Express · EJS · MySQL 8 (`mysql2`, consultas parametrizadas) · express-session (sessão no MySQL) ·
bcrypt · express-validator · helmet (CSP) · Bootstrap 5.3 + Bootstrap Icons · Chart.js 4.
As bibliotecas de front-end são servidas localmente a partir de `node_modules` (funciona sem internet).

## Arquitetura (RNF08)

```
src/
  routes/        mapa de rotas (index.js) e fábricas de recursos (treinos, metas, medidas)
  controllers/   casos de uso: auth, perfil, painel, treino, meta, medida, admin, publico
  models/        acesso a dados (SQL parametrizado)
  services/      painelService – indicadores do painel
  validators/    cadeias do express-validator
  middlewares/   auth, contexto (dono dos dados), segurança (CSRF, flash)
  utils/         regras de negócio (RN05–RN09), datas, formatação
  views/         EJS: partials + pages
public/          CSS da identidade visual, JS do cliente, ícone
db/              schema.sql e catalogo.sql
scripts/         criação do banco e dados de demonstração
```

O mesmo conjunto de rotas de treinos/metas/medidas atende três contextos (`req.ctx`):
**próprio** (`/treinos`), **administrador agindo por um vinculado** (`/admin/vinculados/:id/treinos`)
e **vinculado em modo leitura** (`/atribuidos/treinos`). Rotas de escrita passam por `permitirEscrita`
e todo registro é conferido contra o dono (`pertence`), devolvendo 403/404 em acessos indevidos.

## Rastreabilidade

| Requisito / caso de uso | Rotas | Arquivos principais |
|---|---|---|
| RF01 · UC01 Criar conta pessoal | `GET/POST /cadastro` | authController, usuarioValidator, auth/acesso.ejs |
| RF02 · UC03 Login / logout | `GET/POST /entrar`, `POST /sair` | authController, middlewares/auth.js |
| UC02 Página inicial | `/`, `/sobre`, `/privacidade`, `/termos` | publicoController, views/publico |
| RF03 · UC04 Editar perfil e senha | `/perfil`, `POST /perfil/senha` | perfilController, auth/perfil.ejs |
| RF04–RF06 · UC06 Treinos | `/treinos`, `/treinos/novo`, `/treinos/:id[/editar\|/excluir\|/realizado]` | treinoController, treinoModel, treinos/*.ejs |
| RF07, RF09 · UC07 Metas | `/metas`, `/metas/nova`, `/metas/:id[/editar\|/cancelar\|/reativar\|/excluir]` | metaController, metaModel, metas/*.ejs |
| RF08 · UC08 Progresso de meta | `POST /metas/:id/progresso` | metaController (RN06) |
| RF10 · UC09 Medidas corporais | `/medidas`, `/medidas/:id[/editar\|/excluir]` | medidaController, medidaModel (IMC) |
| RF11 · UC05 Painel | `/painel` | painelController, painelService, painel*.ejs |
| RF12, RF13 · UC10 Vinculados | `/admin/vinculados`, `/novo`, `/:id/editar`, `/:id/desativar`, `/:id/reativar`, `/:id/senha` | adminController, usuarioModel |
| RF14, RF15 · UC11 Atribuir treinos e metas | `/admin/vinculados/:id/treinos/novo` (com cópia `?copiar=`), `/admin/vinculados/:id/metas/nova` | treinoController, metaController |
| RF16 Acompanhar vinculado | `/admin/vinculados/:id` (ficha) | adminController.ficha, admin/ficha.ejs |
| RF17 · UC12 Consultar atribuídos | `/atribuidos/treinos`, `/atribuidos/metas`, `/atribuidos/medidas` | middlewares/contexto.js (somente leitura) |
| RF18 Troca de senha no 1º acesso | `/primeiro-acesso` | authController, `exigirSenhaDefinitiva` |
| RF19 Excluir a própria conta | `POST /perfil/excluir` | perfilController (exclusão em cascata) |

| Regra | Implementação |
|---|---|
| RN05 data futura ⇒ planejado; só treinos realizados contam nos indicadores | utils/regras.js `statusPorData`, treinoModel, app.js |
| RN06 percentual da meta e conclusão automática em 100% | utils/regras.js `percentualMeta`, metaModel |
| RN07 calorias = MET × último peso × horas | utils/regras.js `caloriasEstimadas` |
| RN08 desativação lógica do vinculado (histórico preservado) | usuarioModel `definirAtivo`, authController |
| RN09 senha ≥ 8 caracteres com letra e número | utils/regras.js `senhaForte`, usuarioValidator |

| Não funcional | Como foi atendido |
|---|---|
| RNF01 Responsividade | mobile first; abaixo de 992 px: barra inferior, menu lateral recolhível e botão flutuante “Registrar treino” |
| RNF02 Segurança | bcrypt (custo 12), sessão HttpOnly/SameSite, regeneração de sessão no login, token CSRF, helmet/CSP, SQL parametrizado |
| RNF03 Privacidade (LGPD) | consentimento registrado no cadastro, política de privacidade, exclusão da conta |
| RNF04/RNF05 Usabilidade e acessibilidade | rótulos em todos os campos, mensagens junto ao campo, foco visível, contraste da paleta pastel, `aria-*` nos gráficos e alertas |
| RNF08 Manutenibilidade | arquitetura em camadas descrita acima |

## Diferenças em relação ao modelo ER do documento

- `usuario.senha_provisoria` (RF18) e `usuario.consentimento_em` (registro do consentimento LGPD) foram adicionados.
- Colunas `criado_em` para auditoria e a tabela `sessions` (sessões de login do express-session).
- O vinculado também tem a página **Minhas medidas** (somente leitura) para atender ao RF17.
- A proteção CSRF é própria (`middlewares/seguranca.js`), pois o pacote `csurf` foi descontinuado.
