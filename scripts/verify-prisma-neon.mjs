import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const users = await prisma.user.count();
const tasks = await prisma.task.count();
console.log(`Prisma client OK — users: ${users}, tasks: ${tasks}`);
await prisma.$disconnect();
