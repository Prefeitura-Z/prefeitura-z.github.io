-- Extensão de Depois da Queda: instalação aditiva em D1.
CREATE TABLE IF NOT EXISTS game_class_tickets (
  id TEXT PRIMARY KEY,
  discord_id TEXT NOT NULL,
  criado INTEGER NOT NULL,
  usado INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS ticket_pendente ON game_class_tickets(discord_id) WHERE usado IS NULL;
CREATE INDEX IF NOT EXISTS audit_alvo_data ON admin_audit(alvo, criado);
CREATE INDEX IF NOT EXISTS audit_acao_data ON admin_audit(acao, criado);
