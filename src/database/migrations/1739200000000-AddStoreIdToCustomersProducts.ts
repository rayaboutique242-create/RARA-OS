import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStoreIdToCustomersProducts1739200000000 implements MigrationInterface {
    name = 'AddStoreIdToCustomersProducts1739200000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const isPostgres = queryRunner.connection.driver.options.type === 'postgres';
        const uuid = isPostgres ? 'uuid' : 'varchar(36)';

        await queryRunner.query(`ALTER TABLE "customers" ADD COLUMN "storeId" ${uuid}`);
        await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "storeId" ${uuid}`);

        await queryRunner.query(`CREATE INDEX "idx_customers_store" ON "customers"("storeId")`);
        await queryRunner.query(`CREATE INDEX "idx_products_store" ON "products"("storeId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "idx_products_store"`);
        await queryRunner.query(`DROP INDEX "idx_customers_store"`);

        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "storeId"`);
        await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "storeId"`);
    }
}
