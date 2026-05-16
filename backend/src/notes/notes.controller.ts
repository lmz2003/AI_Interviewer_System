import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request, Query, HttpException, HttpStatus } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { QueryNotesDto } from './dto/query-notes.dto';

@Controller('notes')
@UseGuards(AuthGuard('jwt'))
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  // Create a new note
  @Post()
  async createNote(@Body() createNoteDto: CreateNoteDto, @Request() req: ExpressRequest) {
    const userId = req.user?.id as string;
    const note = await this.notesService.createNote(createNoteDto, userId);
    return {
      code: 0,
      message: 'created',
      data: note,
    };
  }

  // Get all notes for the current user
  @Get()
  async getMyNotes(@Query() queryDto: QueryNotesDto, @Request() req: ExpressRequest) {
    const userId = req.user?.id as string;
    const result = await this.notesService.getNotesByUserId(userId, queryDto);
    return {
      code: 0,
      message: 'ok',
      data: result,
    };
  }

  // Get a single note by id
  @Get(':id')
  async getNoteById(@Param('id') id: string) {
    const note = await this.notesService.getNoteById(id);
    return {
      code: 0,
      message: 'ok',
      data: note,
    };
  }

  // Update a note
  @Put(':id')
  async updateNote(@Param('id') id: string, @Body() updateNoteDto: UpdateNoteDto, @Request() req: ExpressRequest) {
    const userId = req.user?.id as string;
    const note = await this.notesService.updateNote(id, updateNoteDto, userId);
    return {
      code: 0,
      message: 'updated',
      data: note,
    };
  }

  // Delete a note
  @Delete(':id')
  async deleteNote(@Param('id') id: string, @Request() req: ExpressRequest) {
    const userId = req.user?.id as string;
    await this.notesService.deleteNote(id, userId);
    return {
      code: 0,
      message: 'deleted',
      data: null,
    };
  }

  // Batch delete notes
  @Delete()
  async batchDeleteNotes(@Body() body: { ids: string[] }, @Request() req: ExpressRequest) {
    const userId = req.user?.id as string;
    const result = await this.notesService.batchDeleteNotes(body.ids, userId);
    return {
      code: 0,
      message: result.failedIds.length > 0 ? 'partial_success' : 'deleted',
      data: result,
    };
  }

  // Get note versions
  @Get(':id/versions')
  async getNoteVersions(@Param('id') id: string) {
    return this.notesService.getNoteVersions(id);
  }

  // Restore note from a version
  @Post(':id/restore/:versionId')
  async restoreNoteFromVersion(@Param('id') id: string, @Param('versionId') versionId: string, @Request() req: ExpressRequest) {
    // In a real application, you would get the user ID from the authenticated request
    const userId = req.user?.id || 'test-user-id';
    return this.notesService.restoreNoteFromVersion(id, versionId, userId);
  }

  // Get note comments
  @Get(':id/comments')
  async getNoteComments(@Param('id') id: string) {
    return this.notesService.getNoteComments(id);
  }

  // Add a comment to a note
  @Post(':id/comments')
  async addComment(@Param('id') id: string, @Body() commentData: { content: string; parentId?: string }, @Request() req: ExpressRequest) {
    // In a real application, you would get the user ID from the authenticated request
    const authorId = req.user?.id || 'test-user-id';
    return this.notesService.addComment(id, { ...commentData, authorId });
  }

  // Delete a comment
  @Delete(':id/comments/:commentId')
  async deleteComment(@Param('commentId') commentId: string) {
    return this.notesService.deleteComment(commentId);
  }

  // Upload note to knowledge base
  @Post(':id/upload-to-knowledge')
  async uploadToKnowledgeBase(@Param('id') id: string, @Body() body: { libraryId?: string }, @Request() req: ExpressRequest) {
    const userId = req.user?.id as string;
    try {
      const result = await this.notesService.uploadToKnowledgeBase(id, userId, body.libraryId);
      return {
        code: 0,
        message: result.message,
        data: {
          success: result.success,
          documentId: result.documentId,
        },
      };
    } catch (error: any) {
      throw new HttpException(
        {
          code: 1,
          message: error.message || '上传到知识库失败',
          data: null,
        },
        error.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  // Sync note to knowledge base
  @Post(':id/sync-to-knowledge')
  async syncToKnowledgeBase(@Param('id') id: string, @Request() req: ExpressRequest) {
    const userId = req.user?.id as string;
    try {
      const result = await this.notesService.syncToKnowledgeBase(id, userId);
      return {
        code: 0,
        message: result.message,
        data: {
          success: result.success,
        },
      };
    } catch (error: any) {
      throw new HttpException(
        {
          code: 1,
          message: error.message || '同步到知识库失败',
          data: null,
        },
        error.status || HttpStatus.BAD_REQUEST
      );
    }
  }


}
