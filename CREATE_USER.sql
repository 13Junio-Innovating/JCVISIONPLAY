-- Comando para criar usuário manualmente no DBeaver
-- Rode este comando conectado ao banco 'jvisiondb'

-- 1. Se já existir o usuário, remove para evitar duplicidade
DELETE FROM app_users WHERE email = 'willianlacerda277@gmail.com';

-- 2. Insere o usuário com a senha '123456'
INSERT INTO app_users (id, email, password_hash, full_name, created_at) 
VALUES (
    UUID(), 
    'willianlacerda277@gmail.com', 
    '$2b$10$4hdhacxWOUS63XB9lt4e2.CbMH0K.HemjOVkAvBScsMozM9BYDuEe', 
    'Willian',
    NOW()
);
