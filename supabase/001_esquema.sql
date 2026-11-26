-- Resenha: esquema do banco (Supabase / Postgres)
-- Rode tudo de uma vez no SQL Editor do Supabase.
--
-- Três camadas:
--   pública  -> roles e eventos com publico = true e moderacao = 'aprovado' (todo mundo logado vê)
--   pessoal  -> minha_lista, diario, notas e roles/eventos privados (só o dono vê)
--   admin    -> aprova ou recusa o que os usuários sugerem pra parte pública

-- ------------------------------------------------------------------ perfis
create table if not exists public.perfis (
  id uuid primary key references auth.users on delete cascade,
  nome text,
  foto text,
  admin boolean not null default false,
  criado_em timestamptz not null default now()
);

create or replace function public.novo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- o primeiro usuário do app vira admin
  insert into public.perfis (id, nome, foto, admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    not exists (select 1 from public.perfis)
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.novo_usuario();

create or replace function public.eh_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select admin from public.perfis where id = auth.uid()), false)
$$;

do $$ begin
  create type public.moderacao as enum ('pendente', 'aprovado', 'recusado');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------------ roles (lugares e ideias sem data)
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  titulo text not null,
  formato text not null default 'lugar' check (formato in ('lugar', 'roteiro', 'casa', 'atividade')),
  tipo text not null default 'cultura',
  com text[] not null default '{}',
  regiao text,
  grana text check (grana in ('gratis', 'barato', 'medio', 'caro')),
  horario text[] not null default '{}',
  duracao text check (duracao in ('curto', 'medio', 'longo')),
  chuva boolean,
  dias int[],
  descricao text,
  paradas jsonb,
  checklist jsonb,
  links jsonb,
  mapa text,
  aviso text,
  destaque boolean not null default false,
  publico boolean not null default false,
  moderacao public.moderacao not null default 'pendente',
  criado_por uuid references public.perfis(id) on delete set null default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ------------------------------------------------------------------ eventos (têm data)
create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  titulo text not null,
  data_inicio date,
  data_fim date,
  horario text,
  local text,
  regiao text,
  gratis boolean,
  preco text,
  descricao text,
  link text,
  fonte text,
  com text[] not null default '{}',
  tipo text not null default 'outro',
  destaque boolean not null default false,
  role_id uuid references public.roles(id) on delete set null,
  origem text not null default 'manual',
  publico boolean not null default true,
  moderacao public.moderacao not null default 'pendente',
  criado_por uuid references public.perfis(id) on delete set null default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists eventos_datas on public.eventos (data_inicio, data_fim);

-- ------------------------------------------------------------------ minha_lista (a relação de cada pessoa com um rolê ou evento)
create table if not exists public.minha_lista (
  usuario uuid not null references public.perfis(id) on delete cascade default auth.uid(),
  ref_tipo text not null check (ref_tipo in ('role', 'evento')),
  ref_id uuid not null,
  status text not null default 'quero'
    check (status in ('quero', 'fila', 'feito', 'riscado', 'visto', 'interesse', 'vou', 'ignorado', 'fui')),
  longo_prazo boolean not null default false,
  data date,
  data_fim date,
  nota text,
  motivo text,
  checklist_feito jsonb,
  atualizado_em timestamptz not null default now(),
  primary key (usuario, ref_tipo, ref_id)
);

-- ------------------------------------------------------------------ diário (o que já rolou)
create table if not exists public.diario (
  id uuid primary key default gen_random_uuid(),
  usuario uuid not null references public.perfis(id) on delete cascade default auth.uid(),
  ref_tipo text check (ref_tipo in ('role', 'evento')),
  ref_id uuid,
  titulo text not null,
  data date not null,
  prestou boolean,
  nota int check (nota between 1 and 5),
  quem text,
  comentario text,
  criado_em timestamptz not null default now()
);

-- ------------------------------------------------------------------ caderno (notas pessoais)
create table if not exists public.notas (
  id uuid primary key default gen_random_uuid(),
  usuario uuid not null references public.perfis(id) on delete cascade default auth.uid(),
  slug text,
  titulo text not null,
  texto text not null default '',
  ordem int not null default 0,
  atualizado_em timestamptz not null default now(),
  unique (usuario, slug)
);

-- ------------------------------------------------------------------ radar (fontes e status da busca)
create table if not exists public.fontes (
  id text primary key,
  nome text not null,
  url text,
  tipo text not null,
  descricao text,
  freq text,
  automatica boolean not null default false,
  conferir boolean not null default false,
  ordem int not null default 0
);

create table if not exists public.radar_status (
  id int primary key default 1 check (id = 1),
  ultima_busca timestamptz,
  origem text,
  novos int,
  resumo text
);

-- ------------------------------------------------------------------ atualizado_em automático
create or replace function public.tocar_atualizado()
returns trigger language plpgsql as $$
begin new.atualizado_em = now(); return new; end $$;

do $$ declare t text; begin
  foreach t in array array['roles', 'eventos', 'minha_lista', 'notas'] loop
    execute format('drop trigger if exists tocar on public.%I', t);
    execute format('create trigger tocar before update on public.%I for each row execute function public.tocar_atualizado()', t);
  end loop;
end $$;

-- ------------------------------------------------------------------ acesso pela API (as regras abaixo decidem o que cada um vê)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.eh_admin() to authenticated;

-- ------------------------------------------------------------------ regras de acesso (RLS)
alter table public.perfis enable row level security;
alter table public.roles enable row level security;
alter table public.eventos enable row level security;
alter table public.minha_lista enable row level security;
alter table public.diario enable row level security;
alter table public.notas enable row level security;
alter table public.fontes enable row level security;
alter table public.radar_status enable row level security;

-- perfis: todo mundo logado vê nome e foto; cada um edita o seu, sem poder se tornar admin
drop policy if exists perfis_ver on public.perfis;
create policy perfis_ver on public.perfis for select to authenticated using (true);
drop policy if exists perfis_editar on public.perfis;
create policy perfis_editar on public.perfis for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and admin = (select p.admin from public.perfis p where p.id = auth.uid()));

-- roles e eventos: mesma regra para os dois
do $$ declare t text; begin
  foreach t in array array['roles', 'eventos'] loop
    execute format('drop policy if exists %1$s_ver on public.%1$I', t);
    execute format($p$create policy %1$s_ver on public.%1$I for select to authenticated
      using ((publico and moderacao = 'aprovado') or criado_por = auth.uid() or public.eh_admin())$p$, t);

    -- criar: sempre em nome próprio; o que é público nasce pendente (só admin aprova)
    execute format('drop policy if exists %1$s_criar on public.%1$I', t);
    execute format($p$create policy %1$s_criar on public.%1$I for insert to authenticated
      with check (criado_por = auth.uid() and (not publico or moderacao = 'pendente' or public.eh_admin()))$p$, t);

    -- editar: o dono edita o que é seu; mexer em algo público faz voltar pra pendente
    execute format('drop policy if exists %1$s_editar on public.%1$I', t);
    execute format($p$create policy %1$s_editar on public.%1$I for update to authenticated
      using (criado_por = auth.uid() or public.eh_admin())
      with check (public.eh_admin() or (criado_por = auth.uid() and (not publico or moderacao = 'pendente')))$p$, t);

    -- apagar: o dono apaga o que é privado; admin apaga qualquer coisa
    execute format('drop policy if exists %1$s_apagar on public.%1$I', t);
    execute format($p$create policy %1$s_apagar on public.%1$I for delete to authenticated
      using (public.eh_admin() or (criado_por = auth.uid() and not publico))$p$, t);
  end loop;
end $$;

-- coisas pessoais: só o dono
do $$ declare t text; begin
  foreach t in array array['minha_lista', 'diario', 'notas'] loop
    execute format('drop policy if exists %1$s_dono on public.%1$I', t);
    execute format('create policy %1$s_dono on public.%1$I for all to authenticated using (usuario = auth.uid()) with check (usuario = auth.uid())', t);
  end loop;
end $$;

-- radar: todo mundo logado lê; só admin muda (o robô usa a chave de serviço, que ignora RLS)
drop policy if exists fontes_ver on public.fontes;
create policy fontes_ver on public.fontes for select to authenticated using (true);
drop policy if exists fontes_admin on public.fontes;
create policy fontes_admin on public.fontes for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists radar_ver on public.radar_status;
create policy radar_ver on public.radar_status for select to authenticated using (true);
drop policy if exists radar_admin on public.radar_status;
create policy radar_admin on public.radar_status for all to authenticated using (public.eh_admin()) with check (public.eh_admin());
