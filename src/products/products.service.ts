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

  async create(createProductDto: CreateProductDto, tenantId: string, userId: string): Promise<Product> {
    const existingProduct = await this.productRepository.findOne({
      where: { sku: createProductDto.sku, tenantId },
    });

    if (existingProduct) {
      throw new BadRequestException('Un produit avec ce SKU existe déjà');
    }

    const product = this.productRepository.create({
      ...createProductDto,
      tenantId,
      createdBy: userId,
    });

    return this.productRepository.save(product);
  }

  async findAll(tenantId: string, query: QueryProductDto) {
    const { search, categoryId, isActive, isFeatured, lowStock } = query;
    const page = query.page || 1;
    const limit = query.limit || 20;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'DESC';

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .where('product.tenant_id = :tenantId', { tenantId });

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

  async findOne(id: string, tenantId: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id, tenantId },
    });

    if (!product) {
      throw new NotFoundException('Produit non trouvé');
    }

    return product;
  }

  async findBySku(sku: string, tenantId: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { sku, tenantId },
    });

    if (!product) {
      throw new NotFoundException('Produit non trouvé');
    }

    return product;
  }

  async findByBarcode(barcode: string, tenantId: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { barcode, tenantId },
    });

    if (!product) {
      throw new NotFoundException('Produit non trouvé');
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto, tenantId: string): Promise<Product> {
    const product = await this.findOne(id, tenantId);

    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const existingProduct = await this.productRepository.findOne({
        where: { sku: updateProductDto.sku, tenantId },
      });
      if (existingProduct) {
        throw new BadRequestException('Un produit avec ce SKU existe déjà');
      }
    }

    Object.assign(product, updateProductDto);
    return this.productRepository.save(product);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const product = await this.findOne(id, tenantId);
    await this.productRepository.remove(product);
  }

  async updateStock(id: string, quantity: number, tenantId: string): Promise<Product> {
    const product = await this.findOne(id, tenantId);
    product.stockQuantity = quantity;
    return this.productRepository.save(product);
  }

  async adjustStock(id: string, adjustment: number, tenantId: string): Promise<Product> {
    const product = await this.findOne(id, tenantId);
    const newQuantity = product.stockQuantity + adjustment;

    if (newQuantity < 0) {
      throw new BadRequestException('Stock insuffisant');
    }

    product.stockQuantity = newQuantity;
    return this.productRepository.save(product);
  }

  async getLowStockProducts(tenantId: string): Promise<Product[]> {
    return this.productRepository
      .createQueryBuilder('product')
      .where('product.tenant_id = :tenantId', { tenantId })
      .andWhere('product.stock_quantity <= product.min_stock_level')
      .andWhere('product.is_active = :isActive', { isActive: true })
      .getMany();
  }

  async getProductStats(tenantId: string) {
    const totalProducts = await this.productRepository.count({ where: { tenantId } });
    const activeProducts = await this.productRepository.count({ where: { tenantId, isActive: true } });
    const lowStockProducts = await this.productRepository
      .createQueryBuilder('product')
      .where('product.tenant_id = :tenantId', { tenantId })
      .andWhere('product.stock_quantity <= product.min_stock_level')
      .getCount();

    const totalStockValue = await this.productRepository
      .createQueryBuilder('product')
      .where('product.tenant_id = :tenantId', { tenantId })
      .select('SUM(product.stock_quantity * product.purchase_price)', 'value')
      .getRawOne();

    return {
      totalProducts,
      activeProducts,
      inactiveProducts: totalProducts - activeProducts,
      lowStockProducts,
      totalStockValue: parseFloat(totalStockValue?.value || '0'),
    };
  }
}
