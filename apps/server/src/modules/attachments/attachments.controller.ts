import https from 'https';

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';

import { AuthGuard } from 'modules/auth/auth.guard';
import { UserId, Workspace } from 'modules/auth/session.decorator';

import {
  AttachmentRequestParams,
  AttachmentBody,
  SignedURLBody,
} from './attachments.interface';
import { AttachmentService } from './attachments.service';

@Controller({
  version: '1',
  path: 'attachment',
})
export class AttachmentController {
  constructor(private readonly attachementService: AttachmentService) {}

  @Post('upload')
  @UseInterceptors(FilesInterceptor('files'))
  @UseGuards(AuthGuard)
  async uploadFiles(
    @UserId() userId: string,
    @Workspace() workspaceId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() attachmentBody: AttachmentBody,
  ) {
    const sourceMetadata = attachmentBody.sourceMetadata
      ? JSON.parse(attachmentBody.sourceMetadata)
      : null;

    return await this.attachementService.uploadAttachment(
      files,
      userId,
      workspaceId,
      sourceMetadata,
    );
  }

  @Post('get-signed-url')
  @UseGuards(AuthGuard)
  async getUploadSignedUrl(
    @Body() attachmentBody: SignedURLBody,
    @Workspace() workspaceId: string,
    @UserId() userId: string,
  ) {
    return await this.attachementService.uploadGenerateSignedURL(
      attachmentBody,
      userId,
      workspaceId,
    );
  }

  @Get('get-signed-url/:attachmentId')
  @UseGuards(AuthGuard)
  async getFileFromGCSSignedURL(
    @Workspace() workspaceId: string,
    @Param() attachementRequestParams: AttachmentRequestParams,
  ) {
    try {
      return await this.attachementService.getFileFromStorageSignedUrl(
        attachementRequestParams,
        workspaceId,
      );
    } catch (error) {
      return undefined;
    }
  }

  @Get(':attachmentId')
  @UseGuards(AuthGuard)
  async getFileFromGCSForWorkspace(
    @Workspace() workspaceId: string,
    @Param() attachementRequestParams: AttachmentRequestParams,
    @Res() res: Response,
  ) {
    try {
      const { signedUrl, contentType } =
        await this.attachementService.getFileFromStorageSignedUrl(
          attachementRequestParams,
          workspaceId,
        );

      // Set content disposition header with the original filename
      res.set({
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, immutable, max-age=31536000', // Cache for 1 year (effectively infinite)
      });

      https.get(signedUrl, (stream) => {
        stream.pipe(res);
      });
    } catch (error) {
      res.status(404).send('File not found');
    }
  }

  @Get(':attachmentId')
  @UseGuards(AuthGuard)
  async getFile(
    @Workspace() workspaceId: string,
    @Param() attachementRequestParams: AttachmentRequestParams,
    @Res() res: Response,
  ) {
    try {
      const { signedUrl, contentType } =
        await this.attachementService.getFileFromStorageSignedUrl(
          attachementRequestParams,
          workspaceId,
        );

      // Set content disposition header with the original filename
      res.set({
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, immutable, max-age=31536000', // Cache for 1 year (effectively infinite)
      });

      https.get(signedUrl, (stream) => {
        stream.pipe(res);
      });
    } catch (error) {
      res.status(404).send('File not found');
    }
  }

  @Delete(':attachmentId')
  @UseGuards(AuthGuard)
  async deleteAttachment(
    @Workspace() workspaceId: string,
    @Param() attachementRequestParams: AttachmentRequestParams,
  ) {
    await this.attachementService.deleteAttachment(
      attachementRequestParams,
      workspaceId,
    );
    return { message: 'Attachment deleted successfully' };
  }
}
