-- ==============================================================================
-- SCRIPT 3: AJUSTAR ENTRADAS, SALIDAS Y STOCK DE 3 ÍTEMS DE INVENTARIO
-- Herramienta recomendada: DBeaver / pgAdmin / psql
-- Base de datos: PostgreSQL
--
-- Ítems a actualizar:
-- 1. KIXX-050   -> stock_inicial = 0, entradas = 0, salidas = 0, stock_actual = 0
-- 2. RENAULT002 -> stock_inicial = 0, entradas = 2, salidas = 2, stock_actual = 0
-- 3. CES-200    -> stock_inicial = 0, entradas = 0, salidas = 0, stock_actual = 0
-- ==============================================================================

BEGIN;

-- 1. CONSULTA PREVIA DE CONTROL (Ver estado actual antes de modificar)
SELECT id, codigo, descripcion, stock_inicial, entradas, salidas, cantidad_existente as stock_actual, estado
FROM public.inventario
WHERE TRIM(codigo) IN ('KIXX-050', 'RENAULT002', 'CES-200')
   OR descripcion ILIKE '%KIXX ATF MULT%'
   OR descripcion ILIKE '%MUÑON DE SUSPENCION%'
   OR descripcion ILIKE '%CESPA DE ACEITE DE TRANSMISION%';

-- 2. ACTUALIZACIÓN DE VALORES EN LA TABLA 'inventario'

-- Ítem 1: KIXX-050 - ACEITE PARA TRANSMISION KIXX ATF MULT 1LT
UPDATE public.inventario
SET stock_inicial = 0,
    entradas = 0,
    salidas = 0,
    cantidad_existente = 0
WHERE TRIM(codigo) = 'KIXX-050'
   OR (descripcion ILIKE '%KIXX%' AND descripcion ILIKE '%ATF%');

-- Ítem 2: RENAULT002 - MUÑON DE SUSPENCION
UPDATE public.inventario
SET stock_inicial = 0,
    entradas = 2,
    salidas = 2,
    cantidad_existente = 0
WHERE TRIM(codigo) = 'RENAULT002'
   OR (descripcion ILIKE '%MUÑON%' AND descripcion ILIKE '%SUSPEN%');

-- Ítem 3: CES-200 - CESPA DE ACEITE DE TRANSMISION 80W90 20LT
UPDATE public.inventario
SET stock_inicial = 0,
    entradas = 0,
    salidas = 0,
    cantidad_existente = 0
WHERE TRIM(codigo) = 'CES-200'
   OR (descripcion ILIKE '%CESPA%' AND descripcion ILIKE '%80W90%');

-- 3. AJUSTE DE LOTES EN 'inventario_lotes' (Consistencia de Stock Cero)
-- Al tener stock actual = 0, se ajustan los lotes asociados para que no figure cantidad disponible pendiente
UPDATE public.inventario_lotes
SET cantidad_disponible = 0,
    estado = 'agotado'
WHERE idinventario IN (
    SELECT id FROM public.inventario
    WHERE TRIM(codigo) IN ('KIXX-050', 'RENAULT002', 'CES-200')
       OR descripcion ILIKE '%KIXX ATF MULT%'
       OR descripcion ILIKE '%MUÑON DE SUSPENCION%'
       OR descripcion ILIKE '%CESPA DE ACEITE DE TRANSMISION%'
) AND (cantidad_disponible > 0 OR estado != 'agotado');

COMMIT;

-- 4. CONSULTA POSTERIOR DE VERIFICACIÓN (Comprobar que los 3 ítems quedaron con los valores solicitados)
SELECT id, codigo, descripcion, stock_inicial, entradas, salidas, cantidad_existente as stock_actual, estado
FROM public.inventario
WHERE TRIM(codigo) IN ('KIXX-050', 'RENAULT002', 'CES-200')
   OR descripcion ILIKE '%KIXX ATF MULT%'
   OR descripcion ILIKE '%MUÑON DE SUSPENCION%'
   OR descripcion ILIKE '%CESPA DE ACEITE DE TRANSMISION%'
ORDER BY codigo;
