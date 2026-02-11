// src/products/products.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto, tenantId: string, userId: string, storeId?: string): Promise<Product> {
    const existingWhere: Record<string, any> = { sku: createProductDto.sku, tenantId };
    if (storeId) {
      existingWhere.storeId = storeId;
    }

    const existingProduct = await this.productRepository.findOne({
      where: existingWhere,
    });

    if (existingProduct) {
      throw new BadRequestException('Un produit avec ce SKU existe déjà');
    }

    const product = this.productRepository.create({
      ...createProductDto,
      tenantId,
      storeId,
      createdBy: userId,
    });

    return this.productRepository.save(product);
  }

  async findAll(tenantId: string, query: QueryProductDto, storeId?: string) {
    const { search, categoryId, isActive, isFeatured, lowStock } = query;
    const page = query.page || 1;
    const limit = query.limit || 20;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'DESC';

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .where('product.tenant_id = :tenantId', { tenantId });

    if (storeId) {
      queryBuilder.andWhere('product.store_id = :storeId', { storeId });
    }

    if (search) {
      queryBuilder.andWhere(
        '(product.name LIKE :search OR product.sku LIKE :search OR product.barcode LIKE :search)',
        { search: '%' + search + '%' },
      );
    }

    if (categoryId) {
      queryBuilder.andWhere('product.category_id = :categoryId', { categoryId });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('product.is_active = :isActive', { isActive });
    }

    if (isFeatured !== undefined) {
      queryBuilder.andWhere('product.is_featured = :isFeatured', { isFeatured });
    }

    if (lowStock) {
      queryBuilder.andWhere('product.stock_quantity <= product.min_stock_level');
    }

    const validSortFields = ['name', 'sku', 'sellingPrice', 'stockQuantity', 'createdAt', 'updatedAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy('product.' + sortField, sortOrder === 'ASC' ? 'ASC' : 'DESC');

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [products, total] = await queryBuilder.getManyAndCount();

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, tenantId: string, storeId?: string): Promise<Product> {
    const where: Record<string, any> = { id, tenantId };
    if (storeId) {
      where.storeId = storeId;
    }

    const product = await this.productRepository.findOne({
      where,
    });

    if (!product) {
      throw new NotFoundException('Produit non trouvé');
    }

    return product;
  }

  async findBySku(sku: string, tenantId: string, storeId?: string): Promise<Product> {
    const where: Record<string, any> = { sku, tenantId };
    if (storeId) {
      where.storeId = storeId;
    }

    const product = await this.productRepository.findOne({
      where,
    });

    if (!product) {
      throw new NotFoundException('Produit non trouvé');
    }

    return product;
  }

  async findByBarcode(barcode: string, tenantId: string, storeId?: string): Promise<Product> {
    const where: Record<string, any> = { barcode, tenantId };
    if (storeId) {
      where.storeId = storeId;
    }

    const product = await this.productRepository.findOne({
      where,
    });

    if (!product) {
      throw new NotFoundException('Produit non trouvé');
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto, tenantId: string, storeId?: string): Promise<Product> {
    const product = await this.findOne(id, tenantId, storeId);

    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const existingProduct = await this.productRepository.findOne({
        where: storeId ? { sku: updateProductDto.sku, tenantId, storeId } : { sku: updateProductDto.sku, tenantId },
      });
      if (existingProduct) {
        throw new BadRequestException('Un produit avec ce SKU existe déjà');
      }
    }

    Object.assign(product, updateProductDto);
    return this.productRepository.save(product);
  }

  async remove(id: string, tenantId: string, storeId?: string): Promise<void> {
    const product = await this.findOne(id, tenantId, storeId);
    await this.productRepository.remove(product);
  }

  async updateStock(id: string, quantity: number, tenantId: string, storeId?: string): Promise<Product> {
    const product = await this.findOne(id, tenantId, storeId);
    product.stockQuantity = quantity;
    return this.productRepository.save(product);
  }

  async adjustStock(id: string, adjustment: number, tenantId: string, storeId?: string): Promise<Product> {
    const product = await this.findOne(id, tenantId, storeId);
    const newQuantity = product.stockQuantity + adjustment;

    if (newQuantity < 0) {
      throw new BadRequestException('Stock insuffisant');
    }

    product.stockQuantity = newQuantity;
    return this.productRepository.save(product);
  }

  async getLowStockProducts(tenantId: string, storeId?: string): Promise<Product[]> {
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .where('product.tenant_id = :tenantId', { tenantId })
      .andWhere('product.stock_quantity <= product.min_stock_level')
      .andWhere('product.is_active = :isActive', { isActive: true });

    if (storeId) {
      queryBuilder.andWhere('product.store_id = :storeId', { storeId });
    }

    return queryBuilder.getMany();
  }

  async getProductStats(tenantId: string, storeId?: string) {
    const baseWhere: Record<string, any> = { tenantId };
    if (storeId) {
      baseWhere.storeId = storeId;
    }

    const totalProducts = await this.productRepository.count({ where: baseWhere });
    const activeProducts = await this.productRepository.count({ where: { ...baseWhere, isActive: true } });
    const lowStockQuery = this.productRepository
      .createQueryBuilder('product')
      .where('product.tenant_id = :tenantId', { tenantId })
      .andWhere('product.stock_quantity <= product.min_stock_level');

    if (storeId) {
      lowStockQuery.andWhere('product.store_id = :storeId', { storeId });
    }

    const lowStockProducts = await lowStockQuery.getCount();

    const totalStockQuery = this.productRepository
      .createQueryBuilder('product')
      .where('product.tenant_id = :tenantId', { tenantId })
      .select('SUM(product.stock_quantity * product.purchase_price)', 'value');

    if (storeId) {
      totalStockQuery.andWhere('product.store_id = :storeId', { storeId });
    }

    const totalStockValue = await totalStockQuery.getRawOne();

    return {
      totalProducts,
      activeProducts,
      inactiveProducts: totalProducts - activeProducts,
      lowStockProducts,
      totalStockValue: parseFloat(totalStockValue?.value || '0'),
    };
  }
}
