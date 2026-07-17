-- migrations/0002_saved.sql

CREATE TABLE IF NOT EXISTS saved_movies (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movie_id   TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, movie_id)
);
