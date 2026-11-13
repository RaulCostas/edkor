
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const usersService = app.get(UsersService);

    console.log('Checking for existing users...');
    const users = await usersService.findAll();

    if (users.length === 0) {
        console.log('No users found. creating Admin user...');
        const adminUser: CreateUserDto = {
            name: 'Administrador',
            email: 'admin',
            password: 'admin',
            foto: '',
            estado: 'activo'
        };

        try {
            await usersService.create(adminUser);
            console.log('Admin user created successfully.');
        } catch (error) {
            console.error('Error creating admin user:', error);
        }
    } else {
        console.log('Users already exist. skipping seed.');
    }

    await app.close();
}

bootstrap();
