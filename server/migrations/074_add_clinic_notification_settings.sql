-- Configurações de relatórios automáticos por clínica
-- SEM api_key — a chave é global (ver system_settings)
ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS kommo_contact_id    VARCHAR(255),
  ADD COLUMN IF NOT EXISTS owner_whatsapp      VARCHAR(50),
  ADD COLUMN IF NOT EXISTS n8n_reports_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS n8n_report_time     VARCHAR(5) NOT NULL DEFAULT '08:30';

COMMENT ON COLUMN clinics.kommo_contact_id    IS 'ID do contacto do dono no Kommo CRM';
COMMENT ON COLUMN clinics.owner_whatsapp      IS 'WhatsApp do dono (+351XXXXXXXXX)';
COMMENT ON COLUMN clinics.n8n_reports_enabled IS 'Relatórios automáticos activos';
COMMENT ON COLUMN clinics.n8n_report_time     IS 'Hora do relatório diário (HH:MM)';
