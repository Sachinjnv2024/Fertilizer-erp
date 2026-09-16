-- Fertilizer ERP: interconnected Supabase schema
create extension if not exists "pgcrypto";

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  product_name text not null,
  brand text,
  category text not null default 'Fertilizer',
  pack_size numeric(12,3) not null check (pack_size > 0),
  unit text not null check (unit in ('g','kg','ml','L')),
  purchase_rate numeric(12,2) not null default 0,
  selling_rate numeric(12,2) not null default 0,
  gst_percent numeric(5,2) not null default 0,
  minimum_stock numeric(12,3) not null default 0,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  supplier_name text not null,
  mobile text,
  address text,
  gstin text,
  opening_balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  mobile text,
  address text,
  gstin text,
  opening_balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.stock (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  batch_no text not null,
  mfg_date date,
  expiry_date date,
  quantity numeric(14,3) not null default 0 check (quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, batch_no)
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  purchase_no text unique not null,
  supplier_id uuid references public.suppliers(id),
  purchase_date date not null default current_date,
  subtotal numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  gst numeric(14,2) not null default 0,
  transport numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null default 0,
  paid numeric(14,2) not null default 0,
  due numeric(14,2) not null default 0,
  payment_mode text default 'Credit',
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id uuid not null references public.products(id),
  batch_no text not null,
  quantity numeric(14,3) not null check (quantity > 0),
  rate numeric(14,2) not null default 0,
  gst numeric(14,2) not null default 0,
  amount numeric(14,2) not null default 0
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  invoice_no text unique not null,
  customer_id uuid references public.customers(id),
  sale_date date not null default current_date,
  subtotal numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  gst numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null default 0,
  paid numeric(14,2) not null default 0,
  due numeric(14,2) not null default 0,
  payment_mode text default 'Cash',
  created_at timestamptz not null default now()
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id),
  batch_no text not null,
  quantity numeric(14,3) not null check (quantity > 0),
  rate numeric(14,2) not null default 0,
  gst numeric(14,2) not null default 0,
  amount numeric(14,2) not null default 0
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  batch_no text,
  movement_type text not null check (movement_type in ('opening','purchase','purchase_return','sale','sale_return','adjustment')),
  quantity_change numeric(14,3) not null,
  reference_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  party_type text not null check (party_type in ('customer','supplier')),
  party_id uuid not null,
  payment_date date not null default current_date,
  amount numeric(14,2) not null check (amount > 0),
  payment_mode text not null default 'Cash',
  reference text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  category text not null,
  description text,
  amount numeric(14,2) not null check (amount > 0),
  payment_mode text default 'Cash',
  created_at timestamptz not null default now()
);

-- Basic indexes for ERP lookups
create index if not exists idx_stock_product on public.stock(product_id);
create index if not exists idx_stock_expiry on public.stock(expiry_date);
create index if not exists idx_purchase_supplier on public.purchases(supplier_id);
create index if not exists idx_purchase_date on public.purchases(purchase_date);
create index if not exists idx_sale_customer on public.sales(customer_id);
create index if not exists idx_sale_date on public.sales(sale_date);
create index if not exists idx_movements_product on public.stock_movements(product_id);

-- Development-friendly RLS policies.
-- Tighten these for multi-user production after Auth roles are added.
alter table public.products enable row level security;
alter table public.suppliers enable row level security;
alter table public.customers enable row level security;
alter table public.stock enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;

do $$
declare t text;
begin
  foreach t in array array['products','suppliers','customers','stock','purchases','purchase_items','sales','sale_items','stock_movements','payments','expenses']
  loop
    execute format('drop policy if exists "Authenticated full access" on public.%I', t);
    execute format('create policy "Authenticated full access" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

create or replace function public.create_purchase(
  p_purchase_no text,p_supplier_id uuid,p_purchase_date date,p_discount numeric,
  p_gst numeric,p_transport numeric,p_paid numeric,p_payment_mode text,p_items jsonb
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_sub numeric:=0; v_grand numeric; i jsonb; v_amt numeric;
begin
  insert into purchases(purchase_no,supplier_id,purchase_date,discount,gst,transport,paid,payment_mode)
  values(p_purchase_no,p_supplier_id,p_purchase_date,coalesce(p_discount,0),coalesce(p_gst,0),
         coalesce(p_transport,0),coalesce(p_paid,0),coalesce(p_payment_mode,'Credit')) returning id into v_id;
  for i in select * from jsonb_array_elements(p_items) loop
    v_amt=(i->>'quantity')::numeric*(i->>'rate')::numeric; v_sub:=v_sub+v_amt;
    insert into purchase_items(purchase_id,product_id,batch_no,quantity,rate,gst,amount)
    values(v_id,(i->>'product_id')::uuid,i->>'batch_no',(i->>'quantity')::numeric,
           (i->>'rate')::numeric,coalesce((i->>'gst')::numeric,0),v_amt);
    insert into stock(product_id,batch_no,quantity) values((i->>'product_id')::uuid,i->>'batch_no',(i->>'quantity')::numeric)
    on conflict(product_id,batch_no) do update set quantity=stock.quantity+excluded.quantity,updated_at=now();
    insert into stock_movements(product_id,batch_no,movement_type,quantity_change,reference_id,note)
    values((i->>'product_id')::uuid,i->>'batch_no','purchase',(i->>'quantity')::numeric,v_id,'Purchase '||p_purchase_no);
  end loop;
  v_grand:=greatest(0,v_sub-coalesce(p_discount,0)+coalesce(p_gst,0)+coalesce(p_transport,0));
  update purchases set subtotal=v_sub,grand_total=v_grand,due=greatest(0,v_grand-coalesce(p_paid,0)) where id=v_id;
  return v_id;
end $$;
grant execute on function public.create_purchase(text,uuid,date,numeric,numeric,numeric,numeric,text,jsonb) to authenticated;

create or replace function public.create_sale(
  p_invoice_no text,p_customer_id uuid,p_sale_date date,p_discount numeric,
  p_paid numeric,p_payment_mode text,p_items jsonb
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_sub numeric:=0; v_gst numeric:=0; v_grand numeric; i jsonb; v_amt numeric; v_stock numeric;
begin
  insert into sales(invoice_no,customer_id,sale_date,discount,paid,payment_mode)
  values(p_invoice_no,p_customer_id,p_sale_date,coalesce(p_discount,0),coalesce(p_paid,0),coalesce(p_payment_mode,'Cash')) returning id into v_id;
  for i in select * from jsonb_array_elements(p_items) loop
    select quantity into v_stock from stock where product_id=(i->>'product_id')::uuid and batch_no=i->>'batch_no' for update;
    if coalesce(v_stock,0) < (i->>'quantity')::numeric then raise exception 'Insufficient stock for batch %', i->>'batch_no'; end if;
    v_amt=(i->>'quantity')::numeric*(i->>'rate')::numeric; v_sub:=v_sub+v_amt;
    v_gst:=v_gst+v_amt*coalesce((i->>'gst')::numeric,0)/100;
    insert into sale_items(sale_id,product_id,batch_no,quantity,rate,gst,amount)
    values(v_id,(i->>'product_id')::uuid,i->>'batch_no',(i->>'quantity')::numeric,(i->>'rate')::numeric,coalesce((i->>'gst')::numeric,0),v_amt);
    update stock set quantity=quantity-(i->>'quantity')::numeric,updated_at=now()
      where product_id=(i->>'product_id')::uuid and batch_no=i->>'batch_no';
    insert into stock_movements(product_id,batch_no,movement_type,quantity_change,reference_id,note)
    values((i->>'product_id')::uuid,i->>'batch_no','sale',-(i->>'quantity')::numeric,v_id,'Sale '||p_invoice_no);
  end loop;
  v_grand:=greatest(0,v_sub-coalesce(p_discount,0)+v_gst);
  update sales set subtotal=v_sub,gst=v_gst,grand_total=v_grand,due=greatest(0,v_grand-coalesce(p_paid,0)) where id=v_id;
  return v_id;
end $$;
grant execute on function public.create_sale(text,uuid,date,numeric,numeric,text,jsonb) to authenticated;

create or replace function public.record_payment(
  p_party_type text,p_party_id uuid,p_payment_date date,p_amount numeric,
  p_payment_mode text,p_reference text,p_note text
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if p_amount <= 0 then raise exception 'Payment amount must be greater than zero'; end if;
  insert into payments(party_type,party_id,payment_date,amount,payment_mode,reference,note)
  values(p_party_type,p_party_id,p_payment_date,p_amount,p_payment_mode,p_reference,p_note)
  returning id into v_id;
  return v_id;
end $$;
grant execute on function public.record_payment(text,uuid,date,numeric,text,text,text) to authenticated;


-- =========================
-- PHASE 8: GST + RETURNS + BILLING
-- =========================

create table if not exists public.business_settings (
  id integer primary key default 1,
  business_name text not null default 'My Fertilizer Store',
  address text,
  mobile text,
  email text,
  gstin text,
  state text,
  invoice_prefix text not null default 'INV',
  updated_at timestamptz not null default now()
);

insert into public.business_settings(id) values(1)
on conflict(id) do nothing;

create table if not exists public.sales_returns (
  id uuid primary key default gen_random_uuid(),
  return_no text unique not null,
  sale_id uuid references public.sales(id),
  customer_id uuid references public.customers(id),
  return_date date not null default current_date,
  subtotal numeric(14,2) not null default 0,
  gst numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null default 0,
  refund_amount numeric(14,2) not null default 0,
  payment_mode text default 'Credit',
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.sales_return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.sales_returns(id) on delete cascade,
  product_id uuid not null references public.products(id),
  batch_no text not null,
  quantity numeric(14,3) not null check (quantity > 0),
  rate numeric(14,2) not null default 0,
  gst numeric(14,2) not null default 0,
  amount numeric(14,2) not null default 0
);

create table if not exists public.purchase_returns (
  id uuid primary key default gen_random_uuid(),
  return_no text unique not null,
  purchase_id uuid references public.purchases(id),
  supplier_id uuid references public.suppliers(id),
  return_date date not null default current_date,
  subtotal numeric(14,2) not null default 0,
  gst numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null default 0,
  received_amount numeric(14,2) not null default 0,
  payment_mode text default 'Credit',
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.purchase_returns(id) on delete cascade,
  product_id uuid not null references public.products(id),
  batch_no text not null,
  quantity numeric(14,3) not null check (quantity > 0),
  rate numeric(14,2) not null default 0,
  gst numeric(14,2) not null default 0,
  amount numeric(14,2) not null default 0
);

alter table public.business_settings enable row level security;
alter table public.sales_returns enable row level security;
alter table public.sales_return_items enable row level security;
alter table public.purchase_returns enable row level security;
alter table public.purchase_return_items enable row level security;

do $$
declare t text;
begin
  foreach t in array array['business_settings','sales_returns','sales_return_items','purchase_returns','purchase_return_items']
  loop
    execute format('drop policy if exists "Authenticated full access" on public.%I', t);
    execute format('create policy "Authenticated full access" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

create or replace function public.create_sales_return(
  p_return_no text, p_sale_id uuid, p_customer_id uuid, p_return_date date,
  p_refund_amount numeric, p_payment_mode text, p_note text, p_items jsonb
) returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_id uuid; v_sub numeric:=0; v_gst numeric:=0; v_grand numeric; i jsonb; v_amt numeric;
begin
  insert into sales_returns(return_no,sale_id,customer_id,return_date,refund_amount,payment_mode,note)
  values(p_return_no,p_sale_id,p_customer_id,p_return_date,coalesce(p_refund_amount,0),
         coalesce(p_payment_mode,'Credit'),p_note) returning id into v_id;

  for i in select * from jsonb_array_elements(p_items) loop
    v_amt=(i->>'quantity')::numeric*(i->>'rate')::numeric;
    v_sub:=v_sub+v_amt;
    v_gst:=v_gst+v_amt*coalesce((i->>'gst')::numeric,0)/100;

    insert into sales_return_items(return_id,product_id,batch_no,quantity,rate,gst,amount)
    values(v_id,(i->>'product_id')::uuid,i->>'batch_no',(i->>'quantity')::numeric,
           (i->>'rate')::numeric,coalesce((i->>'gst')::numeric,0),v_amt);

    insert into stock(product_id,batch_no,quantity)
    values((i->>'product_id')::uuid,i->>'batch_no',(i->>'quantity')::numeric)
    on conflict(product_id,batch_no) do update
      set quantity=stock.quantity+excluded.quantity, updated_at=now();

    insert into stock_movements(product_id,batch_no,movement_type,quantity_change,reference_id,note)
    values((i->>'product_id')::uuid,i->>'batch_no','sale_return',
           (i->>'quantity')::numeric,v_id,'Sales return '||p_return_no);
  end loop;

  v_grand:=greatest(0,v_sub+v_gst);
  update sales_returns set subtotal=v_sub,gst=v_gst,grand_total=v_grand where id=v_id;
  return v_id;
end $$;

grant execute on function public.create_sales_return(text,uuid,uuid,date,numeric,text,text,jsonb) to authenticated;

create or replace function public.create_purchase_return(
  p_return_no text, p_purchase_id uuid, p_supplier_id uuid, p_return_date date,
  p_received_amount numeric, p_payment_mode text, p_note text, p_items jsonb
) returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_id uuid; v_sub numeric:=0; v_gst numeric:=0; v_grand numeric; i jsonb; v_amt numeric; v_stock numeric;
begin
  insert into purchase_returns(return_no,purchase_id,supplier_id,return_date,received_amount,payment_mode,note)
  values(p_return_no,p_purchase_id,p_supplier_id,p_return_date,coalesce(p_received_amount,0),
         coalesce(p_payment_mode,'Credit'),p_note) returning id into v_id;

  for i in select * from jsonb_array_elements(p_items) loop
    select quantity into v_stock from stock
      where product_id=(i->>'product_id')::uuid and batch_no=i->>'batch_no' for update;
    if coalesce(v_stock,0) < (i->>'quantity')::numeric then
      raise exception 'Insufficient stock for batch %', i->>'batch_no';
    end if;

    v_amt=(i->>'quantity')::numeric*(i->>'rate')::numeric;
    v_sub:=v_sub+v_amt;
    v_gst:=v_gst+v_amt*coalesce((i->>'gst')::numeric,0)/100;

    insert into purchase_return_items(return_id,product_id,batch_no,quantity,rate,gst,amount)
    values(v_id,(i->>'product_id')::uuid,i->>'batch_no',(i->>'quantity')::numeric,
           (i->>'rate')::numeric,coalesce((i->>'gst')::numeric,0),v_amt);

    update stock set quantity=quantity-(i->>'quantity')::numeric,updated_at=now()
      where product_id=(i->>'product_id')::uuid and batch_no=i->>'batch_no';

    insert into stock_movements(product_id,batch_no,movement_type,quantity_change,reference_id,note)
    values((i->>'product_id')::uuid,i->>'batch_no','purchase_return',
           -(i->>'quantity')::numeric,v_id,'Purchase return '||p_return_no);
  end loop;

  v_grand:=greatest(0,v_sub+v_gst);
  update purchase_returns set subtotal=v_sub,gst=v_gst,grand_total=v_grand where id=v_id;
  return v_id;
end $$;

grant execute on function public.create_purchase_return(text,uuid,uuid,date,numeric,text,text,jsonb) to authenticated;


-- =========================
-- PHASE 9: BUSINESS TOOLS + STOCK CONTROL
-- =========================

create or replace function public.adjust_stock(
  p_product_id uuid,
  p_batch_no text,
  p_quantity_change numeric,
  p_note text
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_qty numeric;
begin
  if p_quantity_change = 0 then raise exception 'Quantity change cannot be zero'; end if;
  select quantity into v_qty from stock
    where product_id=p_product_id and batch_no=p_batch_no for update;

  if p_quantity_change < 0 and coalesce(v_qty,0) < abs(p_quantity_change) then
    raise exception 'Insufficient stock for adjustment';
  end if;

  insert into stock(product_id,batch_no,quantity)
  values(p_product_id,p_batch_no,p_quantity_change)
  on conflict(product_id,batch_no) do update
    set quantity=stock.quantity+excluded.quantity, updated_at=now()
    returning id into v_id;

  insert into stock_movements(product_id,batch_no,movement_type,quantity_change,reference_id,note)
  values(p_product_id,p_batch_no,'adjustment',p_quantity_change,v_id,p_note);

  return v_id;
end $$;

grant execute on function public.adjust_stock(uuid,text,numeric,text) to authenticated;


-- =========================
-- PHASE 10: PRODUCTION HARDENING / INDEXES / AUDIT
-- =========================

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  action text not null,
  entity text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;
drop policy if exists "Authenticated audit insert" on public.audit_log;
create policy "Authenticated audit insert" on public.audit_log for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Authenticated audit read" on public.audit_log;
create policy "Authenticated audit read" on public.audit_log for select to authenticated using (user_id = auth.uid());

create index if not exists idx_stock_product_batch on public.stock(product_id,batch_no);
create index if not exists idx_stock_expiry on public.stock(expiry_date);
create index if not exists idx_stock_movements_product_date on public.stock_movements(product_id,created_at desc);
create index if not exists idx_sales_date on public.sales(sale_date);
create index if not exists idx_sales_customer_date on public.sales(customer_id,sale_date);
create index if not exists idx_purchase_date on public.purchases(purchase_date);
create index if not exists idx_purchase_supplier_date on public.purchases(supplier_id,purchase_date);
create index if not exists idx_payments_party_date on public.payments(party_type,party_id,payment_date);
create index if not exists idx_expenses_date on public.expenses(expense_date);
create index if not exists idx_audit_user_date on public.audit_log(user_id,created_at desc);

create or replace function public.write_audit(
  p_action text, p_entity text, p_entity_id uuid, p_details jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  insert into audit_log(user_id,action,entity,entity_id,details)
  values(auth.uid(),p_action,p_entity,p_entity_id,coalesce(p_details,'{}'::jsonb))
  returning id into v_id;
  return v_id;
end $$;

grant execute on function public.write_audit(text,text,uuid,jsonb) to authenticated;
