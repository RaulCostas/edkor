-- Script para limpiar todas las órdenes de trabajo y sus detalles
-- ADVERTENCIA: Este script eliminará TODOS los datos de órdenes de trabajo

-- Primero eliminar los detalles (por la relación de clave foránea)
DELETE FROM detalle_orden_trabajo;

-- Luego eliminar las órdenes de trabajo
DELETE FROM orden_trabajo;

-- Reiniciar las secuencias de IDs (opcional)
ALTER SEQUENCE detalle_orden_trabajo_id_seq RESTART WITH 1;
ALTER SEQUENCE orden_trabajo_id_seq RESTART WITH 1;

-- Verificar que se eliminaron todos los registros
SELECT COUNT(*) as total_detalles FROM detalle_orden_trabajo;
SELECT COUNT(*) as total_ordenes FROM orden_trabajo;
