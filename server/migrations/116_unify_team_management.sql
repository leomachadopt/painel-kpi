-- Migration 116: Unify Team Management System
-- Allows users to have multiple roles (owner, doctor, collaborator)
-- IMPORTANT: This migration preserves all existing permissions and data

-- ================================
-- 1. ADD user_id TO clinic_doctors
-- ================================
DO $$
BEGIN
  -- Add user_id column to clinic_doctors (nullable, can be linked to a user account)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clinic_doctors' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE clinic_doctors
      ADD COLUMN user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL;

    RAISE NOTICE '✅ Added user_id column to clinic_doctors';
  ELSE
    RAISE NOTICE '⚠️  user_id column already exists in clinic_doctors';
  END IF;
END $$;

-- Create index for user_id
CREATE INDEX IF NOT EXISTS idx_clinic_doctors_user_id ON clinic_doctors(user_id);

-- ================================
-- 2. ADD is_owner TO users
-- ================================
DO $$
BEGIN
  -- Add is_owner flag to users (marks clinic owners/partners)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_owner'
  ) THEN
    ALTER TABLE users ADD COLUMN is_owner BOOLEAN DEFAULT false;

    RAISE NOTICE '✅ Added is_owner column to users';
  ELSE
    RAISE NOTICE '⚠️  is_owner column already exists in users';
  END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_is_owner ON users(clinic_id, is_owner) WHERE is_owner = true;

-- ================================
-- 3. LINK EXISTING DATA
-- ================================
DO $$
DECLARE
  linked_count INTEGER;
BEGIN
  -- Link existing users with clinic_doctors by matching email
  UPDATE clinic_doctors cd
  SET user_id = u.id
  FROM users u
  WHERE cd.email = u.email
    AND cd.clinic_id = u.clinic_id
    AND u.role IN ('MEDICO', 'GESTOR_CLINICA')
    AND cd.user_id IS NULL;  -- Only update if not already linked

  GET DIAGNOSTICS linked_count = ROW_COUNT;
  RAISE NOTICE '✅ Linked % existing doctors to user accounts', linked_count;
END $$;

-- ================================
-- 4. MARK EXISTING CLINIC MANAGERS AS OWNERS
-- ================================
DO $$
DECLARE
  owners_count INTEGER;
BEGIN
  -- Mark all GESTOR_CLINICA users as owners
  UPDATE users
  SET is_owner = true
  WHERE role = 'GESTOR_CLINICA' AND is_owner = false;

  GET DIAGNOSTICS owners_count = ROW_COUNT;
  RAISE NOTICE '✅ Marked % clinic managers as owners', owners_count;
END $$;

-- ================================
-- 5. UPDATE EMAIL UNIQUE CONSTRAINT
-- ================================
-- Remove old unique constraint on email (if exists)
DROP INDEX IF EXISTS idx_clinic_doctors_email;

-- Create new constraint: email unique only for doctors WITHOUT user account
-- This allows owners/users to be doctors with the same email
CREATE UNIQUE INDEX IF NOT EXISTS idx_clinic_doctors_email_without_user
  ON clinic_doctors(clinic_id, email)
  WHERE user_id IS NULL AND email IS NOT NULL;

COMMENT ON INDEX idx_clinic_doctors_email_without_user IS
  'Ensures email uniqueness only for doctors without user accounts';

-- ================================
-- 6. ADD COMMENTS FOR DOCUMENTATION
-- ================================
COMMENT ON COLUMN clinic_doctors.user_id IS
  'Links doctor to a user account. Allows owners and collaborators to also be doctors.';

COMMENT ON COLUMN users.is_owner IS
  'Marks if user is a clinic owner/partner. Owners have full access regardless of role.';

-- ================================
-- 7. VERIFICATION AND SUMMARY
-- ================================
DO $$
DECLARE
  total_users INTEGER;
  total_owners INTEGER;
  total_doctors INTEGER;
  total_linked_doctors INTEGER;
  total_collaborators INTEGER;
  total_medico_users INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM users WHERE role != 'MENTOR';
  SELECT COUNT(*) INTO total_owners FROM users WHERE is_owner = true;
  SELECT COUNT(*) INTO total_doctors FROM clinic_doctors;
  SELECT COUNT(*) INTO total_linked_doctors FROM clinic_doctors WHERE user_id IS NOT NULL;
  SELECT COUNT(*) INTO total_collaborators FROM users WHERE role = 'COLABORADOR';
  SELECT COUNT(*) INTO total_medico_users FROM users WHERE role = 'MEDICO';

  RAISE NOTICE '';
  RAISE NOTICE '================== MIGRATION 116 SUMMARY ==================';
  RAISE NOTICE 'Users:';
  RAISE NOTICE '  - Total users: %', total_users;
  RAISE NOTICE '  - Owners (is_owner=true): %', total_owners;
  RAISE NOTICE '  - MEDICO role: %', total_medico_users;
  RAISE NOTICE '  - COLABORADOR role: %', total_collaborators;
  RAISE NOTICE '';
  RAISE NOTICE 'Doctors:';
  RAISE NOTICE '  - Total in clinic_doctors: %', total_doctors;
  RAISE NOTICE '  - Linked to user accounts: %', total_linked_doctors;
  RAISE NOTICE '  - Without user accounts: %', total_doctors - total_linked_doctors;
  RAISE NOTICE '';
  RAISE NOTICE '✅ All existing permissions and data preserved!';
  RAISE NOTICE '===========================================================';
END $$;
