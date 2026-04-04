-- Migration 003: Enforce secure admin password
-- Previous migrations might have run with "admin123". This ensures the final password is set.
-- Password: "HaventtZohir030584@@" -> SHA-256

UPDATE users 
SET password_hash = '5b12f2e8a325d9dbe26572b3f218abf000e49f27b794c15a3f2d0f0bd87f65b1' 
WHERE email = 'zohir.kh@gmail.com';

INSERT INTO migrations (version) VALUES ('003');
