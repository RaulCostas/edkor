import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { FormaPagoModule } from './forma-pago/forma-pago.module';
import { CategoriaServicioModule } from './categoria-servicio/categoria-servicio.module';
import { SegurosModule } from './seguros/seguros.module';
import { InspectoresModule } from './inspectores/inspectores.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { AreaPersonalModule } from './area-personal/area-personal.module';
import { MarcaAutoModule } from './marca-auto/marca-auto.module';
import { PersonalModule } from './personal/personal.module';
import { PreciosSegurosModule } from './precios-seguros/precios-seguros.module';
import { PreciosTallerModule } from './precios-taller/precios-taller.module';
import { TiposVehiculosModule } from './tipos-vehiculos/tipos-vehiculos.module';
import { OrdenesTrabajoModule } from './ordenes-trabajo/ordenes-trabajo.module';
import { DetalleOrdenTrabajoModule } from './detalle-orden-trabajo/detalle-orden-trabajo.module';
import { TrabajosAsignadosModule } from './trabajos-asignados/trabajos-asignados.module';
import { FilesModule } from './files/files.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { UnidadMedidaModule } from './unidad-medida/unidad-medida.module';
import { GrupoInventarioModule } from './grupo-inventario/grupo-inventario.module';
import { InventarioModule } from './inventario/inventario.module';
import { MaterialPedidoModule } from './material-pedido/material-pedido.module';
import { DetalleMaterialPedidoModule } from './detalle-material-pedido/detalle-material-pedido.module';
import { PagoPedidosModule } from './pago-pedidos/pago-pedidos.module';
import { CorreosModule } from './correos/correos.module';
import { EgresosModule } from './egresos/egresos.module';
import { ChatModule } from './chat/chat.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { MaterialUtilizadoModule } from './material-utilizado/material-utilizado.module';
import { CompraInsumosModule } from './compra-insumos/compra-insumos.module';
import { PagoOrdenModule } from './pago-orden/pago-orden.module';
import { SeguimientoRepuestoModule } from './seguimiento-repuesto/seguimiento-repuesto.module';
import { CotizacionesModule } from './cotizaciones/cotizaciones.module';
import { PagosTrabajosAsignadosModule } from './pagos-trabajos-asignados/pagos-trabajos-asignados.module';
import { FaltasModule } from './faltas/faltas.module';
import { AnticiposModule } from './anticipos/anticipos.module';
import { ComisionTarjetaModule } from './comision-tarjeta/comision-tarjeta.module';
import { GastosFijosModule } from './gastos_fijos/gastos_fijos.module';
import { PagosGastosFijosModule } from './pagos_gastos_fijos/pagos_gastos_fijos.module';
import { PlanillasModule } from './planillas/planillas.module';
import { PagosPlanillasModule } from './pagos-planillas/pagos-planillas.module';
import { ReportesModule } from './reportes/reportes.module';
import { SucursalesModule } from './sucursales/sucursales.module';
import { HojaRecepcionModule } from './hoja-recepcion/hoja-recepcion.module';
import { RolesModule } from './roles/roles.module';
import { TipoOrdenModule } from './tipo-orden/tipo-orden.module';
import { OtrosIngresosModule } from './otros-ingresos/otros-ingresos.module';
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5433'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgrespg',
      database: process.env.DB_NAME || 'edkor',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // Auto-create tables (dev only)
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    UsersModule,
    FormaPagoModule, // Módulo de Formas de Pago
    CategoriaServicioModule,
    SegurosModule,
    InspectoresModule,
    FilesModule,
    ProveedoresModule,
    AreaPersonalModule,
    MarcaAutoModule,
    PersonalModule,
    PreciosSegurosModule,
    PreciosTallerModule,
    TiposVehiculosModule,
    OrdenesTrabajoModule,
    DetalleOrdenTrabajoModule,
    TrabajosAsignadosModule,
    UnidadMedidaModule,
    GrupoInventarioModule,
    InventarioModule,
    MaterialPedidoModule,
    DetalleMaterialPedidoModule,
    PagoPedidosModule,
    CorreosModule,
    EgresosModule,
    ChatModule,
    ChatbotModule,
    MaterialUtilizadoModule,
    CompraInsumosModule,
    PagoOrdenModule,
    SeguimientoRepuestoModule,
    CotizacionesModule,
    PagosTrabajosAsignadosModule,
    FaltasModule,
    AnticiposModule,
    ComisionTarjetaModule,
    GastosFijosModule,
    PagosGastosFijosModule,
    PlanillasModule,
    PagosPlanillasModule,
    ReportesModule,
    SucursalesModule,
    HojaRecepcionModule,
    RolesModule,
    TipoOrdenModule,
    OtrosIngresosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
