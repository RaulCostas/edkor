import { MigrationInterface, QueryRunner } from "typeorm";

export class CleanOldTrabajoAsignado1768837268739 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Delete all existing records to clean up old 'inactivo' records
        await queryRunner.query(`DELETE FROM "trabajos_asignados"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Cannot restore deleted data
    }

}
