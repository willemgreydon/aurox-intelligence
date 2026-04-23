create schema if not exists app;

create extension if not exists pgcrypto;

create table if not exists app.users (
  id uuid primary key,
  email text not null unique,
  password_hash text,
  display_name text not null,
  role text not null default 'member',
  status text not null default 'pending_verification',
  avatar_url text,
  email_verified_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_role_check check (role in ('member', 'admin')),
  constraint users_status_check check (status in ('pending_verification', 'active', 'disabled'))
);

alter table if exists app.users
  add column if not exists password_hash text,
  add column if not exists display_name text,
  add column if not exists role text not null default 'member',
  add column if not exists status text not null default 'pending_verification',
  add column if not exists avatar_url text,
  add column if not exists email_verified_at timestamptz,
  add column if not exists last_login_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists app.auth_accounts (
  id uuid primary key,
  user_id uuid not null references app.users(id) on delete cascade,
  provider text not null,
  provider_account_id text not null,
  provider_email text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_account_id)
);

alter table if exists app.auth_accounts
  add column if not exists provider_email text,
  add column if not exists access_token text,
  add column if not exists refresh_token text,
  add column if not exists token_expires_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists app.sessions (
  id uuid primary key,
  user_id uuid not null references app.users(id) on delete cascade,
  session_token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  ip_address text,
  user_agent text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists app.sessions
  add column if not exists expires_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists ip_address text,
  add column if not exists user_agent text,
  add column if not exists last_seen_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists app.verification_tokens (
  id uuid primary key,
  user_id uuid references app.users(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  type text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint verification_tokens_type_check check (
    type in ('email_verification', 'password_reset', 'magic_link', 'email_change')
  )
);

alter table if exists app.verification_tokens
  add column if not exists user_id uuid references app.users(id) on delete cascade,
  add column if not exists email text,
  add column if not exists token_hash text,
  add column if not exists type text,
  add column if not exists expires_at timestamptz,
  add column if not exists used_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_users_status on app.users(status);
create index if not exists idx_users_email_verified_at on app.users(email_verified_at);

create index if not exists idx_auth_accounts_user_id on app.auth_accounts(user_id);
create index if not exists idx_auth_accounts_provider_email on app.auth_accounts(provider_email);

create index if not exists idx_sessions_user_id on app.sessions(user_id);
create index if not exists idx_sessions_expires_at on app.sessions(expires_at);
create index if not exists idx_sessions_revoked_at on app.sessions(revoked_at);
create index if not exists idx_sessions_user_active on app.sessions(user_id, revoked_at, expires_at);

create index if not exists idx_verification_tokens_email_type on app.verification_tokens(email, type);
create index if not exists idx_verification_tokens_user_id on app.verification_tokens(user_id);
create index if not exists idx_verification_tokens_expires_at on app.verification_tokens(expires_at);
create index if not exists idx_verification_tokens_used_at on app.verification_tokens(used_at);
