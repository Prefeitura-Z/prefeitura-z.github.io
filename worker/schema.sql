CREATE TABLE IF NOT EXISTS users (
  discord_id TEXT PRIMARY KEY,
  nome TEXT,
  avatar TEXT,
  login TEXT,
  saldo INTEGER,
  saldo_em INTEGER,
  criado INTEGER
);
CREATE INDEX IF NOT EXISTS users_login ON users(login);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  discord_id TEXT NOT NULL,
  expira INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS link_codes (
  code TEXT PRIMARY KEY,
  discord_id TEXT NOT NULL,
  expira INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  discord_id TEXT NOT NULL,
  login TEXT NOT NULL,
  listing_id TEXT NOT NULL,
  item TEXT,
  preco INTEGER,
  status TEXT NOT NULL,
  motivo TEXT,
  criado INTEGER NOT NULL,
  atualizado INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS orders_user ON orders(discord_id, criado);
CREATE INDEX IF NOT EXISTS orders_status ON orders(status);

-- Prefeitura Z: Depois da Queda (jogo do site)
CREATE TABLE IF NOT EXISTS game_accounts (
  discord_id TEXT PRIMARY KEY,
  estado TEXT NOT NULL,
  criado INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS characters (
  discord_id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  aparencia TEXT NOT NULL,
  origem TEXT NOT NULL,
  nivel INTEGER NOT NULL,
  xp INTEGER NOT NULL,
  flags TEXT NOT NULL,
  versao INTEGER NOT NULL,
  criado INTEGER NOT NULL,
  atualizado INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS role_assignments (
  id TEXT PRIMARY KEY,
  discord_id TEXT NOT NULL,
  papel TEXT NOT NULL,
  autor TEXT NOT NULL,
  motivo TEXT,
  criado INTEGER NOT NULL,
  expira INTEGER,
  revogado_em INTEGER,
  revogado_por TEXT
);
CREATE INDEX IF NOT EXISTS roles_conta ON role_assignments(discord_id, revogado_em);
CREATE TABLE IF NOT EXISTS admin_audit (
  id TEXT PRIMARY KEY,
  ator TEXT NOT NULL,
  alvo TEXT,
  acao TEXT NOT NULL,
  motivo TEXT,
  antes TEXT,
  depois TEXT,
  criado INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_data ON admin_audit(criado);
