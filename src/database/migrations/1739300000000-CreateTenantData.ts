import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateTenantData1739300000000 implements MigrationInterface {
  name = 'CreateTenantData1739300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table already exists (idempotent)
    const hasTable = await queryRunner.hasTable('tenant_data');
    if (hasTable) return;

    await queryRunner.createTable(
      new Table({
        name: 'tenant_data',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'tenantId',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'collection',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'data',
            type: 'text',
            default: "'[]'",
          },
          {
            name: 'version',
            type: 'int',
            default: 0,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'tenant_data',
      new TableIndex({
        name: 'IDX_tenant_data_tenant_collection',
        columnNames: ['tenantId', 'collection'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('tenant_data', true);
  }
}
