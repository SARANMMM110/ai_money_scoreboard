import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const demoUser = await prisma.user.upsert({
        where: { email: 'demo@aimoneyscoreboard.com' },
        create: {
            email: 'demo@aimoneyscoreboard.com',
            name: 'Demo User',
        },
        update: {},
    });
    console.log('Seeded demo user:', demoUser.email);
    console.log('Dev login token: dev:' + demoUser.id);
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
