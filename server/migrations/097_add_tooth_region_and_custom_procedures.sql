-- Migration 097: Adicionar suporte para dente/região e procedimentos personalizados

-- 1. Adicionar campo tooth_region aos procedimentos do plano
ALTER TABLE plan_procedures
  ADD COLUMN IF NOT EXISTS tooth_region VARCHAR(50);

-- 2. Adicionar campos para procedimentos customizados em procedure_base_table
ALTER TABLE procedure_base_table
  ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by_user_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 3. Criar índice para buscar procedimentos customizados por clínica
CREATE INDEX IF NOT EXISTS idx_procedure_base_table_clinic_custom
  ON procedure_base_table(clinic_id, is_custom)
  WHERE is_custom = true;

-- 4. Comentários nas colunas
COMMENT ON COLUMN plan_procedures.tooth_region IS 'Dente ou região específica onde o procedimento será aplicado (ex: 16, 11-21, Superior direito)';
COMMENT ON COLUMN procedure_base_table.is_custom IS 'Indica se o procedimento foi criado manualmente pelo usuário';
COMMENT ON COLUMN procedure_base_table.created_by_user_id IS 'ID do usuário que criou o procedimento customizado';
