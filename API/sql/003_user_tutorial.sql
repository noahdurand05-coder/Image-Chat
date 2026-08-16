-- ============================================================
-- Migration 003 : tutoriel propre à chaque compte
-- À exécuter une seule fois dans phpMyAdmin.
-- ============================================================

-- Une date vide signifie que l'utilisateur doit encore voir le tutoriel.
ALTER TABLE app_users
    ADD COLUMN tutorial_completed_at DATETIME NULL AFTER updated_at;

-- Les comptes présents avant cette migration sont d'anciens utilisateurs :
-- on considère donc que leur tutoriel est déjà terminé.
UPDATE app_users
SET tutorial_completed_at = NOW()
WHERE tutorial_completed_at IS NULL;

-- Les futurs comptes auront automatiquement une valeur NULL et verront ainsi
-- le tutoriel lors de leur première connexion approuvée.
