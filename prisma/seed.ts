import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
const db = new PrismaClient();
async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password === 'change-this-password') throw new Error('Définissez ADMIN_EMAIL et un vrai ADMIN_PASSWORD dans .env');
  await db.user.upsert({ where: { email }, update: { role: 'ADMIN' }, create: { email, name: 'Administration', role: 'ADMIN', passwordHash: await hash(password, 12) } });
  if (await db.event.count() === 0) await db.event.create({ data: { title: 'Rencontre de lancement', description: 'Venez découvrir la liste, échanger avec nous et partager vos idées pour la vie du campus.', date: new Date('2026-10-02T18:00:00+02:00'), location: 'Campus', published: true } });
}
main().finally(() => db.$disconnect());
