-- Create groups table
CREATE TABLE public.groups (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create user_group_memberships table
CREATE TABLE public.user_group_memberships (
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, group_id)
);

-- Create monthly_releases table
CREATE TABLE public.monthly_releases (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    year int NOT NULL,
    month int NOT NULL, -- 0-11 to match JS Date.getMonth(), or 1-12? Let's use 1-12 for SQL standard, but app uses 0-11. Let's stick to 1-12 for clarity in DB.
    group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
    release_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (year, month, group_id)
);

-- Enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_releases ENABLE ROW LEVEL SECURITY;

-- Policies for Groups
CREATE POLICY "Admins can do everything on groups" ON public.groups
    FOR ALL USING (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

CREATE POLICY "Everyone can view groups" ON public.groups
    FOR SELECT USING (true);

-- Policies for Memberships
CREATE POLICY "Admins can do everything on memberships" ON public.user_group_memberships
    FOR ALL USING (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

CREATE POLICY "Users can view own memberships" ON public.user_group_memberships
    FOR SELECT USING (auth.uid() = user_id);

-- Policies for Releases
CREATE POLICY "Admins can do everything on releases" ON public.monthly_releases
    FOR ALL USING (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

CREATE POLICY "Everyone can view releases" ON public.monthly_releases
    FOR SELECT USING (true);
