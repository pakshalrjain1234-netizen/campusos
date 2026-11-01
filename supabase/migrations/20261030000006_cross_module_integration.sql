-- =====================================================================
-- CAMPUSOPS — MIGRATION 006: CROSS-MODULE INTEGRATION & WORKFLOW SAFENESS
-- Phase 2.7 Integration: Inventory Ledger, Relocations, & Notifications
-- =====================================================================

-- 1. Stock Transactions Immutable Ledger
CREATE TABLE IF NOT EXISTS public.stock_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
    work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('allocation', 'receipt', 'adjustment')),
    quantity INTEGER NOT NULL CHECK (quantity != 0),
    balance_before INTEGER NOT NULL CHECK (balance_before >= 0),
    balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
    receipt_token TEXT UNIQUE, -- Enforces idempotency for goods receipt
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_stock_tx_item ON public.stock_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_tx_wo ON public.stock_transactions(work_order_id);
CREATE INDEX IF NOT EXISTS idx_stock_tx_token ON public.stock_transactions(receipt_token) WHERE receipt_token IS NOT NULL;

-- 2. Emergency Room Relocation Approvals
CREATE TABLE IF NOT EXISTS public.room_relocation_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disruption_id UUID NOT NULL REFERENCES public.room_disruptions(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES public.room_bookings(id) ON DELETE CASCADE,
    original_room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
    target_room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
    is_exam BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed')),
    requester_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approval_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    -- Constraint: Target room cannot be the same as original room
    CONSTRAINT chk_different_rooms CHECK (original_room_id != target_room_id)
);

CREATE INDEX IF NOT EXISTS idx_reloc_disruption ON public.room_relocation_approvals(disruption_id);
CREATE INDEX IF NOT EXISTS idx_reloc_booking ON public.room_relocation_approvals(booking_id);

-- 3. Unified Cross-Module Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_role public.app_role,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('critical', 'alert', 'success', 'info')),
    category TEXT NOT NULL CHECK (category IN ('incident', 'work_order', 'inventory', 'procurement', 'booking', 'sensor')),
    entity_type TEXT,
    entity_id TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_role ON public.notifications(target_role);
CREATE INDEX IF NOT EXISTS idx_notif_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_relocation_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Stock transactions policies
CREATE POLICY "Stock transactions viewable by authorized staff"
    ON public.stock_transactions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
            AND p.role IN ('coo', 'director', 'engineer')
        )
    );

CREATE POLICY "Stock transactions insertable by maintenance staff"
    ON public.stock_transactions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
            AND p.role IN ('coo', 'director', 'engineer')
        )
    );

-- Room relocation policies
CREATE POLICY "Relocation requests viewable by all authenticated users"
    ON public.room_relocation_approvals
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Relocation approval restricted to COO and Director"
    ON public.room_relocation_approvals
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
            AND p.role IN ('coo', 'director')
        )
    );

-- Notifications policies
CREATE POLICY "Users can view notifications directed to them or their role"
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING (
        user_id = (SELECT auth.uid())
        OR target_role = (
            SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())
        )
        OR target_role IS NULL
    );

CREATE POLICY "Users can mark own notifications as read"
    ON public.notifications
    FOR UPDATE
    TO authenticated
    USING (
        user_id = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
            AND (p.role = notifications.target_role OR p.role = 'coo')
        )
    );

