-- ==============================================================================
-- SCRIPT 2: UNIFICAR Y ELIMINAR DUPLICADOS DE "Filtros" EN 'grupo_inventario'
-- Herramienta recomendada: DBeaver / pgAdmin / psql
-- Base de datos: PostgreSQL
-- ==============================================================================

BEGIN;

-- 1. CONSULTA PREVIA DE CONTROL (Para ver qué IDs existen antes de unificar)
-- En DBeaver puedes ejecutar esta consulta para ver los registros duplicados:
SELECT id, grupo, estado 
FROM public.grupo_inventario 
WHERE LOWER(TRIM(grupo)) = 'filtros'
ORDER BY id ASC;

-- 2. BLOQUE DE UNIFICACIÓN SEGURA
DO $$
DECLARE
    v_id_conservar INTEGER;
    v_cantidad_duplicados INTEGER;
    v_items_actualizados INTEGER := 0;
BEGIN
    -- Determinar el ID principal que se va a conservar (el menor ID registrado)
    SELECT MIN(id) INTO v_id_conservar
    FROM public.grupo_inventario
    WHERE LOWER(TRIM(grupo)) = 'filtros';

    IF v_id_conservar IS NULL THEN
        RAISE NOTICE 'No se encontró ningún grupo con el nombre "Filtros".';
        RETURN;
    END IF;

    -- Contar cuántos duplicados existen además del principal
    SELECT COUNT(*) INTO v_cantidad_duplicados
    FROM public.grupo_inventario
    WHERE LOWER(TRIM(grupo)) = 'filtros' AND id != v_id_conservar;

    RAISE NOTICE 'ID principal que se conservará: %', v_id_conservar;
    RAISE NOTICE 'Cantidad de registros duplicados a unificar/eliminar: %', v_cantidad_duplicados;

    IF v_cantidad_duplicados > 0 THEN
        -- 2.1 Reasignar cualquier producto en inventario que apunte a los IDs duplicados hacia el ID principal
        UPDATE public.inventario
        SET id_grupo_inventario = v_id_conservar
        WHERE id_grupo_inventario IN (
            SELECT id FROM public.grupo_inventario 
            WHERE LOWER(TRIM(grupo)) = 'filtros' AND id != v_id_conservar
        );

        GET DIAGNOSTICS v_items_actualizados = ROW_COUNT;
        RAISE NOTICE 'Productos de inventario reasignados al ID %: %', v_id_conservar, v_items_actualizados;

        -- 2.2 Eliminar los registros duplicados de grupo_inventario
        DELETE FROM public.grupo_inventario
        WHERE LOWER(TRIM(grupo)) = 'filtros' AND id != v_id_conservar;

        RAISE NOTICE 'Registros duplicados eliminados exitosamente.';
    ELSE
        RAISE NOTICE 'No existen duplicados para el grupo "Filtros".';
    END IF;

    -- Asegurar que el registro conservado quede activo y con formato limpio
    UPDATE public.grupo_inventario
    SET grupo = 'Filtros', estado = 'activo'
    WHERE id = v_id_conservar;

END $$;

COMMIT;

-- 3. CONSULTA POSTERIOR DE VERIFICACIÓN
-- Debe quedar únicamente 1 registro de "Filtros"
SELECT id, grupo, estado 
FROM public.grupo_inventario 
WHERE LOWER(TRIM(grupo)) = 'filtros';

-- Ver los productos de inventario vinculados al grupo Filtros unificado
SELECT i.id, i.codigo, i.descripcion, g.id as grupo_id, g.grupo
FROM public.inventario i
JOIN public.grupo_inventario g ON g.id = i.id_grupo_inventario
WHERE LOWER(TRIM(g.grupo)) = 'filtros'
ORDER BY i.descripcion;
