-- ============================================================
-- Migration 001 : comptes, appareils et connexions Discord
-- À exécuter une seule fois dans phpMyAdmin avec un compte administrateur.
-- ============================================================

CREATE TABLE IF NOT EXISTS app_users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    discord_id VARCHAR(32) NOT NULL,
    discord_username VARCHAR(100) NOT NULL,
    discord_avatar_url VARCHAR(4096) NULL,
    role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
    status ENUM('pending', 'active', 'rejected', 'blocked')
        NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY unique_discord_user (discord_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS app_devices (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL,
    device_name VARCHAR(120) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME NULL,
    revoked_at DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY unique_device_token (token_hash),
    KEY devices_by_user (user_id),
    CONSTRAINT app_devices_user_fk
        FOREIGN KEY (user_id) REFERENCES app_users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS oauth_login_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    state_hash CHAR(64) NOT NULL,
    device_name VARCHAR(120) NOT NULL,
    user_id INT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    claimed_at DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY unique_oauth_state (state_hash),
    KEY oauth_session_user (user_id),
    CONSTRAINT oauth_session_user_fk
        FOREIGN KEY (user_id) REFERENCES app_users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;
