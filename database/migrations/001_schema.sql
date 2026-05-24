-- =============================================================
-- MediCita — Migración 001: Esquema inicial
-- Motor: PostgreSQL
-- =============================================================

-- Habilitar la extensión para generar UUIDs nativos de forma segura (si no está activa)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------
-- Tipos ENUM personalizados (PostgreSQL requiere crearlos antes)
-- -------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('patient', 'doctor');
CREATE TYPE patient_sex AS ENUM ('M', 'F', 'O');
CREATE TYPE slot_status AS ENUM ('available', 'booked', 'cancelled');
CREATE TYPE booking_by AS ENUM ('patient', 'doctor');

-- -------------------------------------------------------------
-- users: credenciales de acceso. Contraseña = hash bcryptjs.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            UUID         NOT NULL DEFAULT gen_random_uuid(),
    username      VARCHAR(60)  NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          user_role    NOT NULL,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_users_username UNIQUE (username)
);

-- -------------------------------------------------------------
-- refresh_tokens: tokens de renovación de sesión revocables.
-- Se guarda el hash SHA-256 del token, nunca el token en crudo.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id    UUID         NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP    NOT NULL,
    revoked    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_rt_token_hash UNIQUE (token_hash),
    CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- -------------------------------------------------------------
-- patients: datos demográficos separados de las credenciales.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
    id         UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id    UUID         NOT NULL,
    full_name  VARCHAR(150) NOT NULL,
    address    VARCHAR(300),
    email      VARCHAR(150) NOT NULL,
    phone      VARCHAR(20),
    birth_date DATE         NOT NULL,
    sex        patient_sex  NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_patients_user UNIQUE (user_id),
    CONSTRAINT uq_patients_email UNIQUE (email),
    CONSTRAINT fk_patients_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- -------------------------------------------------------------
-- appointment_slots: horarios de consulta.
-- El control de concurrencia de reservas usa SELECT ... FOR UPDATE.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointment_slots (
    id         UUID         NOT NULL DEFAULT gen_random_uuid(),
    slot_date  DATE         NOT NULL,
    slot_time  TIME         NOT NULL,
    status     slot_status  NOT NULL DEFAULT 'available',
    patient_id UUID         NULL,
    booked_by  booking_by   NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_slot_TIMESTAMP UNIQUE (slot_date, slot_time),
    CONSTRAINT fk_slots_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL
);

-- Índices en PostgreSQL se crean mediante comandos externos a la tabla
CREATE INDEX IF NOT EXISTS idx_slots_date ON appointment_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_slots_patient ON appointment_slots(patient_id);

-- -------------------------------------------------------------
-- clinical_records: historia clínica.
-- Campos sensibles cifrados con AES-256-CBC antes de persistir.
-- Formato almacenado: ivHex:ciphertextBase64
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical_records (
    id                UUID NOT NULL DEFAULT gen_random_uuid(),
    slot_id           UUID NOT NULL,
    patient_id        UUID NOT NULL,
    vital_signs_enc   TEXT NOT NULL,
    diagnosis_enc     TEXT,
    prescriptions_enc TEXT,
    lab_results_enc   TEXT,
    notes_enc         TEXT,
    recorded_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_records_slot UNIQUE (slot_id),
    CONSTRAINT fk_records_slot     FOREIGN KEY (slot_id)     REFERENCES appointment_slots(id),
    CONSTRAINT fk_records_patient FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE INDEX IF NOT EXISTS idx_records_patient ON clinical_records(patient_id);

-- -------------------------------------------------------------
-- notifications: bandeja de avisos por usuario.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id         UUID    NOT NULL DEFAULT gen_random_uuid(),
    user_id    UUID    NOT NULL,
    message    TEXT    NOT NULL,
    is_read    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notif_user_read ON notifications(user_id, is_read);