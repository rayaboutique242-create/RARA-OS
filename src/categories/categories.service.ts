// src/categories/categories.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto, tenantId: string): Promise<Category> {
    const slug = createCategoryDto.slug || this.generateSlug(createCategoryDto.name);

    const existingCategory = await this.categoryRepository.findOne({
      where: { slug, tenantId },
    });

    if (existingCategory) {
      throw new BadRequestException('Une categorie avec ce slug existe deja');
    }

    if (createCategoryDto.parentId) {
      const parent = await this.categoryRepository.findOne({
        where: { id: createCategoryDto.parentId, tenantId },
      });
      if (!parent) {
        throw new BadRequestException('Categorie parente non trouvee');
      }
    }

    const category = this.categoryRepository.create({
      ...createCategoryDto,
      slug,
      tenantId,
    });

    return this.categoryRepository.save(category);
  }

  async findAll(tenantId: string, query: QueryCategoryDto): Promise<Category[]> {
    const { search, isActive, rootOnly, parentId } = query;

    const queryBuilder = this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.children', 'children')
      .where('category.tenant_id = :tenantId', { tenantId });

    if (search) {
      queryBuilder.andWhere(
        '(category.name LIKE :search OR category.description LIKE :search)',
        { search: '%' + search + '%' },
      );
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('category.is_active = :isActive', { isActive });
    }

    if (rootOnly) {
      queryBuilder.andWhere('category.parent_id IS NULL');
    } else if (parentId) {
      queryBuilder.andWhere('category.parent_id = :parentId', { parentId });
    }

    queryBuilder.orderBy('category.sort_order', 'ASC').addOrderBy('category.name', 'ASC');

    return queryBuilder.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id, tenantId },
      relations: ['children', 'parent'],
    });

    if (!category) {
      throw new NotFoundException('Categorie non trouvee');
    }

    return category;
  }

  async findBySlug(slug: string, tenantId: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { slug, tenantId },
      relations: ['children'],
    });

    if (!category) {
      throw new NotFoundException('Categorie non trouvee');
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto, tenantId: string): Promise<Category> {
    const category = await this.findOne(id, tenantId);

    if (updateCategoryDto.slug && updateCategoryDto.slug !== category.slug) {
      const existingCategory = await this.categoryRepository.findOne({
        where: { slug: updateCategoryDto.slug, tenantId },
      });
      if (existingCategory) {
        throw new BadRequestException('Une categorie avec ce slug existe deja');
      }
    }

    if (updateCategoryDto.parentId) {
      if (updateCategoryDto.parentId === id) {
        throw new BadRequestException('Une categorie ne peut pas etre son propre parent');
      }
      const parent = await this.categoryRepository.findOne({
        where: { id: updateCategoryDto.parentId, tenantId },
      });
      if (!parent) {
        throw new BadRequestException('Categorie parente non trouvee');
      }
    }

    Object.assign(category, updateCategoryDto);
    return this.categoryRepository.save(category);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const category = await this.findOne(id, tenantId);

    if (category.children && category.children.length > 0) {
      throw new BadRequestException('Impossible de supprimer une categorie avec des sous-categories');
    }

    if (category.productCount > 0) {
      throw new BadRequestException('Impossible de supprimer une categorie contenant des produits');
    }

    await this.categoryRepository.remove(category);
  }

  async getTree(tenantId: string): Promise<Category[]> {
    const categories = await this.categoryRepository.find({
      where: { tenantId, parentId: IsNull() },
      relations: ['children', 'children.children'],
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    return categories;
  }

  async updateProductCount(categoryId: string, tenantId: string, delta: number): Promise<void> {
    await this.categoryRepository
      .createQueryBuilder()
      .update(Category)
      .set({ productCount: () => 'product_count + ' + delta })
      .where('id = :id AND tenant_id = :tenantId', { id: categoryId, tenantId })
      .execute();
  }

  async reorder(categoryIds: string[], tenantId: string): Promise<void> {
    for (let i = 0; i < categoryIds.length; i++) {
      await this.categoryRepository.update(
        { id: categoryIds[i], tenantId },
        { sortOrder: i },
      );
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
