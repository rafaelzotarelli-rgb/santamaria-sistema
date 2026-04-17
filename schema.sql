-- ============================================================
-- SANTA MARIA BUFFET — Schema do banco de dados (Supabase)
-- Execute este arquivo no SQL Editor do Supabase
-- ============================================================

-- EXTENSÕES
create extension if not exists "uuid-ossp";

-- ============================================================
-- USUÁRIOS / PERFIS
-- ============================================================
create table if not exists perfis (
  id uuid references auth.users on delete cascade primary key,
  nome text not null,
  email text not null,
  tipo text not null default 'colaborador', -- 'dono' | 'colaborador'
  ativo boolean default true,
  created_at timestamptz default now()
);

-- Trigger: cria perfil automaticamente ao criar usuário
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into perfis (id, nome, email, tipo)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email,'@',1)), new.email, coalesce(new.raw_user_meta_data->>'tipo','colaborador'));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- CLIENTES
-- ============================================================
create table if not exists clientes (
  id uuid default uuid_generate_v4() primary key,
  nome text not null,
  telefone text,
  email text,
  cpf_cnpj text,
  endereco text,
  obs text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- EVENTOS
-- ============================================================
create table if not exists eventos (
  id uuid default uuid_generate_v4() primary key,
  nome text not null,
  tipo text default 'Casamento',
  data date not null,
  horario time,
  local text,
  convidados integer default 0,
  valor numeric(12,2) default 0,
  status text default 'confirmado', -- confirmado | realizado | pendente | cancelado
  cliente_id uuid references clientes(id) on delete set null,
  obs text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- SERVIÇOS POR EVENTO
-- ============================================================
create table if not exists evento_servicos (
  id uuid default uuid_generate_v4() primary key,
  evento_id uuid references eventos(id) on delete cascade,
  descricao text not null,
  categoria text,
  valor numeric(12,2) default 0,
  obs text,
  created_at timestamptz default now()
);

-- ============================================================
-- DOCUMENTOS POR EVENTO
-- ============================================================
create table if not exists evento_documentos (
  id uuid default uuid_generate_v4() primary key,
  evento_id uuid references eventos(id) on delete cascade,
  nome text not null,
  tamanho text,
  url text,
  assinado boolean default false,
  assinado_ip text,
  assinado_em timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- ORÇAMENTOS
-- ============================================================
create table if not exists orcamentos (
  id uuid default uuid_generate_v4() primary key,
  cliente text not null,
  telefone text,
  tipo text default 'Casamento',
  data_evento date,
  convidados integer default 0,
  valor numeric(12,2) default 0,
  etapa text default 'lead', -- lead | proposta | negociacao | fechado
  obs text,
  ultimo_contato date default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- FOLLOW-UPS
-- ============================================================
create table if not exists followups (
  id uuid default uuid_generate_v4() primary key,
  orcamento_id uuid references orcamentos(id) on delete cascade,
  data date not null,
  hora time,
  tipo text default 'whatsapp',
  pauta text,
  mensagem text,
  feito boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- HISTÓRICO DE CONTATOS
-- ============================================================
create table if not exists contatos_historico (
  id uuid default uuid_generate_v4() primary key,
  orcamento_id uuid references orcamentos(id) on delete cascade,
  canal text default 'whatsapp',
  data date not null,
  resultado text,
  obs text,
  created_at timestamptz default now()
);

-- ============================================================
-- FINANCEIRO — CONTAS
-- ============================================================
create table if not exists contas (
  id uuid default uuid_generate_v4() primary key,
  nome text not null,
  banco text,
  agencia text,
  conta text,
  saldo_inicial numeric(12,2) default 0,
  ativo boolean default true,
  created_at timestamptz default now()
);

-- ============================================================
-- FINANCEIRO — LANÇAMENTOS
-- ============================================================
create table if not exists lancamentos (
  id uuid default uuid_generate_v4() primary key,
  descricao text not null,
  tipo text not null, -- receita | despesa
  valor numeric(12,2) not null,
  data date not null,
  conta_id uuid references contas(id) on delete set null,
  evento_id uuid references eventos(id) on delete set null,
  cliente_id uuid references clientes(id) on delete set null,
  categoria text,
  forma_pagamento text,
  parcela text,
  status text default 'pago', -- pago | pendente | atrasado
  conciliado boolean default false,
  obs text,
  created_at timestamptz default now()
);

-- ============================================================
-- SERVIÇOS & PRODUTOS (CATÁLOGO)
-- ============================================================
create table if not exists produtos (
  id uuid default uuid_generate_v4() primary key,
  nome text not null,
  categoria text not null,
  custo numeric(10,2) default 0,
  preco numeric(10,2) default 0,
  rendimento numeric(6,2) default 1,
  descricao text,
  ingredientes text,
  preparo text,
  tempo_preparo text,
  temperatura text,
  alergenos text[],
  obs text,
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- PACOTES
-- ============================================================
create table if not exists pacotes (
  id uuid default uuid_generate_v4() primary key,
  nome text not null,
  preco_pessoa numeric(10,2) default 0,
  min_convidados integer default 0,
  descricao text,
  itens uuid[], -- array de produto ids
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table perfis              enable row level security;
alter table clientes            enable row level security;
alter table eventos             enable row level security;
alter table evento_servicos     enable row level security;
alter table evento_documentos   enable row level security;
alter table orcamentos          enable row level security;
alter table followups           enable row level security;
alter table contatos_historico  enable row level security;
alter table contas              enable row level security;
alter table lancamentos         enable row level security;
alter table produtos            enable row level security;
alter table pacotes             enable row level security;

-- Política: usuário autenticado acessa tudo
create policy "Acesso autenticado" on perfis             for all using (auth.role() = 'authenticated');
create policy "Acesso autenticado" on clientes           for all using (auth.role() = 'authenticated');
create policy "Acesso autenticado" on eventos            for all using (auth.role() = 'authenticated');
create policy "Acesso autenticado" on evento_servicos    for all using (auth.role() = 'authenticated');
create policy "Acesso autenticado" on evento_documentos  for all using (auth.role() = 'authenticated');
create policy "Acesso autenticado" on orcamentos         for all using (auth.role() = 'authenticated');
create policy "Acesso autenticado" on followups          for all using (auth.role() = 'authenticated');
create policy "Acesso autenticado" on contatos_historico for all using (auth.role() = 'authenticated');
create policy "Acesso autenticado" on produtos           for all using (auth.role() = 'authenticated');
create policy "Acesso autenticado" on pacotes            for all using (auth.role() = 'authenticated');

-- Financeiro: somente perfil 'dono'
create policy "Somente dono" on contas      for all using (
  exists (select 1 from perfis where id = auth.uid() and tipo = 'dono')
);
create policy "Somente dono" on lancamentos for all using (
  exists (select 1 from perfis where id = auth.uid() and tipo = 'dono')
);

-- ============================================================
-- DADOS INICIAIS
-- ============================================================
insert into contas (nome, banco, saldo_inicial) values
  ('Conta Principal', 'Bradesco', 0),
  ('Conta PJ', 'Nubank', 0)
on conflict do nothing;
