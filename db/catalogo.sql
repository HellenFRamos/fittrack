-- =====================================================================
-- FitTrack – carga do catálogo de modalidades e exercícios (RC04)
-- Valores de MET segundo o Compendium of Physical Activities
-- [Ainsworth et al. 2011], conforme a Tabela 5 do projeto.
-- =====================================================================

INSERT INTO modalidade (id_modalidade, nome, categoria, met) VALUES
  (1, 'Musculação',  'FORCA',         5.0),
  (2, 'Corrida',     'AEROBICO',      9.8),
  (3, 'Caminhada',   'AEROBICO',      3.5),
  (4, 'Ciclismo',    'AEROBICO',      7.5),
  (5, 'Natação',     'AEROBICO',      6.0),
  (6, 'Funcional',   'MISTO',         8.0),
  (7, 'Yoga',        'FLEXIBILIDADE', 2.5),
  (8, 'Pilates',     'FLEXIBILIDADE', 3.0);

INSERT INTO exercicio (id_modalidade, nome, grupo_muscular, descricao) VALUES
  -- Musculação
  (1, 'Agachamento livre',       'Pernas',    'Agachamento com barra apoiada nos ombros.'),
  (1, 'Leg press 45°',           'Pernas',    'Empurrar a plataforma inclinada com os pés.'),
  (1, 'Cadeira extensora',       'Pernas',    'Extensão de joelhos na máquina.'),
  (1, 'Mesa flexora',            'Pernas',    'Flexão de joelhos deitado na máquina.'),
  (1, 'Panturrilha em pé',       'Pernas',    'Elevação dos calcanhares em pé.'),
  (1, 'Supino reto',             'Peito',     'Empurrar a barra deitado no banco reto.'),
  (1, 'Supino inclinado',        'Peito',     'Supino com o banco inclinado.'),
  (1, 'Puxada frontal',          'Costas',    'Puxar a barra até a altura do peito.'),
  (1, 'Remada baixa',            'Costas',    'Remada sentada no cabo.'),
  (1, 'Desenvolvimento',         'Ombros',    'Empurrar halteres ou barra acima da cabeça.'),
  (1, 'Elevação lateral',        'Ombros',    'Elevação lateral dos braços com halteres.'),
  (1, 'Rosca direta',            'Bíceps',    'Flexão dos cotovelos com barra.'),
  (1, 'Tríceps na polia',        'Tríceps',   'Extensão dos cotovelos no cabo.'),
  (1, 'Levantamento terra',      'Posterior', 'Levantar a barra do chão mantendo a coluna neutra.'),
  -- Corrida
  (2, 'Corrida contínua',        'Cardio',    'Corrida em ritmo constante.'),
  (2, 'Intervalado na esteira',  'Cardio',    'Alternância de tiros e recuperação.'),
  (2, 'Corrida em subida',       'Cardio',    'Corrida em aclive.'),
  -- Caminhada
  (3, 'Caminhada leve',          'Cardio',    'Caminhada em ritmo confortável.'),
  (3, 'Caminhada rápida',        'Cardio',    'Caminhada em ritmo acelerado.'),
  -- Ciclismo
  (4, 'Pedal na rua',            'Cardio',    'Ciclismo ao ar livre.'),
  (4, 'Bicicleta ergométrica',   'Cardio',    'Ciclismo em bicicleta estacionária.'),
  -- Natação
  (5, 'Nado crawl',              'Corpo todo','Estilo livre.'),
  (5, 'Nado costas',             'Corpo todo','Nado de costas.'),
  (5, 'Nado peito',              'Corpo todo','Estilo peito.'),
  -- Funcional
  (6, 'Burpee',                  'Corpo todo','Agachamento, prancha, flexão e salto.'),
  (6, 'Prancha',                 'Core',      'Isometria em apoio nos antebraços.'),
  (6, 'Kettlebell swing',        'Posterior', 'Balanço do kettlebell com extensão de quadril.'),
  (6, 'Polichinelo',             'Cardio',    'Saltos abrindo e fechando braços e pernas.'),
  (6, 'Afundo',                  'Pernas',    'Passada à frente alternando as pernas.'),
  -- Yoga
  (7, 'Saudação ao sol',         'Corpo todo','Sequência de posturas encadeadas.'),
  (7, 'Postura do guerreiro',    'Pernas',    'Postura de força e equilíbrio.'),
  -- Pilates
  (8, 'Hundred',                 'Core',      'Respiração com bombeamento dos braços.'),
  (8, 'Roll up',                 'Core',      'Enrolar e desenrolar a coluna.');
