-- =============================================================
-- MediCita — Migración 001: Esquema inicial
-- Motor: MySQL 8.0+ / MariaDB 10.6+
-- Cómo ejecutar en PhpMyAdmin:
--   1. Abrir PhpMyAdmin → crear BD "medicita" (utf8mb4_unicode_ci)
--   2. Seleccionar la BD medicita en el panel izquierdo
--   3. Pestaña "SQL" → pegar este archivo completo → Ejecutar
-- =============================================================

USE medicita;

-- -------------------------------------------------------------
-- users: credenciales de acceso. Contraseña = hash bcryptjs.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            CHAR(36)     NOT NULL DEFAULT (UUID()),
    username      VARCHAR(60)  NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('patient','doctor') NOT NULL,
    is_active     TINYINT(1)   NOT NULL DEFAULT 1,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- refresh_tokens: tokens de renovación de sesión revocables.
-- Se guarda el hash SHA-256 del token, nunca el token en crudo.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         CHAR(36)     NOT NULL DEFAULT (UUID()),
    user_id    CHAR(36)     NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME     NOT NULL,
    revoked    TINYINT(1)   NOT NULL DEFAULT 0,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_rt_token_hash (token_hash),
    CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- patients: datos demográficos separados de las credenciales.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
    id         CHAR(36)     NOT NULL DEFAULT (UUID()),
    user_id    CHAR(36)     NOT NULL,
    full_name  VARCHAR(150) NOT NULL,
    address    VARCHAR(300),
    email      VARCHAR(150) NOT NULL,
    phone      VARCHAR(20),
    birth_date DATE         NOT NULL,
    sex        ENUM('M','F','O') NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_patients_user  (user_id),
    UNIQUE KEY uq_patients_email (email),
    CONSTRAINT fk_patients_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- appointment_slots: horarios de consulta.
-- El control de concurrencia de reservas usa SELECT ... FOR UPDATE.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointment_slots (
    id         CHAR(36)     NOT NULL DEFAULT (UUID()),
    slot_date  DATE         NOT NULL,
    slot_time  TIME         NOT NULL,
    status     ENUM('available','booked','cancelled') NOT NULL DEFAULT 'available',
    patient_id CHAR(36)     NULL,
    booked_by  ENUM('patient','doctor') NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_slot_datetime (slot_date, slot_time),
    KEY idx_slots_date    (slot_date),
    KEY idx_slots_patient (patient_id),
    CONSTRAINT fk_slots_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- clinical_records: historia clínica.
-- Campos sensibles cifrados con AES-256-CBC antes de persistir.
-- Formato almacenado: ivHex:ciphertextBase64
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical_records (
    id                CHAR(36) NOT NULL DEFAULT (UUID()),
    slot_id           CHAR(36) NOT NULL,
    patient_id        CHAR(36) NOT NULL,
    vital_signs_enc   TEXT     NOT NULL,
    diagnosis_enc     TEXT,
    prescriptions_enc TEXT,
    lab_results_enc   TEXT,
    notes_enc         TEXT,
    recorded_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_records_slot (slot_id),
    KEY idx_records_patient (patient_id),
    CONSTRAINT fk_records_slot    FOREIGN KEY (slot_id)    REFERENCES appointment_slots(id),
    CONSTRAINT fk_records_patient FOREIGN KEY (patient_id) REFERENCES patients(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- notifications: bandeja de avisos por usuario.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id         CHAR(36)   NOT NULL DEFAULT (UUID()),
    user_id    CHAR(36)   NOT NULL,
    message    TEXT       NOT NULL,
    is_read    TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_notif_user_read (user_id, is_read),
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
