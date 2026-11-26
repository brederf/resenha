-- IA: limite de uso por pessoa por dia.
-- A função "ia" (supabase/functions/ia) chama consumir_ia() antes de cada pedido ao DeepSeek.

create table if not exists public.ia_uso (
  usuario uuid not null references auth.users(id) on delete cascade,
  dia date not null default (now() at time zone 'America/Sao_Paulo')::date,
  qtd int not null default 0,
  primary key (usuario, dia)
);
alter table public.ia_uso enable row level security;

drop policy if exists "ia_uso: dono lê" on public.ia_uso;
create policy "ia_uso: dono lê" on public.ia_uso for select to authenticated using (usuario = auth.uid());
grant select on public.ia_uso to authenticated;

-- Conta um uso e diz se ainda pode. Admin: 200 por dia. Os outros: 20 por dia.
create or replace function public.consumir_ia()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  eu uuid := auth.uid();
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  lim int;
  usados int;
begin
  if eu is null then
    return json_build_object('ok', false, 'usados', 0, 'limite', 0);
  end if;
  lim := case when public.eh_admin() then 200 else 20 end;
  insert into public.ia_uso as u (usuario, dia, qtd) values (eu, hoje, 1)
    on conflict (usuario, dia) do update set qtd = u.qtd + 1
    where u.qtd < lim
  returning qtd into usados;
  if usados is null then
    return json_build_object('ok', false, 'usados', lim, 'limite', lim);
  end if;
  return json_build_object('ok', true, 'usados', usados, 'limite', lim);
end;
$$;

revoke all on function public.consumir_ia() from public, anon;
grant execute on function public.consumir_ia() to authenticated;
