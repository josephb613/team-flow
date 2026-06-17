import { Prisma } from '@prisma/client';

/** pgvector literal for use in Prisma.raw SQL fragments */
export function vectorSql(embedding: number[]): Prisma.Sql {
  const literal = `[${embedding.join(',')}]`;
  return Prisma.raw(`'${literal}'::vector`);
}
