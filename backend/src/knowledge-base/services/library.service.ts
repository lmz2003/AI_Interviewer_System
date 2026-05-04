import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { KnowledgeLibrary } from '../entities/knowledge-library.entity';
import { KnowledgeDocument } from '../entities/knowledge-document.entity';
import { CreateLibraryDto, UpdateLibraryDto } from '../dto/library.dto';

@Injectable()
export class LibraryService {
  private readonly logger = new Logger(LibraryService.name);

  constructor(
    @InjectRepository(KnowledgeLibrary)
    private libraryRepository: Repository<KnowledgeLibrary>,
    @InjectRepository(KnowledgeDocument)
    private documentRepository: Repository<KnowledgeDocument>,
  ) {}

  async createLibrary(createLibraryDto: CreateLibraryDto, userId: string): Promise<KnowledgeLibrary> {
    const library = this.libraryRepository.create({
      ...createLibraryDto,
      ownerId: userId,
    });

    return await this.libraryRepository.save(library);
  }

  async getLibraries(userId: string): Promise<KnowledgeLibrary[]> {
    return await this.libraryRepository.find({
      where: { ownerId: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getLibraryById(libraryId: string, userId: string): Promise<KnowledgeLibrary> {
    const library = await this.libraryRepository.findOne({
      where: { id: libraryId, ownerId: userId },
      relations: ['documents'],
    });

    if (!library) {
      throw new NotFoundException('知识库不存在');
    }

    return library;
  }

  async updateLibrary(
    libraryId: string,
    updateLibraryDto: UpdateLibraryDto,
    userId: string,
  ): Promise<KnowledgeLibrary> {
    const library = await this.libraryRepository.findOne({
      where: { id: libraryId, ownerId: userId },
    });

    if (!library) {
      throw new NotFoundException('知识库不存在');
    }

    Object.assign(library, updateLibraryDto);
    return await this.libraryRepository.save(library);
  }

  async deleteLibrary(libraryId: string, userId: string): Promise<void> {
    const library = await this.libraryRepository.findOne({
      where: { id: libraryId, ownerId: userId },
    });

    if (!library) {
      throw new NotFoundException('知识库不存在');
    }

    await this.libraryRepository.remove(library);
    this.logger.log(`知识库已删除: ${libraryId}`);
  }

  async getLibraryStats(libraryId: string, userId: string) {
    const library = await this.libraryRepository.findOne({
      where: { id: libraryId, ownerId: userId },
    });

    if (!library) {
      throw new NotFoundException('知识库不存在');
    }

    const documents = await this.documentRepository.find({
      where: { libraryId, ownerId: userId },
    });

    const totalDocuments = documents.length;
    const processedDocuments = documents.filter(d => d.status === 'processed').length;
    const pendingDocuments = documents.filter(d => d.status === 'uploaded').length;
    const failedDocuments = documents.filter(d => d.status === 'failed').length;

    return {
      libraryId,
      libraryName: library.name,
      totalDocuments,
      processedDocuments,
      pendingDocuments,
      failedDocuments,
    };
  }

  async getLibrariesByIds(libraryIds: string[], userId: string): Promise<KnowledgeLibrary[]> {
    if (!libraryIds || libraryIds.length === 0) {
      return [];
    }

    return await this.libraryRepository.find({
      where: {
        id: In(libraryIds),
        ownerId: userId,
      },
    });
  }
}
