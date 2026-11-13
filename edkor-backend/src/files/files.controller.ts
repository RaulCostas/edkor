import { Controller, Post, UseInterceptors, UploadedFile, Get, Param, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Response } from 'express';

@Controller('files')
export class FilesController {
    @Post('upload')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
                return cb(null, `${randomName}${extname(file.originalname)}`);
            }
        })
    }))
    uploadFile(@UploadedFile() file: Express.Multer.File) {
        return {
            filename: file.filename,
            originalname: file.originalname,
        };
    }

    @Get(':filename')
    seeUploadedFile(@Param('filename') image, @Res() res: Response) {
        return res.sendFile(image, { root: './uploads' });
    }
}
