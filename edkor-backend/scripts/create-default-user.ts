
import { DataSource } from "typeorm";
import * as bcrypt from 'bcrypt';

const dataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5433"),
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "postgrespg",
    database: process.env.DB_NAME || "taller",
    entities: ["src/**/*.entity.ts"],
    synchronize: false,
});

async function createDefaultUser() {
    try {
        await dataSource.initialize();

        // Hash password '123456'
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('123456', salt);

        await dataSource.query(`
      INSERT INTO "users" (id, name, email, password, estado, foto)
      VALUES (
        uuid_generate_v4(), 
        'Administrador', 
        'admin@test.com', 
        '${hashedPassword}', 
        'activo', 
        null
      )
    `);

        console.log("Default user created: admin@test.com / 123456");

        await dataSource.destroy();
    } catch (error) {
        console.error("Error:", error);
    }
}

createDefaultUser();
