-- =============================================================
-- Migración 002: Agregar doctor_id a appointment_slots
-- Objetivo: Sincronizar slots con el doctor que los crea
-- =============================================================

-- Agregar columna doctor_id a appointment_slots
ALTER TABLE appointment_slots 
ADD COLUMN doctor_id UUID NULL,
ADD CONSTRAINT fk_slots_doctor FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE SET NULL;

-- Crear índice para consultas rápidas por doctor
CREATE INDEX IF NOT EXISTS idx_slots_doctor ON appointment_slots(doctor_id);

-- Actualizar slots existentes (si los hay) al doctor admin
-- Si tienes un usuario 'doctor.admin' en tu BD, descomenta la siguiente línea:
-- UPDATE appointment_slots SET doctor_id = (SELECT id FROM users WHERE username = 'doctor.admin') WHERE doctor_id IS NULL;
