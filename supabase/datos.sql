-- MacrOS: datos vinculados entre cel y compu. Pegar una vez en Supabase → SQL Editor → Run.
-- Una fila por clave de Preferences (perfil, mios, recetas, menu, log:AAAA-MM-DD…); valor null = se borró.
create table public.datos (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  clave text not null,
  valor jsonb,
  dispositivo text,
  actualizado timestamptz not null default clock_timestamp(),
  primary key (user_id, clave)
);
create index datos_actualizado on public.datos (user_id, actualizado);

-- cada quien ve y escribe solo lo suyo (la llave anon va dentro de la app, que es pública)
alter table public.datos enable row level security;
create policy "solo mis datos" on public.datos for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- la hora la pone el servidor: la app baja lo que cambió desde la última vez, sin depender del reloj de cada dispositivo
-- shortcut: un cambio que tarda en guardarse justo mientras el otro dispositivo baja podría saltarse; con un solo usuario no pasa en la práctica.
create function public.tocar_datos() returns trigger language plpgsql set search_path = '' as $$
begin
  new.actualizado := clock_timestamp();
  return new;
end $$;
create trigger tocar_datos before update on public.datos for each row execute function public.tocar_datos();
