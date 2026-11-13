-- Remove moneda column from precios_seguros table
ALTER TABLE precios_seguros DROP COLUMN IF EXISTS moneda;

-- Remove moneda column from precios_taller table
ALTER TABLE precios_taller DROP COLUMN IF EXISTS moneda;
