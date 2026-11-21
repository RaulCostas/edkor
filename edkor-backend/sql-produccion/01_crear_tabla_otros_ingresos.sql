-- ==============================================================================
-- SCRIPT 1: CREACIÓN DE LA TABLA 'otros_ingresos' (Producción)
-- Herramienta recomendada: DBeaver / pgAdmin / psql
-- Base de datos: PostgreSQL
-- ==============================================================================

BEGIN;

-- 1. Crear secuencia para el ID autoincremental si no existe
CREATE SEQUENCE IF NOT EXISTS public.otros_ingresos_id_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

-- 2. Crear tabla otros_ingresos
CREATE TABLE IF NOT EXISTS public.otros_ingresos (
    id integer NOT NULL DEFAULT nextval('public.otros_ingresos_id_seq'::regclass),
    nro integer,
    fecha date NOT NULL DEFAULT CURRENT_DATE,
    motivo text NOT NULL,
    tipo_ingreso character varying(100) NOT NULL DEFAULT 'Venta de Insumo'::character varying,
    monto numeric(12, 2) NOT NULL,
    moneda character varying(20) NOT NULL DEFAULT 'Bolivianos'::character varying,
    observacion text,
    cliente character varying(255),
    telefono_cliente character varying(50),
    placa character varying(50),
    comprobante character varying(100),
    asesor_id integer,
    forma_pago_id integer,
    sucursal_id integer,
    idinventario integer,
    cantidad double precision NOT NULL DEFAULT 1,
    descontar_stock boolean NOT NULL DEFAULT false,
    idusuario integer,
    estado character varying(50) NOT NULL DEFAULT 'activo'::character varying,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now(),
    
    -- Clave primaria
    CONSTRAINT pk_otros_ingresos PRIMARY KEY (id),
    
    -- Claves foráneas con eliminación protegida (SET NULL)
    CONSTRAINT fk_otros_ingresos_asesor 
        FOREIGN KEY (asesor_id) REFERENCES public.personal(id) 
        ON UPDATE CASCADE ON DELETE SET NULL,
        
    CONSTRAINT fk_otros_ingresos_forma_pago 
        FOREIGN KEY (forma_pago_id) REFERENCES public.forma_pago(id) 
        ON UPDATE CASCADE ON DELETE SET NULL,
        
    CONSTRAINT fk_otros_ingresos_sucursal 
        FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id) 
        ON UPDATE CASCADE ON DELETE SET NULL,
        
    CONSTRAINT fk_otros_ingresos_inventario 
        FOREIGN KEY (idinventario) REFERENCES public.inventario(id) 
        ON UPDATE CASCADE ON DELETE SET NULL,
        
    CONSTRAINT fk_otros_ingresos_usuario 
        FOREIGN KEY (idusuario) REFERENCES public.users(id) 
        ON UPDATE CASCADE ON DELETE SET NULL
);

-- 3. Vincular propiedad de la secuencia a la columna id
ALTER SEQUENCE public.otros_ingresos_id_seq OWNED BY public.otros_ingresos.id;

-- 4. Índices para acelerar búsquedas y generación de reportes
CREATE INDEX IF NOT EXISTS idx_otros_ingresos_fecha ON public.otros_ingresos (fecha);
CREATE INDEX IF NOT EXISTS idx_otros_ingresos_sucursal ON public.otros_ingresos (sucursal_id);
CREATE INDEX IF NOT EXISTS idx_otros_ingresos_estado ON public.otros_ingresos (estado);
CREATE INDEX IF NOT EXISTS idx_otros_ingresos_tipo ON public.otros_ingresos (tipo_ingreso);

COMMIT;

-- Verificación de la creación de la tabla
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'otros_ingresos'
ORDER BY ordinal_position;
