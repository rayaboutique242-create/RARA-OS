import { MigrationInterface, QueryRunner } from "typeorm";

export class BackfillStoreIdCustomersProducts1739200000002 implements MigrationInterface {
    name = 'BackfillStoreIdCustomersProducts1739200000002';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE "customers"
            SET "storeId" = (
                SELECT s."id"
                FROM "stores" s
                WHERE s."tenantId" = "customers"."tenantId"
                ORDER BY s."createdAt" ASC
                LIMIT 1
            )
            WHERE "storeId" IS NULL
        `);

        await queryRunner.query(`
            UPDATE "products"
            SET "storeId" = (
                SELECT s."id"
                FROM "stores" s
                WHERE s."tenantId" = "products"."tenantId"
                ORDER BY s."createdAt" ASC
                LIMIT 1
            )
            WHERE "storeId" IS NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "customers" SET "storeId" = NULL`);
        await queryRunner.query(`UPDATE "products" SET "storeId" = NULL`);
    }
}
