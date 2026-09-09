-- Supabase / PostgreSQL schema for the Leave Management System
create extension if not exists pgcrypto;

create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  department_id uuid references departments(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists annual_entitlements (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  year int not null,
  regular_days numeric(8,2) not null default 0,
  casual_days numeric(8,2) not null default 0,
  unique(employee_id, year)
);

create table if not exists leave_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  leave_type text not null check (leave_type in ('اعتيادي','عارضة')),
  leave_date date not null,
  days numeric(8,2) not null check (days > 0),
  notes text,
  created_at timestamptz not null default now()
);

create or replace view employee_leave_summary as
select
  e.id,
  e.code,
  e.name,
  e.department_id,
  coalesce(a.year, extract(year from current_date)::int) as year,
  coalesce(a.regular_days,0) as regular_days,
  coalesce(a.casual_days,0) as casual_days,
  coalesce(a.regular_days,0) + coalesce(a.casual_days,0) as annual_balance,
  coalesce(sum(l.days) filter (where extract(year from l.leave_date)=coalesce(a.year, extract(year from current_date)::int)),0) as used_days,
  (coalesce(a.regular_days,0) + coalesce(a.casual_days,0)
   - coalesce(sum(l.days) filter (where extract(year from l.leave_date)=coalesce(a.year, extract(year from current_date)::int)),0)) as remaining_days
from employees e
left join annual_entitlements a on a.employee_id=e.id
left join leave_entries l on l.employee_id=e.id
group by e.id,e.code,e.name,e.department_id,a.year,a.regular_days,a.casual_days;

alter table departments enable row level security;
alter table employees enable row level security;
alter table annual_entitlements enable row level security;
alter table leave_entries enable row level security;

-- MVP policies: authenticated users can work with the application data.
create policy "authenticated read departments" on departments for select to authenticated using (true);
create policy "authenticated write departments" on departments for all to authenticated using (true) with check (true);

create policy "authenticated read employees" on employees for select to authenticated using (true);
create policy "authenticated write employees" on employees for all to authenticated using (true) with check (true);

create policy "authenticated read entitlements" on annual_entitlements for select to authenticated using (true);
create policy "authenticated write entitlements" on annual_entitlements for all to authenticated using (true) with check (true);

create policy "authenticated read leaves" on leave_entries for select to authenticated using (true);
create policy "authenticated write leaves" on leave_entries for all to authenticated using (true) with check (true);
