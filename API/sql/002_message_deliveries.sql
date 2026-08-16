-- ============================================================
-- Migration 002 : une réception indépendante par utilisateur
-- À exécuter une seule fois dans phpMyAdmin avec un compte administrateur.
-- ============================================================

-- InnoDB est nécessaire pour relier proprement les tables entre elles.
-- Cette conversion conserve les messages déjà présents.
ALTER TABLE messages ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS message_deliveries (
    message_id INT NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    consumed_at DATETIME NULL,
    PRIMARY KEY (message_id, user_id),
    KEY pending_messages_by_user (user_id, consumed_at, message_id),
    CONSTRAINT deliveries_message_fk
        FOREIGN KEY (message_id) REFERENCES messages(id)
        ON DELETE CASCADE,
    CONSTRAINT deliveries_user_fk
        FOREIGN KEY (user_id) REFERENCES app_users(id)
        ON DELETE CASCADE
) ENGINE = InnoDB;

-- Les messages encore en attente avant la migration sont attribués aux
-- utilisateurs actuellement autorisés. INSERT IGNORE permet de rejouer
-- cette migration sans créer de doublons.
INSERT IGNORE INTO message_deliveries (message_id, user_id)
SELECT messages.id, users.id
FROM messages
INNER JOIN app_users AS users ON users.status = 'active'
WHERE messages.consumed = 0;
