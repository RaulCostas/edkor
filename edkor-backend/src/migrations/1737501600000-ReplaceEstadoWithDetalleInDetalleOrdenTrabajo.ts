import { MigrationInterface, QueryRunner } from "typeorm";

export class ReplaceEstadoWithDetalleInDetalleOrdenTrabajo1737501600000 implements MigrationInterface {
    name = 'ReplaceEstadoWithDetalleInDetalleOrdenTrabajo1737501600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Rename column from estado to detalle
        await queryRunner.query(`ALTER TABLE "detalle_orden_trabajo" RENAME COLUMN "estado" TO "detalle"`);

        // Alter column to remove default and make nullable
        await queryRunner.query(`ALTER TABLE "detalle_orden_trabajo" ALTER COLUMN "detalle" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "detalle_orden_trabajo" ALTER COLUMN "detalle" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Rename column back from detalle to estado
        await queryRunner.query(`ALTER TABLE "detalle_orden_trabajo" RENAME COLUMN "detalle" TO "estado"`);

        // Restore default and NOT NULL constraint
        await queryRunner.query(`ALTER TABLE "detalle_orden_trabajo" ALTER COLUMN "estado" SET DEFAULT 'activo'`);
        await queryRunner.query(`ALTER TABLE "detalle_orden_trabajo" ALTER COLUMN "estado" SET NOT NULL`);
    }
}
