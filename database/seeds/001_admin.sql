-- =============================================================
-- MediCita — Seed 001: Usuario médico administrador
-- Motor: PostgreSQL
-- Contraseña inicial: Admin2026!  (cambiar en primer login)
-- Hash generado con: require('bcryptjs').hashSync('Admin2026!', 12)
-- =============================================================

-- Usuario médico administrador
INSERT INTO users (id, username, password_hash, role)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'doctor.admin',
    '$2a$12$LqK9mZxVw3R8NpQjH2TdluGvBmCrE4sAoYfX7kWnP5JtOUieSqDhG',
    'doctor'
)
ON CONFLICT (username) DO NOTHING;

-- Slots de ejemplo: lunes a viernes de la primera semana de junio 2026
-- 09:00 a 12:30 cada 30 minutos
INSERT INTO appointment_slots (slot_date, slot_time, status) VALUES
('2026-06-01','09:00:00','available'),('2026-06-01','09:30:00','available'),
('2026-06-01','10:00:00','available'),('2026-06-01','10:30:00','available'),
('2026-06-01','11:00:00','available'),('2026-06-01','11:30:00','available'),
('2026-06-01','12:00:00','available'),('2026-06-01','12:30:00','available'),

('2026-06-02','09:00:00','available'),('2026-06-02','09:30:00','available'),
('2026-06-02','10:00:00','available'),('2026-06-02','10:30:00','available'),
('2026-06-02','11:00:00','available'),('2026-06-02','11:30:00','available'),
('2026-06-02','12:00:00','available'),('2026-06-02','12:30:00','available'),

('2026-06-03','09:00:00','available'),('2026-06-03','09:30:00','available'),
('2026-06-03','10:00:00','available'),('2026-06-03','10:30:00','available'),
('2026-06-03','11:00:00','available'),('2026-06-03','11:30:00','available'),
('2026-06-03','12:00:00','available'),('2026-06-03','12:30:00','available'),

('2026-06-04','09:00:00','available'),('2026-06-04','09:30:00','available'),
('2026-06-04','10:00:00','available'),('2026-06-04','10:30:00','available'),
('2026-06-04','11:00:00','available'),('2026-06-04','11:30:00','available'),
('2026-06-04','12:00:00','available'),('2026-06-04','12:30:00','available'),

('2026-06-05','09:00:00','available'),('2026-06-05','09:30:00','available'),
('2026-06-05','10:00:00','available'),('2026-06-05','10:30:00','available'),
('2026-06-05','11:00:00','available'),('2026-06-05','11:30:00','available'),
('2026-06-05','12:00:00','available'),('2026-06-05','12:30:00','available')
ON CONFLICT (slot_date, slot_time) DO NOTHING;