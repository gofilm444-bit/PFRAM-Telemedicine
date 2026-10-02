const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  const sql = fs.readFileSync('apps/api/prisma/migrations/20260810000000_stage_7_education/migration.sql', 'utf8');
  // Remove comment lines
  const cleanSql = sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');

  const statements = cleanSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    console.log('Executing:', statement.replace(/\s+/g, ' ').substring(0, 60) + '...');
    await prisma.$executeRawUnsafe(statement);
  }

  console.log('All migration SQL statements executed successfully');
  const count = await prisma.educationArticle.count();
  console.log('EducationArticle count:', count);
}

main()
  .catch((err) => {
    console.error('Error running migration:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
