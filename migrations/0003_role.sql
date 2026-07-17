-- migrations/0003_role.sql

ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
