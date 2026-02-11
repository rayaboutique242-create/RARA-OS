import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStoreIdToPaymentsReturns1739200000001 implements MigrationInterface {
    name = 'AddStoreIdToPaymentsReturns1739200000001';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const isPostgres = queryRunner.connection.driver.options.type === 'postgres';
        const uuid = isPostgres ? 'uuid' : 'varchar(36)';

        await queryRunner.query(`ALTER TABLE "transactions" ADD COLUMN "storeId" ${uuid}`);
        await queryRunner.query(`ALTER TABLE "refunds" ADD COLUMN "storeId" ${uuid}`);
        await queryRunner.query(`ALTER TABLE "return_requests" ADD COLUMN "storeId" ${uuid}`);
        await queryRunner.query(`ALTER TABLE "store_credits" ADD COLUMN "storeId" ${uuid}`);

        await queryRunner.query(`CREATE INDEX "idx_transactions_store" ON "transactions"("storeId")`);
        await queryRunner.query(`CREATE INDEX "idx_refunds_store" ON "refunds"("storeId")`);
        await queryRunner.query(`CREATE INDEX "idx_return_requests_store" ON "return_requests"("storeId")`);
        await queryRunner.query(`CREATE INDEX "idx_store_credits_store" ON "store_credits"("storeId")`);

        await queryRunner.query(`
            UPDATE "transactions"
            SET "storeId" = (
                SELECT o."storeId"
                FROM "orders" o
                WHERE o."id" = "transactions"."orderId"
                LIMIT 1
            )
            WHERE "storeId" IS NULL AND "orderId" IS NOT NULL
        `);

        await queryRunner.query(`
            UPDATE "refunds"
            SET "storeId" = (
                SELECT t."storeId"
                FROM "transactions" t
                WHERE t."id" = "refunds"."transactionId"
                LIMIT 1
            )
            WHERE "storeId" IS NULL AND "transactionId" IS NOT NULL
        `);

        await queryRunner.query(`
            UPDATE "return_requests"
            SET "storeId" = (
                SELECT o."storeId"
                FROM "orders" o
                WHERE o."orderNumber" = "return_requests"."orderNumber"
                LIMIT 1
            )
            WHERE "storeId" IS NULL AND "orderNumber" IS NOT NULL
        `);

        await queryRunner.query(`
            UPDATE "store_credits"
            SET "storeId" = (
                SELECT rr."storeId"
                FROM "return_requests" rr
                WHERE rr."id" = "store_credits"."returnRequestId"
                LIMIT 1
            )
            WHERE "storeId" IS NULL AND "returnRequestId" IS NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "idx_store_credits_store"`);
        await queryRunner.query(`DROP INDEX "idx_return_requests_store"`);
        await queryRunner.query(`DROP INDEX "idx_refunds_store"`);
        await queryRunner.query(`DROP INDEX "idx_transactions_store"`);

        await queryRunner.query(`ALTER TABLE "store_credits" DROP COLUMN "storeId"`);
        await queryRunner.query(`ALTER TABLE "return_requests" DROP COLUMN "storeId"`);
        await queryRunner.query(`ALTER TABLE "refunds" DROP COLUMN "storeId"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "storeId"`);
    }
}
