-- ============================================================
-- Migration 000 : table principale des messages LiveChat
-- Première migration à importer lors d'une installation neuve.
-- ============================================================

CREATE TABLE IF NOT EXISTS messages (
    id INT NOT NULL AUTO_INCREMENT,
    media TEXT NULL,
    texte TEXT NULL,
    userProfilePicture TEXT NULL,
    username VARCHAR(100) NOT NULL,
    dateCrea DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    consumed TINYINT(1) NOT NULL DEFAULT 0,
    consumedAt DATETIME NULL,
    PRIMARY KEY (id),
    KEY pending_messages (consumed, dateCrea, id)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;
