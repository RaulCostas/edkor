
import { DataSource } from "typeorm";

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

async function checkUsers() {
    try {
        await dataSource.initialize();
        console.log("Database connected!");

        const users = await dataSource.query(`SELECT * FROM "users"`);
        console.log("Users found:", users.length);
        users.forEach((u: any) => {
            console.log(`User: ${u.name} (${u.email})`);
            console.log(`Foto: ${u.foto ? `Present (${u.foto.length} chars)` : 'None'}`);
        });

        await dataSource.destroy();
    } catch (error) {
        console.error("Error:", error);
    }
}

checkUsers();
