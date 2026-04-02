-- Configurações globais do sistema — geridas apenas pelo MENTOR
CREATE TABLE IF NOT EXISTS system_settings (
  key        VARCHAR(255) PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed: criar a chave n8n vazia por omissão
INSERT INTO system_settings (key, value)
VALUES ('n8n_api_key_hash', NULL)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE system_settings IS
  'Configurações globais — apenas o MENTOR tem acesso de escrita.';
COMMENT ON COLUMN system_settings.value IS
  'Chaves sensíveis são guardadas como hash bcrypt, nunca em plaintext.';
