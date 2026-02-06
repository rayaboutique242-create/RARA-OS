// src/exports/exports.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

import { ExportJob, ExportFormat, ExportType, JobStatus } from './entities/export-job.entity';
import { ImportJob, ImportType, ImportStatus } from './entities/import-job.entity';
import { CreateExportDto, ExportInvoiceDto, BulkExportDto } from './dto/create-export.dto';
import { CreateImportDto, ImportOptionsDto } from './dto/create-import.dto';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { Customer } from '../customers/entities/customer.entity';

@Injectable()
export class ExportsService {
  private readonly uploadsDir = path.join(process.cwd(), 'uploads', 'exports');
  private readonly importsDir = path.join(process.cwd(), 'uploads', 'imports');

  constructor(
    @InjectRepository(ExportJob)
    private exportJobRepository: Repository<ExportJob>,
    @InjectRepository(ImportJob)
    private importJobRepository: Repository<ImportJob>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  ) {
    // Créer les dossiers s'ils n'existent pas
    this.ensureDirectoryExists(this.uploadsDir);
    this.ensureDirectoryExists(this.importsDir);
  }

  private ensureDirectoryExists(dir: string) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private generateCode(prefix: string): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}-${code}`;
  }

  // ==================== EXPORTS ====================

  async createExport(dto: CreateExportDto, userId: number, userName: string, tenantId?: string): Promise<ExportJob> {
    const job = new ExportJob();
    Object.assign(job, {
      jobCode: this.generateCode('EXP'),
      tenantId: tenantId ?? null,
      type: dto.type,
      format: dto.format,
      status: JobStatus.PENDING,
      filtersJson: dto.filters ? JSON.stringify(dto.filters) : null,
      columnsJson: dto.columns ? JSON.stringify(dto.columns) : null,
      requestedBy: userId,
      requestedByName: userName,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    });

    const savedJob = await this.exportJobRepository.save(job);
    
    // Traitement asynchrone
    this.processExport(savedJob.id);

    return savedJob;
  }

  async processExport(jobId: number): Promise<void> {
    const job = await this.exportJobRepository.findOne({ where: { id: jobId } });
    if (!job) return;

    try {
      job.status = JobStatus.PROCESSING;
      job.startedAt = new Date();
      await this.exportJobRepository.save(job);

      const filters = job.filtersJson ? JSON.parse(job.filtersJson) : {};
      const columns = job.columnsJson ? JSON.parse(job.columnsJson) : null;

      let data: any[] = [];
      let headers: string[] = [];

      switch (job.type) {
        case ExportType.ORDERS:
          ({ data, headers } = await this.getOrdersData(filters, columns, job.tenantId));
          break;
        case ExportType.PRODUCTS:
          ({ data, headers } = await this.getProductsData(filters, columns, job.tenantId));
          break;
        case ExportType.CUSTOMERS:
          ({ data, headers } = await this.getCustomersData(filters, columns, job.tenantId));
          break;
        case ExportType.INVENTORY:
          ({ data, headers } = await this.getInventoryData(filters, columns, job.tenantId));
          break;
        case ExportType.SALES_REPORT:
          ({ data, headers } = await this.getSalesReportData(filters, job.tenantId));
          break;
        default:
          throw new Error(`Type d'export non supporté: ${job.type}`);
      }

      job.totalRecords = data.length;
      job.processedRecords = data.length;

      // Générer le fichier
      const fileName = `${job.type.toLowerCase()}_${job.jobCode}_${Date.now()}`;
      let filePath: string;
      let mimeType: string;

      switch (job.format) {
        case ExportFormat.CSV:
          filePath = await this.generateCSV(data, headers, fileName);
          mimeType = 'text/csv';
          break;
        case ExportFormat.EXCEL:
          filePath = await this.generateExcel(data, headers, fileName);
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        case ExportFormat.JSON:
          filePath = await this.generateJSON(data, fileName);
          mimeType = 'application/json';
          break;
        case ExportFormat.PDF:
          filePath = await this.generatePDF(data, headers, fileName, job.type);
          mimeType = 'application/pdf';
          break;
        default:
          throw new Error(`Format non supporté: ${job.format}`);
      }

      const stats = fs.statSync(filePath);
      
      job.filePath = filePath;
      job.fileName = path.basename(filePath);
      job.fileSize = stats.size;
      job.mimeType = mimeType;
      job.status = JobStatus.COMPLETED;
      job.completedAt = new Date();

      await this.exportJobRepository.save(job);

    } catch (error) {
      job.status = JobStatus.FAILED;
      job.errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      job.completedAt = new Date();
      await this.exportJobRepository.save(job);
    }
  }

  private async getOrdersData(filters: any, columns: string[] | null, tenantId?: string): Promise<{ data: any[]; headers: string[] }> {
    const query = this.orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items');

    if (tenantId) {
      query.andWhere('order.tenantId = :tenantId', { tenantId });
    }
    if (filters.startDate) {
      query.andWhere('order.createdAt >= :startDate', { startDate: filters.startDate });
    }
    if (filters.endDate) {
      query.andWhere('order.createdAt <= :endDate', { endDate: filters.endDate });
    }
    if (filters.status) {
      query.andWhere('order.status = :status', { status: filters.status });
    }
    if (filters.ids?.length) {
      query.andWhere('order.id IN (:...ids)', { ids: filters.ids });
    }

    const orders = await query.orderBy('order.createdAt', 'DESC').getMany();

    const defaultHeaders = ['N° Commande', 'Client', 'Téléphone', 'Email', 'Statut', 'Statut Paiement', 'Sous-total', 'Taxes', 'Remise', 'Total', 'Nb Articles', 'Date'];
    const headers = columns || defaultHeaders;

    const data = orders.map(o => ({
      'N° Commande': o.orderNumber,
      'Client': o.customerName || '-',
      'Téléphone': o.customerPhone || '-',
      'Email': o.customerEmail || '-',
      'Statut': o.status,
      'Statut Paiement': o.paymentStatus,
      'Sous-total': Number(o.subtotal || 0).toFixed(2),
      'Taxes': Number(o.taxAmount || 0).toFixed(2),
      'Remise': Number(o.discountAmount || 0).toFixed(2),
      'Total': Number(o.total || 0).toFixed(2),
      'Nb Articles': o.items?.length || 0,
      'Date': new Date(o.createdAt).toLocaleDateString('fr-FR'),
    }));

    return { data, headers };
  }

  private async getProductsData(filters: any, columns: string[] | null, tenantId?: string): Promise<{ data: any[]; headers: string[] }> {
    const query = this.productRepository.createQueryBuilder('product');

    if (tenantId) {
      query.andWhere('product.tenantId = :tenantId', { tenantId });
    }
    if (filters.categoryId) {
      query.andWhere('product.categoryId = :categoryId', { categoryId: filters.categoryId });
    }
    if (filters.search) {
      query.andWhere('(product.name LIKE :search OR product.sku LIKE :search)', { search: `%${filters.search}%` });
    }
    if (filters.ids?.length) {
      query.andWhere('product.id IN (:...ids)', { ids: filters.ids });
    }

    const products = await query.orderBy('product.name', 'ASC').getMany();

    const defaultHeaders = ['SKU', 'Nom', 'Prix Achat', 'Prix Vente', 'Stock', 'Stock Min', 'Actif', 'Catégorie', 'Date Création'];
    const headers = columns || defaultHeaders;

    const data = products.map(p => ({
      'SKU': p.sku,
      'Nom': p.name,
      'Prix Achat': Number(p.purchasePrice || 0).toFixed(2),
      'Prix Vente': Number(p.sellingPrice || 0).toFixed(2),
      'Stock': p.stockQuantity || 0,
      'Stock Min': p.minStockLevel || 0,
      'Actif': p.isActive ? 'Oui' : 'Non',
      'Catégorie': p.categoryId || '-',
      'Date Création': new Date(p.createdAt).toLocaleDateString('fr-FR'),
    }));

    return { data, headers };
  }

  private async getCustomersData(filters: any, columns: string[] | null, tenantId?: string): Promise<{ data: any[]; headers: string[] }> {
    const query = this.customerRepository.createQueryBuilder('customer');

    if (tenantId) {
      query.andWhere('customer.tenantId = :tenantId', { tenantId });
    }
    if (filters.search) {
      query.andWhere('(customer.firstName LIKE :search OR customer.lastName LIKE :search OR customer.email LIKE :search)', 
        { search: `%${filters.search}%` });
    }
    if (filters.ids?.length) {
      query.andWhere('customer.id IN (:...ids)', { ids: filters.ids });
    }

    const customers = await query.orderBy('customer.lastName', 'ASC').getMany();

    const defaultHeaders = ['Code', 'Prénom', 'Nom', 'Email', 'Téléphone', 'Ville', 'Total Achats', 'Nb Commandes', 'Points', 'Date Inscription'];
    const headers = columns || defaultHeaders;

    const data = customers.map(c => ({
      'Code': c.customerCode,
      'Prénom': c.firstName || '-',
      'Nom': c.lastName || '-',
      'Email': c.email || '-',
      'Téléphone': c.phone || '-',
      'Ville': c.city || '-',
      'Total Achats': Number(c.totalSpent || 0).toFixed(2),
      'Nb Commandes': c.totalOrders || 0,
      'Points': c.loyaltyPoints || 0,
      'Date Inscription': new Date(c.createdAt).toLocaleDateString('fr-FR'),
    }));

    return { data, headers };
  }

  private async getInventoryData(filters: any, columns: string[] | null, tenantId?: string): Promise<{ data: any[]; headers: string[] }> {
    const query = this.productRepository.createQueryBuilder('product');

    if (tenantId) {
      query.andWhere('product.tenantId = :tenantId', { tenantId });
    }

    const products = await query.orderBy('product.stockQuantity', 'ASC').getMany();

    const headers = ['SKU', 'Produit', 'Stock Actuel', 'Stock Min', 'Stock Max', 'Valeur Stock', 'Statut', 'Dernière MAJ'];

    const data = products.map(p => {
      const stockValue = (p.stockQuantity || 0) * Number(p.purchasePrice || 0);
      let status = 'Normal';
      if ((p.stockQuantity || 0) <= 0) status = 'Rupture';
      else if ((p.stockQuantity || 0) <= (p.minStockLevel || 0)) status = 'Stock Bas';

      return {
        'SKU': p.sku,
        'Produit': p.name,
        'Stock Actuel': p.stockQuantity || 0,
        'Stock Min': p.minStockLevel || 0,
        'Stock Max': 'N/A',
        'Valeur Stock': stockValue.toFixed(2),
        'Statut': status,
        'Dernière MAJ': new Date(p.updatedAt).toLocaleDateString('fr-FR'),
      };
    });

    return { data, headers };
  }

  private async getSalesReportData(filters: any, tenantId?: string): Promise<{ data: any[]; headers: string[] }> {
    const query = this.orderRepository.createQueryBuilder('order')
      .where('order.status NOT IN (:...excludedStatuses)', { excludedStatuses: [OrderStatus.CANCELLED] });

    if (tenantId) {
      query.andWhere('order.tenantId = :tenantId', { tenantId });
    }
    if (filters.startDate) {
      query.andWhere('order.createdAt >= :startDate', { startDate: filters.startDate });
    }
    if (filters.endDate) {
      query.andWhere('order.createdAt <= :endDate', { endDate: filters.endDate });
    }

    const orders = await query.orderBy('order.createdAt', 'DESC').getMany();

    const headers = ['Date', 'N° Commande', 'Client', 'Montant HT', 'Taxes', 'Remise', 'Total TTC', 'Mode Paiement', 'Statut'];

    const data = orders.map(o => ({
      'Date': new Date(o.createdAt).toLocaleDateString('fr-FR'),
      'N° Commande': o.orderNumber,
      'Client': o.customerName || 'Client Anonyme',
      'Montant HT': Number(o.subtotal || 0).toFixed(2),
      'Taxes': Number(o.taxAmount || 0).toFixed(2),
      'Remise': Number(o.discountAmount || 0).toFixed(2),
      'Total TTC': Number(o.total || 0).toFixed(2),
      'Mode Paiement': o.paymentMethod || '-',
      'Statut': o.status,
    }));

    return { data, headers };
  }

  private async generateCSV(data: any[], headers: string[], fileName: string): Promise<string> {
    const filePath = path.join(this.uploadsDir, `${fileName}.csv`);
    
    // BOM UTF-8 pour Excel
    let csv = '\ufeff';
    csv += headers.join(';') + '\n';
    
    for (const row of data) {
      const values = headers.map(h => {
        const val = row[h] ?? '';
        // Escape quotes and wrap in quotes if contains delimiter
        const strVal = String(val).replace(/"/g, '""');
        return strVal.includes(';') || strVal.includes('\n') ? `"${strVal}"` : strVal;
      });
      csv += values.join(';') + '\n';
    }

    fs.writeFileSync(filePath, csv, 'utf8');
    return filePath;
  }

  private async generateExcel(data: any[], headers: string[], fileName: string): Promise<string> {
    // Génération Excel simple en XML (format compatible)
    const filePath = path.join(this.uploadsDir, `${fileName}.xlsx`);
    
    // On utilise le format CSV avec extension xlsx pour simplicité
    // En production, utiliser une lib comme exceljs
    let content = '\ufeff';
    content += headers.join('\t') + '\n';
    
    for (const row of data) {
      const values = headers.map(h => String(row[h] ?? '').replace(/\t/g, ' '));
      content += values.join('\t') + '\n';
    }

    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
  }

  private async generateJSON(data: any[], fileName: string): Promise<string> {
    const filePath = path.join(this.uploadsDir, `${fileName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return filePath;
  }

  private async generatePDF(data: any[], headers: string[], fileName: string, type: ExportType): Promise<string> {
    // Génération PDF simple en HTML
    const filePath = path.join(this.uploadsDir, `${fileName}.html`);
    
    const title = this.getExportTitle(type);
    const date = new Date().toLocaleDateString('fr-FR', { dateStyle: 'full' });

    let html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
    h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    .meta { color: #666; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #007bff; color: white; padding: 10px; text-align: left; }
    td { padding: 8px; border-bottom: 1px solid #ddd; }
    tr:nth-child(even) { background: #f9f9f9; }
    .footer { margin-top: 30px; text-align: center; color: #999; font-size: 10px; }
    .total { font-weight: bold; background: #e9ecef !important; }
  </style>
</head>
<body>
  <h1>📊 ${title}</h1>
  <div class="meta">
    <p><strong>Date d'export:</strong> ${date}</p>
    <p><strong>Nombre d'enregistrements:</strong> ${data.length}</p>
  </div>
  <table>
    <thead>
      <tr>
        ${headers.map(h => `<th>${h}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${data.map(row => `<tr>${headers.map(h => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`).join('\n')}
    </tbody>
  </table>
  <div class="footer">
    <p>Généré par Raya Boutique Management System - ${new Date().toISOString()}</p>
  </div>
</body>
</html>`;

    fs.writeFileSync(filePath, html, 'utf8');
    return filePath;
  }

  private getExportTitle(type: ExportType): string {
    const titles: Record<string, string> = {
      [ExportType.ORDERS]: 'Rapport des Commandes',
      [ExportType.PRODUCTS]: 'Liste des Produits',
      [ExportType.CUSTOMERS]: 'Liste des Clients',
      [ExportType.INVENTORY]: 'État des Stocks',
      [ExportType.SALES_REPORT]: 'Rapport des Ventes',
      [ExportType.TRANSACTIONS]: 'Historique des Transactions',
    };
    return titles[type] || 'Export de Données';
  }

  async getExportJob(id: number): Promise<ExportJob> {
    const job = await this.exportJobRepository.findOne({ where: { id } });
    if (!job) {
      throw new NotFoundException(`Export #${id} non trouvé`);
    }
    return job;
  }

  async getExportJobs(tenantId?: string, limit = 50): Promise<ExportJob[]> {
    const query: any = {};
    if (tenantId) query.tenantId = tenantId;
    return this.exportJobRepository.find({
      where: query,
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async downloadExport(id: number): Promise<{ filePath: string; fileName: string; mimeType: string }> {
    const job = await this.getExportJob(id);
    
    if (job.status !== JobStatus.COMPLETED) {
      throw new BadRequestException(`L'export n'est pas terminé (statut: ${job.status})`);
    }
    if (!job.filePath || !fs.existsSync(job.filePath)) {
      throw new NotFoundException('Fichier non trouvé');
    }
    if (job.expiresAt && new Date() > job.expiresAt) {
      throw new BadRequestException('Le lien de téléchargement a expiré');
    }

    job.downloadCount += 1;
    await this.exportJobRepository.save(job);

    return {
      filePath: job.filePath,
      fileName: job.fileName,
      mimeType: job.mimeType || 'application/octet-stream',
    };
  }

  async cancelExport(id: number): Promise<ExportJob> {
    const job = await this.getExportJob(id);
    if (job.status === JobStatus.COMPLETED) {
      throw new BadRequestException('Impossible d\'annuler un export terminé');
    }
    job.status = JobStatus.CANCELLED;
    return this.exportJobRepository.save(job);
  }

  async deleteExport(id: number): Promise<void> {
    const job = await this.getExportJob(id);
    if (job.filePath && fs.existsSync(job.filePath)) {
      fs.unlinkSync(job.filePath);
    }
    await this.exportJobRepository.remove(job);
  }

  // ==================== INVOICE EXPORT ====================

  async exportInvoice(dto: ExportInvoiceDto, tenantId?: string): Promise<{ content: string; fileName: string; mimeType: string }> {
    const order = await this.orderRepository.findOne({
      where: { id: dto.orderId },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException(`Commande #${dto.orderId} non trouvée`);
    }

    const invoiceNumber = `FAC-${order.orderNumber}`;
    const date = new Date().toLocaleDateString('fr-FR', { dateStyle: 'long' });

    const itemsHtml = order.items?.map(item => `
      <tr>
        <td>${item.productName}</td>
        <td>${item.productSku}</td>
        <td style="text-align: center">${item.quantity}</td>
        <td style="text-align: right">${Number(item.unitPrice).toFixed(2)} FCFA</td>
        <td style="text-align: right">${Number(item.lineTotal).toFixed(2)} FCFA</td>
      </tr>
    `).join('') || '<tr><td colspan="5">Aucun article</td></tr>';

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture ${invoiceNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    .header { display: flex; justify-content: space-between; border-bottom: 3px solid #007bff; padding-bottom: 20px; }
    .logo { font-size: 28px; font-weight: bold; color: #007bff; }
    .invoice-title { font-size: 24px; color: #666; }
    .info-section { margin: 30px 0; display: flex; justify-content: space-between; }
    .info-box { width: 45%; }
    .info-box h3 { color: #007bff; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 30px 0; }
    th { background: #007bff; color: white; padding: 12px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #ddd; }
    .totals { width: 300px; margin-left: auto; }
    .totals td { padding: 8px; }
    .totals .total-row { font-weight: bold; font-size: 16px; background: #f8f9fa; }
    .footer { margin-top: 50px; text-align: center; color: #999; font-size: 11px; border-top: 1px solid #ddd; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">🛍️ RAYA BOUTIQUE</div>
    <div class="invoice-title">FACTURE</div>
  </div>

  <div class="info-section">
    <div class="info-box">
      <h3>Facturé à</h3>
      <p><strong>${order.customerName || 'Client'}</strong></p>
      <p>${order.customerPhone || ''}</p>
      <p>${order.customerEmail || ''}</p>
      <p>${order.customerAddress || ''}</p>
    </div>
    <div class="info-box">
      <h3>Détails Facture</h3>
      <p><strong>N° Facture:</strong> ${invoiceNumber}</p>
      <p><strong>N° Commande:</strong> ${order.orderNumber}</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Statut:</strong> ${order.paymentStatus}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Produit</th>
        <th>SKU</th>
        <th style="text-align: center">Qté</th>
        <th style="text-align: right">Prix Unit.</th>
        <th style="text-align: right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <table class="totals">
    <tr>
      <td>Sous-total:</td>
      <td style="text-align: right">${Number(order.subtotal || 0).toFixed(2)} FCFA</td>
    </tr>
    <tr>
      <td>Taxes:</td>
      <td style="text-align: right">${Number(order.taxAmount || 0).toFixed(2)} FCFA</td>
    </tr>
    <tr>
      <td>Remise:</td>
      <td style="text-align: right">-${Number(order.discountAmount || 0).toFixed(2)} FCFA</td>
    </tr>
    <tr class="total-row">
      <td>TOTAL TTC:</td>
      <td style="text-align: right">${Number(order.total || 0).toFixed(2)} FCFA</td>
    </tr>
  </table>

  <div class="footer">
    <p>Merci pour votre confiance!</p>
    <p>Raya Boutique - Système de Gestion</p>
  </div>
</body>
</html>`;

    return {
      content: html,
      fileName: `facture_${invoiceNumber}.html`,
      mimeType: 'text/html',
    };
  }

  // ==================== IMPORTS ====================

  async createImport(
    file: { buffer: Buffer; originalname: string; size: number },
    dto: CreateImportDto,
    userId: number,
    userName: string,
    tenantId?: string
  ): Promise<ImportJob> {
    // Sauvegarder le fichier
    const fileName = `${Date.now()}_${file.originalname}`;
    const filePath = path.join(this.importsDir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    const job = new ImportJob();
    Object.assign(job, {
      jobCode: this.generateCode('IMP'),
      tenantId: tenantId ?? null,
      type: dto.type,
      status: ImportStatus.PENDING,
      originalFileName: file.originalname,
      filePath,
      fileSize: file.size,
      columnMappingJson: dto.columnMapping ? JSON.stringify(dto.columnMapping) : null,
      importOptionsJson: dto.options ? JSON.stringify(dto.options) : null,
      dryRun: dto.dryRun ?? false,
      uploadedBy: userId,
      uploadedByName: userName,
    });

    const savedJob = await this.importJobRepository.save(job);

    // Valider le fichier
    await this.validateImport(savedJob.id);

    return this.importJobRepository.findOne({ where: { id: savedJob.id } }) as Promise<ImportJob>;
  }

  async validateImport(jobId: number): Promise<ImportJob> {
    const job = await this.importJobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(`Import #${jobId} non trouvé`);
    }

    job.status = ImportStatus.VALIDATING;
    await this.importJobRepository.save(job);

    try {
      const content = fs.readFileSync(job.filePath, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      const options: ImportOptionsDto = job.importOptionsJson ? JSON.parse(job.importOptionsJson) : {};
      // Auto-detect delimiter: prefer ; then , then \t
      let delimiter = options.delimiter || '';
      if (!delimiter && lines.length > 0) {
        const firstLine = lines[0];
        if (firstLine.includes(';')) delimiter = ';';
        else if (firstLine.includes(',')) delimiter = ',';
        else if (firstLine.includes('\t')) delimiter = '\t';
        else delimiter = ';';
      }
      const hasHeader = options.hasHeader !== false;

      job.totalRows = hasHeader ? lines.length - 1 : lines.length;

      // Validation basique des colonnes
      if (hasHeader && lines.length > 0) {
        const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
        const requiredFields = this.getRequiredFields(job.type);
        const missingFields = requiredFields.filter(f => !headers.includes(f));
        
        if (missingFields.length > 0 && !job.columnMappingJson) {
          job.validationErrorsJson = JSON.stringify({
            type: 'MISSING_COLUMNS',
            message: `Colonnes manquantes: ${missingFields.join(', ')}`,
            missingFields,
            availableColumns: headers,
          });
          job.status = ImportStatus.PENDING;
        } else {
          job.status = ImportStatus.VALIDATED;
        }
      } else {
        job.status = ImportStatus.VALIDATED;
      }

      await this.importJobRepository.save(job);
      return job;

    } catch (error) {
      job.status = ImportStatus.FAILED;
      job.errorMessage = error instanceof Error ? error.message : 'Erreur de validation';
      await this.importJobRepository.save(job);
      return job;
    }
  }

  private getRequiredFields(type: ImportType): string[] {
    const fields: Record<string, string[]> = {
      [ImportType.PRODUCTS]: ['sku', 'name', 'sellingPrice'],
      [ImportType.CUSTOMERS]: ['firstName', 'lastName'],
      [ImportType.CATEGORIES]: ['name'],
      [ImportType.SUPPLIERS]: ['name'],
      [ImportType.INVENTORY_ADJUSTMENT]: ['sku', 'quantity'],
      [ImportType.PRICE_UPDATE]: ['sku', 'sellingPrice'],
    };
    return fields[type] || [];
  }

  async processImport(jobId: number, force = false): Promise<ImportJob> {
    const job = await this.importJobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(`Import #${jobId} non trouvé`);
    }

    if (job.status !== ImportStatus.VALIDATED && !force) {
      throw new BadRequestException('L\'import doit être validé avant le traitement');
    }

    job.status = ImportStatus.PROCESSING;
    job.startedAt = new Date();
    await this.importJobRepository.save(job);

    try {
      const content = fs.readFileSync(job.filePath, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      const options: ImportOptionsDto = job.importOptionsJson ? JSON.parse(job.importOptionsJson) : {};
      // Auto-detect delimiter: prefer ; then , then \t
      let delimiter = options.delimiter || '';
      if (!delimiter && lines.length > 0) {
        const firstLine = lines[0];
        if (firstLine.includes(';')) delimiter = ';';
        else if (firstLine.includes(',')) delimiter = ',';
        else if (firstLine.includes('\t')) delimiter = '\t';
        else delimiter = ';';
      }
      const hasHeader = options.hasHeader !== false;

      const headers = hasHeader ? lines[0].split(delimiter).map(h => h.trim().replace(/"/g, '')) : [];
      const dataLines = hasHeader ? lines.slice(1) : lines;

      const columnMapping: Record<string, string> = job.columnMappingJson 
        ? JSON.parse(job.columnMappingJson) 
        : headers.reduce((acc, h) => ({ ...acc, [h]: h }), {});

      let successCount = 0;
      let errorCount = 0;
      let skipCount = 0;
      const errors: any[] = [];

      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i];
        if (!line.trim()) continue;

        try {
          const values = this.parseCSVLine(line, delimiter);
          const rowData: Record<string, any> = {};
          
          headers.forEach((header, idx) => {
            const targetField = columnMapping[header] || header;
            rowData[targetField] = values[idx]?.trim().replace(/^"|"$/g, '') || null;
          });

          if (job.dryRun) {
            successCount++;
          } else {
            await this.importRow(job.type, rowData, options, job.tenantId);
            successCount++;
          }

          job.processedRows = i + 1;

        } catch (rowError) {
          if (options.skipErrors) {
            errorCount++;
            errors.push({ row: i + 2, error: rowError instanceof Error ? rowError.message : 'Erreur' });
          } else {
            throw rowError;
          }
        }
      }

      job.successCount = successCount;
      job.errorCount = errorCount;
      job.skipCount = skipCount;
      job.status = errorCount > 0 ? ImportStatus.COMPLETED_WITH_ERRORS : ImportStatus.COMPLETED;
      job.completedAt = new Date();

      if (errors.length > 0) {
        job.validationErrorsJson = JSON.stringify(errors.slice(0, 100)); // Max 100 erreurs
      }

      await this.importJobRepository.save(job);
      return job;

    } catch (error) {
      job.status = ImportStatus.FAILED;
      job.errorMessage = error instanceof Error ? error.message : 'Erreur de traitement';
      job.completedAt = new Date();
      await this.importJobRepository.save(job);
      return job;
    }
  }

  private parseCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  private async importRow(type: ImportType, data: Record<string, any>, options: ImportOptionsDto, tenantId?: string): Promise<void> {
    switch (type) {
      case ImportType.PRODUCTS:
        await this.importProduct(data, options, tenantId);
        break;
      case ImportType.CUSTOMERS:
        await this.importCustomer(data, options, tenantId);
        break;
      case ImportType.INVENTORY_ADJUSTMENT:
        await this.importInventoryAdjustment(data, tenantId);
        break;
      case ImportType.PRICE_UPDATE:
        await this.importPriceUpdate(data, tenantId);
        break;
      default:
        throw new Error(`Type d'import non supporté: ${type}`);
    }
  }

  private async importProduct(data: Record<string, any>, options: ImportOptionsDto, tenantId?: string): Promise<void> {
    const existing = await this.productRepository.findOne({ 
      where: { sku: data.sku, tenantId: tenantId ?? undefined } 
    });

    if (existing && options.updateExisting) {
      Object.assign(existing, {
        name: data.name || existing.name,
        sellingPrice: data.sellingPrice ? Number(data.sellingPrice) : existing.sellingPrice,
        purchasePrice: data.purchasePrice ? Number(data.purchasePrice) : existing.purchasePrice,
        stockQuantity: data.stockQuantity ? Number(data.stockQuantity) : existing.stockQuantity,
        minStockLevel: data.minStockLevel ? Number(data.minStockLevel) : existing.minStockLevel,
      });
      await this.productRepository.save(existing);
    } else if (!existing) {
      const product = this.productRepository.create({
        tenantId: tenantId ?? 'default',
        sku: data.sku,
        name: data.name,
        sellingPrice: Number(data.sellingPrice) || 0,
        purchasePrice: Number(data.purchasePrice) || 0,
        stockQuantity: Number(data.stockQuantity) || 0,
        minStockLevel: Number(data.minStockLevel) || 5,
        isActive: true,
      });
      await this.productRepository.save(product);
    }
  }

  private async importCustomer(data: Record<string, any>, options: ImportOptionsDto, tenantId?: string): Promise<void> {
    const existing = data.email ? await this.customerRepository.findOne({ 
      where: { email: data.email, tenantId: tenantId ?? undefined } 
    }) : null;

    if (existing && options.updateExisting) {
      Object.assign(existing, {
        firstName: data.firstName || existing.firstName,
        lastName: data.lastName || existing.lastName,
        phone: data.phone || existing.phone,
        city: data.city || existing.city,
      });
      await this.customerRepository.save(existing);
    } else if (!existing) {
      const customer = this.customerRepository.create({
        tenantId: tenantId ?? 'default',
        customerCode: `CLI-${Date.now()}`,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        city: data.city,
      });
      await this.customerRepository.save(customer);
    }
  }

  private async importInventoryAdjustment(data: Record<string, any>, tenantId?: string): Promise<void> {
    const product = await this.productRepository.findOne({ 
      where: { sku: data.sku, tenantId: tenantId ?? undefined } 
    });

    if (!product) {
      throw new Error(`Produit SKU ${data.sku} non trouvé`);
    }

    product.stockQuantity = Number(data.quantity);
    await this.productRepository.save(product);
  }

  private async importPriceUpdate(data: Record<string, any>, tenantId?: string): Promise<void> {
    const product = await this.productRepository.findOne({ 
      where: { sku: data.sku, tenantId: tenantId ?? undefined } 
    });

    if (!product) {
      throw new Error(`Produit SKU ${data.sku} non trouvé`);
    }

    if (data.sellingPrice) product.sellingPrice = Number(data.sellingPrice);
    if (data.purchasePrice) product.purchasePrice = Number(data.purchasePrice);
    await this.productRepository.save(product);
  }

  async getImportJob(id: number): Promise<ImportJob> {
    const job = await this.importJobRepository.findOne({ where: { id } });
    if (!job) {
      throw new NotFoundException(`Import #${id} non trouvé`);
    }
    return job;
  }

  async getImportJobs(tenantId?: string, limit = 50): Promise<ImportJob[]> {
    const query: any = {};
    if (tenantId) query.tenantId = tenantId;
    return this.importJobRepository.find({
      where: query,
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async cancelImport(id: number): Promise<ImportJob> {
    const job = await this.getImportJob(id);
    if ([ImportStatus.COMPLETED, ImportStatus.COMPLETED_WITH_ERRORS].includes(job.status as ImportStatus)) {
      throw new BadRequestException('Impossible d\'annuler un import terminé');
    }
    job.status = ImportStatus.CANCELLED;
    return this.importJobRepository.save(job);
  }

  async deleteImport(id: number): Promise<void> {
    const job = await this.getImportJob(id);
    if (job.filePath && fs.existsSync(job.filePath)) {
      fs.unlinkSync(job.filePath);
    }
    await this.importJobRepository.remove(job);
  }

  // ==================== TEMPLATES ====================

  getImportTemplate(type: ImportType): { headers: string[]; sampleData: any[]; fileName: string } {
    const templates: Record<string, { headers: string[]; sampleData: any[] }> = {
      [ImportType.PRODUCTS]: {
        headers: ['sku', 'name', 'description', 'sellingPrice', 'purchasePrice', 'stockQuantity', 'minStockLevel', 'categoryId'],
        sampleData: [
          { sku: 'PROD-001', name: 'Exemple Produit', description: 'Description', sellingPrice: '15000', purchasePrice: '10000', stockQuantity: '50', minStockLevel: '10', categoryId: '' },
        ],
      },
      [ImportType.CUSTOMERS]: {
        headers: ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'country'],
        sampleData: [
          { firstName: 'Jean', lastName: 'Dupont', email: 'jean@example.com', phone: '+225 07 00 00 00', address: '123 Rue Example', city: 'Abidjan', country: 'Côte d\'Ivoire' },
        ],
      },
      [ImportType.INVENTORY_ADJUSTMENT]: {
        headers: ['sku', 'quantity', 'reason'],
        sampleData: [
          { sku: 'PROD-001', quantity: '100', reason: 'Réapprovisionnement' },
        ],
      },
      [ImportType.PRICE_UPDATE]: {
        headers: ['sku', 'sellingPrice', 'purchasePrice'],
        sampleData: [
          { sku: 'PROD-001', sellingPrice: '18000', purchasePrice: '12000' },
        ],
      },
    };

    const template = templates[type] || { headers: [], sampleData: [] };
    return {
      ...template,
      fileName: `template_${type.toLowerCase()}.csv`,
    };
  }

  generateTemplateCSV(type: ImportType): string {
    const template = this.getImportTemplate(type);
    let csv = '\ufeff'; // BOM
    csv += template.headers.join(';') + '\n';
    
    for (const row of template.sampleData) {
      const values = template.headers.map(h => row[h] || '');
      csv += values.join(';') + '\n';
    }

    return csv;
  }
}


