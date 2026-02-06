// src/files/files.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Headers,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Res,
  ParseIntPipe,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FilesService } from './files.service';
import { UploadFileDto, UploadMultipleFilesDto } from './dto/upload-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { QueryFileDto } from './dto/query-file.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto, ApproveDocumentDto, RejectDocumentDto } from './dto/update-document.dto';
import { QueryDocumentDto } from './dto/query-document.dto';

@ApiTags('Files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  // ==================== FILE UPLOAD ====================

  @Post('upload')
  @ApiOperation({ summary: 'Upload un fichier' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string' },
        entityType: { type: 'string' },
        entityId: { type: 'string' },
        tags: { type: 'string' },
        isPublic: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Fichier uploadé' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadFileDto,
    @Headers('x-tenant-id') tenantId: string,
    @Request() req,
  ) {
    return this.filesService.uploadFile(
      file,
      tenantId || 'default',
      uploadDto,
      req.user?.id,
      req.user?.username,
    );
  }

  @Post('upload/multiple')
  @ApiOperation({ summary: 'Upload plusieurs fichiers' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
        category: { type: 'string' },
        entityType: { type: 'string' },
        entityId: { type: 'string' },
        isPublic: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Fichiers uploadés' })
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() uploadDto: UploadMultipleFilesDto,
    @Headers('x-tenant-id') tenantId: string,
    @Request() req,
  ) {
    return this.filesService.uploadMultipleFiles(
      files,
      tenantId || 'default',
      uploadDto,
      req.user?.id,
      req.user?.username,
    );
  }

  @Post('upload/image')
  @ApiOperation({ summary: 'Upload une image produit' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Image uploadée' })
  @UseInterceptors(FileInterceptor('image'))
  async uploadProductImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadFileDto,
    @Headers('x-tenant-id') tenantId: string,
    @Request() req,
  ) {
    return this.filesService.uploadFile(
      file,
      tenantId || 'default',
      { ...uploadDto, generateThumbnail: true },
      req.user?.id,
      req.user?.username,
    );
  }

  // ==================== FILE MANAGEMENT ====================

  @Get()
  @ApiOperation({ summary: 'Lister tous les fichiers' })
  @ApiResponse({ status: 200, description: 'Liste des fichiers' })
  async findAllFiles(
    @Query() query: QueryFileDto,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.filesService.findAllFiles(tenantId || 'default', query);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard fichiers et documents' })
  @ApiResponse({ status: 200, description: 'Statistiques' })
  async getDashboard(@Headers('x-tenant-id') tenantId: string) {
    return this.filesService.getDashboard(tenantId || 'default');
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques de stockage' })
  @ApiResponse({ status: 200, description: 'Stats stockage' })
  async getStorageStats(@Headers('x-tenant-id') tenantId: string) {
    return this.filesService.getStorageStats(tenantId || 'default');
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Fichiers par entité' })
  @ApiResponse({ status: 200, description: 'Liste des fichiers' })
  async getFilesByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.filesService.getFilesByEntity(entityType, entityId, tenantId || 'default');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails fichier' })
  @ApiResponse({ status: 200, description: 'Fichier trouvé' })
  async findFileById(
    @Param('id', ParseIntPipe) id: number,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.filesService.findFileById(id, tenantId || 'default');
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Fichier par code' })
  @ApiResponse({ status: 200, description: 'Fichier trouvé' })
  async findFileByCode(
    @Param('code') code: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.filesService.findFileByCode(code, tenantId || 'default');
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Télécharger fichier' })
  @ApiResponse({ status: 200, description: 'Fichier téléchargé' })
  async downloadFile(
    @Param('id', ParseIntPipe) id: number,
    @Headers('x-tenant-id') tenantId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { file, buffer } = await this.filesService.downloadFile(id, tenantId || 'default');

    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${file.originalName}"`,
      'Content-Length': buffer.length,
    });

    return new StreamableFile(buffer);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier fichier' })
  @ApiResponse({ status: 200, description: 'Fichier modifié' })
  async updateFile(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateFileDto,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.filesService.updateFile(id, tenantId || 'default', updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer fichier' })
  @ApiResponse({ status: 200, description: 'Fichier supprimé' })
  async deleteFile(
    @Param('id', ParseIntPipe) id: number,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    await this.filesService.deleteFile(id, tenantId || 'default');
    return { message: 'Fichier supprimé avec succès' };
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Nettoyer fichiers expirés' })
  @ApiResponse({ status: 200, description: 'Fichiers nettoyés' })
  async cleanupExpiredFiles(@Headers('x-tenant-id') tenantId: string) {
    const count = await this.filesService.cleanupExpiredFiles(tenantId || 'default');
    return { message: `${count} fichiers expirés supprimés` };
  }

  // ==================== DOCUMENTS ====================

  @Post('documents')
  @ApiOperation({ summary: 'Créer un document' })
  @ApiResponse({ status: 201, description: 'Document créé' })
  async createDocument(
    @Body() createDto: CreateDocumentDto,
    @Headers('x-tenant-id') tenantId: string,
    @Request() req,
  ) {
    return this.filesService.createDocument(
      tenantId || 'default',
      createDto,
      req.user?.id,
      req.user?.username,
    );
  }

  @Post('documents/upload')
  @ApiOperation({ summary: 'Upload et créer un document' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Document créé avec fichier' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() createDto: CreateDocumentDto,
    @Headers('x-tenant-id') tenantId: string,
    @Request() req,
  ) {
    return this.filesService.uploadDocument(
      file,
      tenantId || 'default',
      createDto,
      req.user?.id,
      req.user?.username,
    );
  }

  @Get('documents/list')
  @ApiOperation({ summary: 'Lister les documents' })
  @ApiResponse({ status: 200, description: 'Liste des documents' })
  async findAllDocuments(
    @Query() query: QueryDocumentDto,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.filesService.findAllDocuments(tenantId || 'default', query);
  }

  @Get('documents/entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Documents par entité' })
  @ApiResponse({ status: 200, description: 'Liste des documents' })
  async getDocumentsByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.filesService.getDocumentsByEntity(entityType, entityId, tenantId || 'default');
  }

  @Get('documents/:id')
  @ApiOperation({ summary: 'Détails document' })
  @ApiResponse({ status: 200, description: 'Document trouvé' })
  async findDocumentById(
    @Param('id', ParseIntPipe) id: number,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.filesService.findDocumentById(id, tenantId || 'default');
  }

  @Patch('documents/:id')
  @ApiOperation({ summary: 'Modifier document' })
  @ApiResponse({ status: 200, description: 'Document modifié' })
  async updateDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateDocumentDto,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.filesService.updateDocument(id, tenantId || 'default', updateDto);
  }

  @Patch('documents/:id/approve')
  @ApiOperation({ summary: 'Approuver document' })
  @ApiResponse({ status: 200, description: 'Document approuvé' })
  async approveDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body() approveDto: ApproveDocumentDto,
    @Headers('x-tenant-id') tenantId: string,
    @Request() req,
  ) {
    return this.filesService.approveDocument(
      id,
      tenantId || 'default',
      approveDto,
      req.user?.id,
      req.user?.username,
    );
  }

  @Patch('documents/:id/reject')
  @ApiOperation({ summary: 'Rejeter document' })
  @ApiResponse({ status: 200, description: 'Document rejeté' })
  async rejectDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body() rejectDto: RejectDocumentDto,
    @Headers('x-tenant-id') tenantId: string,
    @Request() req,
  ) {
    return this.filesService.rejectDocument(
      id,
      tenantId || 'default',
      rejectDto,
      req.user?.id,
      req.user?.username,
    );
  }

  @Patch('documents/:id/archive')
  @ApiOperation({ summary: 'Archiver document' })
  @ApiResponse({ status: 200, description: 'Document archivé' })
  async archiveDocument(
    @Param('id', ParseIntPipe) id: number,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.filesService.archiveDocument(id, tenantId || 'default');
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: 'Supprimer document' })
  @ApiResponse({ status: 200, description: 'Document supprimé' })
  async deleteDocument(
    @Param('id', ParseIntPipe) id: number,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    await this.filesService.deleteDocument(id, tenantId || 'default');
    return { message: 'Document supprimé avec succès' };
  }
}
