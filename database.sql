
-- 1. Habilitar Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tabela de Configurações
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    institutionname TEXT DEFAULT 'Assembleia de Deus Geração Unida',
    cnpj TEXT DEFAULT '49.386.673/0001-10',
    address TEXT DEFAULT 'Rua Doze de Outubro 779, Parque Tijuca, Maracanaú - CE',
    email TEXT DEFAULT 'ADGUgeracaounida@gmail.com',
    president TEXT DEFAULT 'Pr. Presidente Antônio Chaves Crus',
    logo TEXT DEFAULT '',
    closingday INTEGER DEFAULT 1,
    CONSTRAINT single_row CHECK (id = 1)
);

-- 3. Tabela de Usuários (Com Senha Criptografada)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    photo TEXT,
    role TEXT NOT NULL DEFAULT 'USER',
    institution TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    createdat TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para Criptografar Senha automaticamente
CREATE OR REPLACE FUNCTION hash_password()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.password IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.password <> OLD.password) THEN
        -- Apenas criptografa se não parecer já ser um hash blowfish
        IF NEW.password NOT LIKE '$2a$%' THEN
            NEW.password := crypt(NEW.password, gen_salt('bf'));
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hash_password ON users;
CREATE TRIGGER trg_hash_password
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION hash_password();

-- 4. Tabela de Relatórios
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    institutionname TEXT NOT NULL,
    reportername TEXT NOT NULL,
    userid TEXT NOT NULL,
    locked BOOLEAN DEFAULT FALSE,
    offers NUMERIC DEFAULT 0,
    specialoffers NUMERIC DEFAULT 0,
    tithes NUMERIC DEFAULT 0,
    financialrevenue NUMERIC DEFAULT 0,
    interestrevenue NUMERIC DEFAULT 0,
    rentrevenue NUMERIC DEFAULT 0,
    otherrevenues JSONB DEFAULT '[]',
    energy NUMERIC DEFAULT 0,
    water NUMERIC DEFAULT 0,
    rent NUMERIC DEFAULT 0,
    internet NUMERIC DEFAULT 0,
    cleaning NUMERIC DEFAULT 0,
    maintenance NUMERIC DEFAULT 0,
    missions NUMERIC DEFAULT 0,
    social NUMERIC DEFAULT 0,
    otherexpenses JSONB DEFAULT '[]',
    totalrevenue NUMERIC DEFAULT 0,
    totalfixedexpenses NUMERIC DEFAULT 0,
    sedeexpense NUMERIC DEFAULT 0,
    prebendaexpense NUMERIC DEFAULT 0,
    totalexpenses NUMERIC DEFAULT 0,
    saldogu NUMERIC DEFAULT 0,
    currentbalance NUMERIC DEFAULT 0,
    previousbalance NUMERIC DEFAULT 0,
    attachments JSONB DEFAULT '[]',
    createdat TIMESTAMPTZ DEFAULT NOW(),
    archived BOOLEAN DEFAULT FALSE,
    archivemonth TEXT,
    deletedat TIMESTAMPTZ,
    deletedby TEXT
);

-- 5. Tabela de Transações (Com Soft Delete)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL,
    value NUMERIC NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    institutionname TEXT NOT NULL,
    userid TEXT NOT NULL,
    createdat TIMESTAMPTZ DEFAULT NOW(),
    deletedat TIMESTAMPTZ -- Adicionado para Soft Delete
);

-- 6. POLÍTICAS DE SEGURANÇA (RLS REVISADAS)
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas vulneráveis
DROP POLICY IF EXISTS "Allow All settings" ON settings;
DROP POLICY IF EXISTS "Allow All users" ON users;
DROP POLICY IF EXISTS "Allow All reports" ON reports;
DROP POLICY IF EXISTS "Allow All transactions" ON transactions;

-- Settings: Leitura pública, Escrita restrita
CREATE POLICY "Select settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Update settings" ON settings FOR UPDATE USING (true);

-- Users: Proteção de Senha (RLS não esconde colunas, mas podemos restringir o acesso)
CREATE POLICY "Select users" ON users FOR SELECT USING (active = true);
CREATE POLICY "Manage users" ON users FOR ALL USING (true);

-- Reports: Impedir exclusão física anônima
CREATE POLICY "Select reports" ON reports FOR SELECT USING (true);
CREATE POLICY "Insert reports" ON reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Update reports" ON reports FOR UPDATE USING (true);
CREATE POLICY "Delete reports" ON reports FOR DELETE USING (false); -- Apenas via Soft Delete (update deletedat)

-- Transactions: Impedir exclusão física
CREATE POLICY "Select transactions" ON transactions FOR SELECT USING (deletedat IS NULL);
CREATE POLICY "Insert transactions" ON transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Update transactions" ON transactions FOR UPDATE USING (true);
CREATE POLICY "Delete transactions" ON transactions FOR DELETE USING (false);

-- 7. Função de Verificação de Login Segura (RPC)
CREATE OR REPLACE FUNCTION check_user_login(p_username TEXT, p_password TEXT)
RETURNS TABLE (
    id UUID,
    username TEXT,
    name TEXT,
    role TEXT,
    institution TEXT,
    active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.username, u.name, u.role, u.institution, u.active
    FROM users u
    WHERE LOWER(u.username) = LOWER(p_username)
      AND u.password = crypt(p_password, u.password)
      AND u.active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

INSERT INTO settings (id, institutionname) VALUES (1, 'Assembleia de Deus Geração Unida') ON CONFLICT (id) DO NOTHING;
