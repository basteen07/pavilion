
DO $$
BEGIN
    ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_status_check;
    ALTER TABLE quotations ADD CONSTRAINT quotations_status_check CHECK (status IN ('Draft', 'Sent', 'Accepted', 'Rejected', 'Expired', 'Cancelled', 'Completed', 'Complete'));
END $$;
