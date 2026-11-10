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
