-- 1. Buat tabel customers
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    phone TEXT,
    contact TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tambahkan relasi customer_id di tabel orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

-- 3. Buat indeks untuk optimasi pencarian
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);

-- 4. Set pengaturan RLS (Row Level Security) jika diaktifkan
-- (Pastikan RLS sudah sesuai dengan policy aplikasi Anda)
-- ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable read access for all users" ON public.customers FOR SELECT USING (true);
-- CREATE POLICY "Enable insert access for all users" ON public.customers FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Enable update access for all users" ON public.customers FOR UPDATE USING (true);
-- CREATE POLICY "Enable delete access for all users" ON public.customers FOR DELETE USING (true);

-- 5. Buat fungsi RPC untuk sinkronisasi pesanan lama (Auto-link)
CREATE OR REPLACE FUNCTION public.auto_link_customers()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    affected_rows INT;
BEGIN
    -- Menghubungkan orders lama ke customers yang sudah ada
    -- berdasarkan kesamaan nama (case-insensitive)
    UPDATE public.orders o
    SET customer_id = c.id
    FROM public.customers c
    WHERE LOWER(o.customer_name) = LOWER(c.name)
      AND o.customer_id IS NULL;
      
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    RETURN json_build_object(
        'status', 'success',
        'linked_orders', affected_rows
    );
END;
$$;
