-- Phase 19: Atomic Transactions for Khata and Loyalty

CREATE OR REPLACE FUNCTION process_khata_transaction(
    p_store_id UUID,
    p_customer_id UUID,
    p_type TEXT,
    p_amount DECIMAL,
    p_reference TEXT
) RETURNS void AS $\$
DECLARE
    v_current_balance DECIMAL;
    v_new_balance DECIMAL;
BEGIN
    -- Ensure type is valid
    IF p_type NOT IN ('credit', 'debit') THEN
        RAISE EXCEPTION 'Invalid transaction type %', p_type;
    END IF;

    -- Lock the customer row for update
    SELECT balance INTO v_current_balance
    FROM public.khata_customers
    WHERE id = p_customer_id AND store_id = p_store_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Khata customer not found';
    END IF;

    -- Calculate new balance
    IF p_type = 'credit' THEN
        v_new_balance := v_current_balance + p_amount;
    ELSE
        v_new_balance := v_current_balance - p_amount;
    END IF;

    -- Insert transaction
    INSERT INTO public.khata_transactions (
        khata_customer_id,
        store_id,
        type,
        amount,
        reference
    ) VALUES (
        p_customer_id,
        p_store_id,
        p_type,
        p_amount,
        p_reference
    );

    -- Update balance
    UPDATE public.khata_customers
    SET balance = v_new_balance,
        updated_at = NOW()
    WHERE id = p_customer_id;
END;
$\$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION process_loyalty_transaction(
    p_store_id UUID,
    p_customer_id UUID,
    p_type TEXT,
    p_points INTEGER,
    p_reference TEXT
) RETURNS void AS $\$
DECLARE
    v_current_points INTEGER;
    v_new_points INTEGER;
BEGIN
    -- Ensure type is valid
    IF p_type NOT IN ('earn', 'redeem') THEN
        RAISE EXCEPTION 'Invalid transaction type %', p_type;
    END IF;

    -- Lock the customer row for update
    SELECT points_balance INTO v_current_points
    FROM public.loyalty_customers
    WHERE id = p_customer_id AND store_id = p_store_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Loyalty customer not found';
    END IF;

    -- Calculate new points
    IF p_type = 'earn' THEN
        v_new_points := v_current_points + p_points;
    ELSE
        v_new_points := v_current_points - p_points;
    END IF;

    IF v_new_points < 0 THEN
        RAISE EXCEPTION 'Insufficient points balance';
    END IF;

    -- Insert transaction
    INSERT INTO public.loyalty_transactions (
        loyalty_customer_id,
        store_id,
        type,
        points,
        reference
    ) VALUES (
        p_customer_id,
        p_store_id,
        p_type,
        p_points,
        p_reference
    );

    -- Update balance
    UPDATE public.loyalty_customers
    SET points_balance = v_new_points,
        updated_at = NOW()
    WHERE id = p_customer_id;
END;
$\$ LANGUAGE plpgsql SECURITY DEFINER;
