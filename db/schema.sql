-- =====================================================================
-- FitTrack – esquema físico do banco de dados (MySQL 8)
-- Implementa o modelo entidade-relacionamento
-- =====================================================================

DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS progresso_meta;
DROP TABLE IF EXISTS meta;
DROP TABLE IF EXISTS treino_exercicio;
DROP TABLE IF EXISTS treino;
DROP TABLE IF EXISTS exercicio;
DROP TABLE IF EXISTS modalidade;
DROP TABLE IF EXISTS medida_corporal;
DROP TABLE IF EXISTS usuario;

-- ---------------------------------------------------------------------
-- usuario: herança em tabela única (PESSOAL, ADMINISTRADOR, VINCULADO)
-- autorrelacionamento "administra" por id_administrador (RN02)
-- ---------------------------------------------------------------------
CREATE TABLE usuario (
  id_usuario        INT AUTO_INCREMENT PRIMARY KEY,
  nome              VARCHAR(100) NOT NULL,
  email             VARCHAR(120) NOT NULL,
  senha_hash        VARCHAR(255) NOT NULL,
  data_nascimento   DATE NULL,
  sexo              CHAR(1) NULL,
  altura_cm         SMALLINT NULL,
  tipo_perfil       ENUM('PESSOAL','ADMINISTRADOR','VINCULADO') NOT NULL DEFAULT 'PESSOAL',
  id_administrador  INT NULL,
  ativo             BOOLEAN NOT NULL DEFAULT TRUE,
  senha_provisoria  BOOLEAN NOT NULL DEFAULT FALSE,
  consentimento_em  DATETIME NULL,
  criado_em         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_usuario_email UNIQUE (email),
  CONSTRAINT fk_usuario_admin FOREIGN KEY (id_administrador)
    REFERENCES usuario (id_usuario) ON DELETE RESTRICT,
  CONSTRAINT ck_usuario_vinculo CHECK ((tipo_perfil = 'VINCULADO') = (id_administrador IS NOT NULL)),
  CONSTRAINT ck_usuario_sexo CHECK (sexo IS NULL OR sexo IN ('F','M','O')),
  CONSTRAINT ck_usuario_altura CHECK (altura_cm IS NULL OR altura_cm BETWEEN 50 AND 260)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX ix_usuario_admin ON usuario (id_administrador);

-- ---------------------------------------------------------------------
-- Catálogo pré-carregado: modalidade e exercicio
-- ---------------------------------------------------------------------
CREATE TABLE modalidade (
  id_modalidade  INT AUTO_INCREMENT PRIMARY KEY,
  nome           VARCHAR(60) NOT NULL,
  categoria      ENUM('FORCA','AEROBICO','FLEXIBILIDADE','MISTO') NOT NULL,
  met            DECIMAL(4,1) NOT NULL,
  CONSTRAINT uk_modalidade_nome UNIQUE (nome),
  CONSTRAINT ck_modalidade_met CHECK (met > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE exercicio (
  id_exercicio    INT AUTO_INCREMENT PRIMARY KEY,
  id_modalidade   INT NOT NULL,
  nome            VARCHAR(80) NOT NULL,
  grupo_muscular  VARCHAR(40) NULL,
  descricao       TEXT NULL,
  CONSTRAINT fk_exercicio_modalidade FOREIGN KEY (id_modalidade)
    REFERENCES modalidade (id_modalidade) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- treino: id_usuario = dono do registro; id_criador = quem lançou
-- ---------------------------------------------------------------------
CREATE TABLE treino (
  id_treino           INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario          INT NOT NULL,
  id_criador          INT NOT NULL,
  id_modalidade       INT NOT NULL,
  titulo              VARCHAR(100) NOT NULL,
  data_treino         DATE NOT NULL,
  duracao_min         SMALLINT NOT NULL,
  intensidade         ENUM('LEVE','MODERADA','VIGOROSA') NOT NULL,
  calorias_estimadas  SMALLINT NULL,
  status              ENUM('PLANEJADO','REALIZADO') NOT NULL,
  observacoes         TEXT NULL,
  criado_em           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_treino_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuario (id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_treino_criador FOREIGN KEY (id_criador)
    REFERENCES usuario (id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_treino_modalidade FOREIGN KEY (id_modalidade)
    REFERENCES modalidade (id_modalidade) ON DELETE RESTRICT,
  CONSTRAINT ck_treino_duracao CHECK (duracao_min > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX ix_treino_usuario_data ON treino (id_usuario, data_treino);

-- ---------------------------------------------------------------------
-- treino_exercicio: tabela associativa treino N:N exercicio
-- ---------------------------------------------------------------------
CREATE TABLE treino_exercicio (
  id_treino_exercicio  INT AUTO_INCREMENT PRIMARY KEY,
  id_treino            INT NOT NULL,
  id_exercicio         INT NOT NULL,
  ordem                TINYINT NOT NULL,
  series               TINYINT NULL,
  repeticoes           TINYINT NULL,
  carga_kg             DECIMAL(6,2) NULL,
  distancia_km         DECIMAL(6,2) NULL,
  tempo_seg            INT NULL,
  CONSTRAINT uk_treino_ordem UNIQUE (id_treino, ordem),
  CONSTRAINT fk_te_treino FOREIGN KEY (id_treino)
    REFERENCES treino (id_treino) ON DELETE CASCADE,
  CONSTRAINT fk_te_exercicio FOREIGN KEY (id_exercicio)
    REFERENCES exercicio (id_exercicio) ON DELETE RESTRICT,
  CONSTRAINT ck_te_valores CHECK (
    (series IS NULL OR series >= 0) AND (repeticoes IS NULL OR repeticoes >= 0) AND
    (carga_kg IS NULL OR carga_kg >= 0) AND (distancia_km IS NULL OR distancia_km >= 0) AND
    (tempo_seg IS NULL OR tempo_seg >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- meta e progresso_meta
-- ---------------------------------------------------------------------
CREATE TABLE meta (
  id_meta        INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario     INT NOT NULL,
  id_criador     INT NOT NULL,
  titulo         VARCHAR(100) NOT NULL,
  tipo           ENUM('PESO','FREQUENCIA','DISTANCIA','CARGA','TEMPO','PERSONALIZADA') NOT NULL,
  valor_inicial  DECIMAL(8,2) NOT NULL,
  valor_alvo     DECIMAL(8,2) NOT NULL,
  unidade        VARCHAR(20) NOT NULL,
  data_inicio    DATE NOT NULL,
  data_limite    DATE NOT NULL,
  status         ENUM('ATIVA','CONCLUIDA','CANCELADA') NOT NULL DEFAULT 'ATIVA',
  criado_em      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_meta_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuario (id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_meta_criador FOREIGN KEY (id_criador)
    REFERENCES usuario (id_usuario) ON DELETE CASCADE,
  CONSTRAINT ck_meta_datas CHECK (data_limite >= data_inicio),
  CONSTRAINT ck_meta_valores CHECK (valor_alvo <> valor_inicial)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX ix_meta_usuario_status ON meta (id_usuario, status);

CREATE TABLE progresso_meta (
  id_progresso   INT AUTO_INCREMENT PRIMARY KEY,
  id_meta        INT NOT NULL,
  data_registro  DATE NOT NULL,
  valor          DECIMAL(8,2) NOT NULL,
  observacao     VARCHAR(255) NULL,
  criado_em      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_progresso_meta FOREIGN KEY (id_meta)
    REFERENCES meta (id_meta) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- medida_corporal: o IMC é calculado na aplicação (peso_kg e altura_cm)
-- ---------------------------------------------------------------------
CREATE TABLE medida_corporal (
  id_medida           INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario          INT NOT NULL,
  data_medicao        DATE NOT NULL,
  peso_kg             DECIMAL(5,2) NOT NULL,
  percentual_gordura  DECIMAL(4,1) NULL,
  cintura_cm          DECIMAL(5,1) NULL,
  observacao          VARCHAR(255) NULL,
  CONSTRAINT fk_medida_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuario (id_usuario) ON DELETE CASCADE,
  CONSTRAINT ck_medida_peso CHECK (peso_kg > 0),
  CONSTRAINT ck_medida_gordura CHECK (percentual_gordura IS NULL OR percentual_gordura BETWEEN 1 AND 70)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX ix_medida_usuario_data ON medida_corporal (id_usuario, data_medicao);

-- ---------------------------------------------------------------------
-- sessions: armazenamento das sessões de login (express-mysql-session)
-- ---------------------------------------------------------------------
CREATE TABLE sessions (
  session_id  VARCHAR(128) COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
  expires     INT UNSIGNED NOT NULL,
  data        MEDIUMTEXT COLLATE utf8mb4_bin
) ENGINE=InnoDB;
