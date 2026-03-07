-- Add dtf_printed column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS dtf_printed BOOLEAN DEFAULT FALSE;

-- Update existing rows to false (though DEFAULT handles new rows, making sure current ones evaluate to false correctly)
UPDATE orders SET dtf_printed = FALSE WHERE dtf_printed IS NULL;
