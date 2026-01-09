-- ==========================================================
-- SCRIPT FINAL (COMPATIBILIDADE MÁXIMA - SEM JSON)
-- ==========================================================

USE jvisiondb;

-- 1. Limpeza
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS error_logs;
DROP TABLE IF EXISTS user_activity_logs;
DROP TABLE IF EXISTS screens;
DROP TABLE IF EXISTS playlists;
DROP TABLE IF EXISTS media;
DROP TABLE IF EXISTS app_users;
DROP TABLE IF EXISTS teste_simples;
SET FOREIGN_KEY_CHECKS = 1;

-- 2. Criação das Tabelas (Usando LONGTEXT no lugar de JSON)

CREATE TABLE app_users (
    id VARCHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE media (
    id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    duration INT DEFAULT 10,
    rotation INT DEFAULT 0,
    uploaded_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE playlists (
    id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    items LONGTEXT, -- Mudado de JSON para LONGTEXT para compatibilidade
    created_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE screens (
    id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    player_key VARCHAR(255) NOT NULL,
    assigned_playlist VARCHAR(36),
    created_by VARCHAR(36),
    last_seen TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY (player_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE user_activity_logs (
    id INT AUTO_INCREMENT,
    user_id VARCHAR(36),
    action VARCHAR(255) NOT NULL,
    resource VARCHAR(255),
    resource_id VARCHAR(255),
    details LONGTEXT, -- Mudado de JSON para LONGTEXT
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE error_logs (
    id INT AUTO_INCREMENT,
    user_id VARCHAR(36),
    error_type VARCHAR(255) NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    url TEXT,
    user_agent TEXT,
    ip_address VARCHAR(45),
    context LONGTEXT, -- Mudado de JSON para LONGTEXT
    severity VARCHAR(50) DEFAULT 'medium',
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- 3. Criar Ligações (Foreign Keys)

ALTER TABLE media 
ADD CONSTRAINT fk_media_user FOREIGN KEY (uploaded_by) REFERENCES app_users(id) ON DELETE SET NULL;

ALTER TABLE playlists 
ADD CONSTRAINT fk_playlists_user FOREIGN KEY (created_by) REFERENCES app_users(id) ON DELETE SET NULL;

ALTER TABLE screens 
ADD CONSTRAINT fk_screens_playlist FOREIGN KEY (assigned_playlist) REFERENCES playlists(id) ON DELETE SET NULL;

ALTER TABLE screens 
ADD CONSTRAINT fk_screens_user FOREIGN KEY (created_by) REFERENCES app_users(id) ON DELETE SET NULL;

ALTER TABLE user_activity_logs 
ADD CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE SET NULL;

ALTER TABLE error_logs 
ADD CONSTRAINT fk_error_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE SET NULL;

-- 4. Inserir Usuário Admin (Teste Final)
INSERT INTO app_users (id, email, password_hash, full_name) 
VALUES ('admin-id', 'admin@jvision.com.br', '$2b$10$TesteHash', 'Admin JVision');

-- 5. Listar tabelas para confirmar
SHOW TABLES;
