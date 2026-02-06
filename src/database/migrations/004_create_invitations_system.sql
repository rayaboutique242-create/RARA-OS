-- Migration: Create invitations and join_requests tables
-- Date: 2024-01-15
-- Description: Tables pour le système d'invitations et demandes d'adhésion multi-tenant

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: invitations
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(50) NOT NULL,
    invited_by_user_id UUID NOT NULL,
    invitation_code VARCHAR(12) NOT NULL UNIQUE,
    invitation_token VARCHAR(64) UNIQUE,
    invitation_type VARCHAR(20) DEFAULT 'CODE',
    email VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'VENDEUR',
    store_id UUID,
    status VARCHAR(20) DEFAULT 'PENDING',
    message TEXT,
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    accepted_by_user_id UUID,
    max_uses INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes pour invitations
CREATE INDEX IF NOT EXISTS idx_invitations_tenant_status ON invitations(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_invitations_expires ON invitations(expires_at);

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: join_requests
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(50) NOT NULL,
    user_id UUID NOT NULL,
    requested_role VARCHAR(50) DEFAULT 'VENDEUR',
    status VARCHAR(20) DEFAULT 'PENDING',
    message TEXT,
    reviewed_by_user_id UUID,
    reviewed_at TIMESTAMP,
    rejection_reason TEXT,
    assigned_role VARCHAR(50),
    assigned_store_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes pour join_requests
CREATE INDEX IF NOT EXISTS idx_join_requests_tenant_status ON join_requests(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_join_requests_user ON join_requests(user_id);

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: user_tenants (relation many-to-many entre users et tenants)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    tenant_id VARCHAR(50) NOT NULL,
    role VARCHAR(50) DEFAULT 'VENDEUR',
    store_id UUID,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    is_default BOOLEAN DEFAULT FALSE,
    joined_via VARCHAR(50), -- 'INVITATION', 'JOIN_REQUEST', 'CREATED', 'MIGRATED'
    invitation_id UUID,
    join_request_id UUID,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, tenant_id)
);

-- Indexes pour user_tenants
CREATE INDEX IF NOT EXISTS idx_user_tenants_user ON user_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant ON user_tenants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_status ON user_tenants(status);

-- ════════════════════════════════════════════════════════════════════════════
-- MODIFICATION DE LA TABLE users (si nécessaire)
-- ════════════════════════════════════════════════════════════════════════════
-- Ajouter colonnes manquantes à users si elles n'existent pas
DO $$
BEGIN
    -- Ajouter phone si n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone') THEN
        ALTER TABLE users ADD COLUMN phone VARCHAR(50);
    END IF;
    
    -- Ajouter phone_verified
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone_verified') THEN
        ALTER TABLE users ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Ajouter email_verified
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email_verified') THEN
        ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Ajouter otp_code
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'otp_code') THEN
        ALTER TABLE users ADD COLUMN otp_code VARCHAR(10);
    END IF;
    
    -- Ajouter otp_expires_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'otp_expires_at') THEN
        ALTER TABLE users ADD COLUMN otp_expires_at TIMESTAMP;
    END IF;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- MODIFICATION DE LA TABLE tenants
-- ════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
    -- Ajouter join_code (code public pour rejoindre)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'join_code') THEN
        ALTER TABLE tenants ADD COLUMN join_code VARCHAR(12);
        ALTER TABLE tenants ADD CONSTRAINT uk_tenants_join_code UNIQUE (join_code);
    END IF;
    
    -- Ajouter allow_join_requests
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'allow_join_requests') THEN
        ALTER TABLE tenants ADD COLUMN allow_join_requests BOOLEAN DEFAULT TRUE;
    END IF;
    
    -- Ajouter auto_approve_requests
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'auto_approve_requests') THEN
        ALTER TABLE tenants ADD COLUMN auto_approve_requests BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Ajouter default_role_for_new_members
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'default_role_for_new_members') THEN
        ALTER TABLE tenants ADD COLUMN default_role_for_new_members VARCHAR(50) DEFAULT 'VENDEUR';
    END IF;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- TRIGGER: Auto-update updated_at
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Appliquer le trigger aux nouvelles tables
DROP TRIGGER IF EXISTS update_invitations_updated_at ON invitations;
CREATE TRIGGER update_invitations_updated_at
    BEFORE UPDATE ON invitations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_join_requests_updated_at ON join_requests;
CREATE TRIGGER update_join_requests_updated_at
    BEFORE UPDATE ON join_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_tenants_updated_at ON user_tenants;
CREATE TRIGGER update_user_tenants_updated_at
    BEFORE UPDATE ON user_tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ════════════════════════════════════════════════════════════════════════════
-- RLS (Row Level Security) - Pour isolation des données
-- ════════════════════════════════════════════════════════════════════════════
-- Note: Activez RLS en production avec:
-- ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;
-- Puis créez les policies appropriées
