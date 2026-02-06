// src/exports/exports.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { ExportsService } from './exports.service';
import { ExportsController } from './exports.controller';
import { ExportJob } from './entities/export-job.entity';
import { ImportJob } from './entities/import-job.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { Customer } from '../customers/entities/customer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExportJob,
      ImportJob,
      Order,
      OrderItem,
      Product,
      Customer,
    ]),
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
      },
      fileFilter: (req, file, callback) => {
        if (file.mimetype === 'text/csv' || 
            file.originalname.endsWith('.csv') ||
            file.mimetype === 'application/vnd.ms-excel' ||
            file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
          callback(null, true);
        } else {
          callback(new Error('Seuls les fichiers CSV et Excel sont acceptés'), false);
        }
      },
    }),
  ],
  controllers: [ExportsController],
  providers: [ExportsService],
  exports: [ExportsService],
})
export class ExportsModule {}
