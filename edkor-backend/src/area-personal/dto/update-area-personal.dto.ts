import { PartialType } from '@nestjs/mapped-types';
import { CreateAreaPersonalDto } from './create-area-personal.dto';

export class UpdateAreaPersonalDto extends PartialType(CreateAreaPersonalDto) { }
