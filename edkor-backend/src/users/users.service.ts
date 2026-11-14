import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  async onModuleInit() {
    await this.seedDefaultAdmin();
  }

  async seedDefaultAdmin() {
    try {
      const count = await this.userRepository.count();
      if (count === 0) {
        console.log('[SEED] Base de datos vacía. Creando usuario Administrador inicial...');
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash('admin', saltRounds);

        const adminUser = this.userRepository.create({
          name: 'Administrador',
          email: 'admin@edkormotors.com',
          password: hashedPassword,
          foto: '',
          estado: 'activo',
        });
        await this.userRepository.save(adminUser);
        console.log('[SEED] Usuario Administrador inicial creado (admin@edkormotors.com / admin).');
      }
    } catch (error) {
      console.error('[SEED] Error al verificar/crear usuario inicial:', error);
    }
  }

  async create(createUserDto: CreateUserDto) {
    if (createUserDto.password) {
      const saltRounds = 10;
      createUserDto.password = await bcrypt.hash(createUserDto.password, saltRounds);
    }
    const { rol_id, personal_id, sucursal_id, ...userData } = createUserDto;
    const user = this.userRepository.create({
      ...userData,
      rol: rol_id ? { id: rol_id } as any : null,
      personal: personal_id ? { id: personal_id } as any : null,
      sucursal: sucursal_id ? { id: sucursal_id } as any : null,
    });
    return this.userRepository.save(user);
  }

  findAll() {
    return this.userRepository.find({ relations: ['rol', 'personal', 'sucursal'] });
  }

  findOne(id: string) {
    return this.userRepository.findOne({ where: { id: +id }, relations: ['rol', 'personal', 'sucursal'] });
  }

  findByEmail(email: string) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const whereConditions: any[] = [{ email: ILike(cleanEmail) }];
    if (cleanEmail === 'admin') {
      whereConditions.push({ email: ILike('admin@edkormotors.com') });
    }
    return this.userRepository.findOne({ where: whereConditions, relations: ['rol', 'personal', 'sucursal'] });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    if (updateUserDto.password) {
      const saltRounds = 10;
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, saltRounds);
    }
    const { rol_id, personal_id, sucursal_id, ...userData } = updateUserDto;
    const updateData: any = { ...userData };
    if (rol_id !== undefined) {
      updateData.rol = rol_id ? { id: rol_id } : null;
    }
    if (personal_id !== undefined) {
      updateData.personal = personal_id ? { id: personal_id } : null;
    }
    if (sucursal_id !== undefined) {
      updateData.sucursal = sucursal_id ? { id: sucursal_id } : null;
    }
    return this.userRepository.update(+id, updateData);
  }

  // Soft delete: cambiar estado a inactivo en lugar de eliminar
  async remove(id: string) {
    return this.userRepository.update(+id, { estado: 'inactivo' });
  }

  // Método para verificar contraseña (útil para login)
  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async changePassword(id: number, currentPassword: string, newPassword: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('La nueva contraseña debe tener al menos 6 caracteres');
    }
    const isValid = await this.validatePassword(currentPassword, user.password || '');
    if (!isValid) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    await this.userRepository.update(id, { password: hashedPassword });
    return { success: true, message: 'Contraseña actualizada exitosamente' };
  }

  async forgotPassword(email: string) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      throw new BadRequestException('Debe ingresar un correo electrónico');
    }

    // Verificar si el usuario existe en el sistema
    const user = await this.userRepository.findOne({
      where: { email: ILike(cleanEmail) },
    });

    if (!user) {
      throw new NotFoundException('El correo electrónico no corresponde a ningún usuario registrado en el sistema.');
    }

    if ((user.estado || '').toLowerCase() === 'inactivo') {
      throw new BadRequestException('El usuario asociado a este correo se encuentra inactivo. Contacte al administrador.');
    }

    // Generar contraseña temporal segura de 8 caracteres alfanuméricos legibles
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let tempPassword = '';
    for (let i = 0; i < 8; i++) {
      tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Hashear y actualizar en base de datos
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(tempPassword, saltRounds);
    await this.userRepository.update(user.id, { password: hashedPassword });

    // Configuración de credenciales de Gmail desde variables de entorno
    const mailUser = process.env.MAIL_USER;
    const mailPass = process.env.MAIL_PASS;

    console.log('====================================================');
    console.log(`[RECUPERACIÓN DE CONTRASEÑA - EDKOR MOTORS]`);
    console.log(`Usuario: ${user.name} (${user.email})`);
    console.log(`Nueva Contraseña Temporal: ${tempPassword}`);
    console.log('====================================================');

    if (!mailUser || !mailPass) {
      console.warn('[MAIL SERVICE] MAIL_USER o MAIL_PASS no están configurados en el archivo .env de edkor-backend');
      throw new BadRequestException(
        'El servidor de correo no está configurado (MAIL_USER o MAIL_PASS faltante en .env). Por favor configure las credenciales de Gmail.'
      );
    }

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: mailUser,
          pass: mailPass,
        },
      });

      const mailOptions = {
        from: process.env.MAIL_FROM || `"EDKOR MOTORS" <${mailUser}>`,
        to: user.email,
        subject: 'Recuperación de Contraseña - EDKOR MOTORS',
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 580px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #1e293b;">
            <div style="background: linear-gradient(135deg, #b91c1c, #dc2626); padding: 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">EDKOR MOTORS</h1>
              <p style="color: #fecaca; margin: 4px 0 0 0; font-size: 13px;">Sistema de Gestión de Taller Automotriz</p>
            </div>
            <div style="padding: 28px 24px; background-color: #1e293b;">
              <h2 style="color: #ffffff; font-size: 18px; margin-top: 0;">Hola, ${user.name}</h2>
              <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                Has solicitado restablecer tu contraseña para acceder a la plataforma oficial de <strong>EDKOR MOTORS</strong>.
              </p>
              <div style="background-color: #0f172a; border: 2px dashed #dc2626; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0;">
                <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; display: block; margin-bottom: 8px;">Tu nueva contraseña temporal es:</span>
                <span style="font-size: 28px; font-weight: 800; color: #f87171; letter-spacing: 3px; font-family: monospace;">${tempPassword}</span>
              </div>
              <p style="color: #cbd5e1; font-size: 13px; line-height: 1.5;">
                <strong>Recomendación de seguridad:</strong> Inicia sesión con esta contraseña y cámbiala de inmediato desde tu perfil de usuario.
              </p>
              <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
                Si no solicitaste este cambio, por favor ponte en contacto inmediatamente con el administrador del sistema.
              </p>
            </div>
            <div style="background-color: #0f172a; padding: 16px; text-align: center; border-top: 1px solid #334155;">
              <p style="color: #64748b; font-size: 11px; margin: 0;">
                © ${new Date().getFullYear()} EDKOR MOTORS S.R.L. Todos los derechos reservados.
              </p>
            </div>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      return {
        success: true,
        message: 'Se ha enviado una contraseña temporal a su correo electrónico.',
      };
    } catch (err: any) {
      console.error('[MAIL SERVICE ERROR]', err);
      throw new BadRequestException(
        'No se pudo enviar el correo a través de Gmail. Verifique que la contraseña de aplicación de Gmail sea correcta o intente más tarde.'
      );
    }
  }
}
