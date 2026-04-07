-- Migration 093: Add MEDICO role and reorganize permissions
-- Part 1: Add new MEDICO role

-- ================================
-- 1. ADD MEDICO ROLE
-- ================================
DO $$
BEGIN
  -- Drop existing constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_role_check;
  END IF;

  -- Add new constraint with MEDICO role
  ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('MENTOR', 'GESTOR_CLINICA', 'MEDICO', 'COLABORADOR'));

  RAISE NOTICE '✅ Added MEDICO role to users table';
END $$;

-- ================================
-- 2. MAKE EMAIL REQUIRED IN clinic_doctors
-- ================================
DO $$
BEGIN
  -- First, create fictitious emails for doctors without email
  UPDATE clinic_doctors
  SET email = LOWER(REPLACE(REPLACE(REPLACE(name, ' ', '.'), 'Dr. ', ''), 'Dra. ', '')) || '@dentalkpi.com'
  WHERE email IS NULL OR email = '';

  RAISE NOTICE '✅ Created fictitious emails for doctors without email';

  -- Make email NOT NULL
  ALTER TABLE clinic_doctors ALTER COLUMN email SET NOT NULL;

  RAISE NOTICE '✅ Made email required in clinic_doctors';
END $$;

-- ================================
-- 3. MIGRATE EXISTING USERS TO MEDICO ROLE
-- ================================
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Identify doctors (collaborators with email in clinic_doctors)
  UPDATE users u
  SET role = 'MEDICO'
  FROM clinic_doctors cd
  WHERE u.role = 'COLABORADOR'
    AND u.email = cd.email
    AND u.clinic_id = cd.clinic_id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Migrated % users from COLABORADOR to MEDICO', updated_count;
END $$;

-- ================================
-- 4. APPLY DEFAULT PERMISSIONS FOR MEDICOS
-- ================================
DO $$
BEGIN
  -- Insert default permissions for all MEDICO users
  INSERT INTO user_permissions (
    id,
    user_id,
    clinic_id,
    can_edit_consultations,
    can_view_reports,
    can_edit_patients,
    can_view_all_doctors_consultations
  )
  SELECT
    'perm-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text || u.id), 1, 9),
    u.id,
    u.clinic_id,
    true,  -- can edit their consultations
    true,  -- can view reports
    true,  -- can edit patients
    COALESCE(up.can_view_all_doctors_consultations, false)  -- keep if already set
  FROM users u
  LEFT JOIN user_permissions up ON u.id = up.user_id
  WHERE u.role = 'MEDICO'
  ON CONFLICT (user_id, clinic_id) DO UPDATE
  SET can_edit_consultations = true,
      can_view_reports = true,
      can_edit_patients = true;

  RAISE NOTICE '✅ Applied default permissions for MEDICO users';
END $$;

-- ================================
-- 5. CREATE INDEX FOR BETTER PERFORMANCE
-- ================================
CREATE INDEX IF NOT EXISTS idx_users_role_clinic
  ON users(role, clinic_id)
  WHERE role IN ('MEDICO', 'COLABORADOR');

-- ================================
-- 6. SUMMARY
-- ================================
DO $$
DECLARE
  total_users INTEGER;
  medicos INTEGER;
  colaboradores INTEGER;
  gestores INTEGER;
  doctors_with_email INTEGER;
  doctors_total INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM users WHERE role != 'MENTOR';
  SELECT COUNT(*) INTO medicos FROM users WHERE role = 'MEDICO';
  SELECT COUNT(*) INTO colaboradores FROM users WHERE role = 'COLABORADOR';
  SELECT COUNT(*) INTO gestores FROM users WHERE role = 'GESTOR_CLINICA';
  SELECT COUNT(*) INTO doctors_total FROM clinic_doctors;
  SELECT COUNT(*) INTO doctors_with_email FROM clinic_doctors WHERE email IS NOT NULL;

  RAISE NOTICE '';
  RAISE NOTICE '================== MIGRATION SUMMARY ==================';
  RAISE NOTICE 'Users by role:';
  RAISE NOTICE '  - GESTOR_CLINICA: %', gestores;
  RAISE NOTICE '  - MEDICO: %', medicos;
  RAISE NOTICE '  - COLABORADOR: %', colaboradores;
  RAISE NOTICE '  Total (excluding MENTOR): %', total_users;
  RAISE NOTICE '';
  RAISE NOTICE 'Doctors:';
  RAISE NOTICE '  - Total: %', doctors_total;
  RAISE NOTICE '  - With email: %', doctors_with_email;
  RAISE NOTICE '=======================================================';
END $$;
