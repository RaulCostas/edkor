import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Post('login')
  async login(@Body() loginDto: any) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (user && await this.usersService.validatePassword(loginDto.password, user.password || '')) {
      if ((user.estado || '').toLowerCase() === 'inactivo') {
        return { error: 'Su usuario se encuentra inactivo. Contacte al administrador.' };
      }
      const { password, ...result } = user;
      return result;
    }
    return { error: 'Credenciales incorrectas' };
  }

  @Post('forgot-password')
  forgotPassword(@Body() body: { email: string }) {
    return this.usersService.forgotPassword(body.email);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id/change-password')
  changePassword(
    @Param('id') id: string,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.usersService.changePassword(+id, body.currentPassword, body.newPassword);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
