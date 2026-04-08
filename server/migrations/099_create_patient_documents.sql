-- Migration 099: Create patient_documents table
-- Creates table for patient documents (medical records, exams, images, etc.)

-- Tabela de Documentos dos Pacientes
CREATE TABLE IF NOT EXISTS patient_documents (
  id VARCHAR(255) PRIMARY KEY,
  patient_id VARCHAR(255) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100),
  document_type VARCHAR(50), -- 'medical_record', 'exam', 'image', 'consent', 'other'
  description TEXT,
  uploaded_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(patient_id, filename)
);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_patient_documents_patient_id ON patient_documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_documents_type ON patient_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_patient_documents_uploaded_at ON patient_documents(uploaded_at);
