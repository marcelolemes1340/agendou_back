// back-end/prisma.js

import { PrismaClient } from '@prisma/client';

// Cria uma única instância do Prisma que será usada por toda a API
const prisma = new PrismaClient();

export default prisma;