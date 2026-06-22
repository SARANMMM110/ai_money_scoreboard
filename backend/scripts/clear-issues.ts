import { prisma } from '../src/lib/prisma.js';

await prisma.issue.deleteMany();
console.log('All issues deleted — safe to migrate schema');
await prisma.$disconnect();
