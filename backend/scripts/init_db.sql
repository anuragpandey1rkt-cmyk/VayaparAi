-- VyaparAI Database Initialization Script
-- Runs once when PostgreSQL container first starts

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- for ILIKE optimization
