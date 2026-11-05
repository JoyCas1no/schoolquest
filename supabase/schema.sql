-- Схема SchoolQuest. Выполнить один раз: Supabase -> SQL Editor -> New query -> Run.
-- Вход по логину: в Auth служебная почта <логин>@schoolquest.game (почта на ней не работает, письма не отправляются).
-- Подтверждение почты в Auth должно быть ВЫКЛЮЧЕНО.
-- Личных данных ребёнка не храним: логин, необязательная почта РОДИТЕЛЯ, JSON сохранения игры.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  parent_email text,
  created_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_]{3,20}$'),
  constraint parent_email_len check (parent_email is null or length(parent_email) <= 120)
);
create unique index if not exists profiles_username_key on public.profiles (lower(username));

create table if not exists public.saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  constraint saves_size check (pg_column_size(data) < 100000)
);

-- профиль создаётся автоматически из данных регистрации
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, parent_email)
  values (new.id, lower(new.raw_user_meta_data->>'username'), nullif(trim(new.raw_user_meta_data->>'parent_email'), ''));
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- свободен ли логин (до регистрации)
create or replace function public.username_free(name text) returns boolean
language sql security definer set search_path = public as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(name));
$$;

alter table public.profiles enable row level security;
alter table public.saves enable row level security;

drop policy if exists profiles_own_read on public.profiles;
create policy profiles_own_read on public.profiles for select using (auth.uid() = id);

drop policy if exists saves_own_all on public.saves;
create policy saves_own_all on public.saves for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant execute on function public.username_free(text) to anon, authenticated;
