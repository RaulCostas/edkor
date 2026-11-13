import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveEstadoFromTrabajoAsignado1768836263308 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trabajos_asignados" DROP COLUMN "estado"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trabajos_asignados" ADD "estado" text NOT NULL DEFAULT 'activo'`);
    }

}
