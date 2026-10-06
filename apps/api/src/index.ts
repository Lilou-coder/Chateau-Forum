import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import axios from 'axios';

const db = new PrismaClient();
const app = express();
const secret = process.env.JWT_SECRET;
if (!secret || secret.includes('replace-with')) throw new Error('Définissez JWT_SECRET dans .env');
app.use(cors({ origin: process.env.WEB_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
type Session = { id: number; role: string; name: string };
function session(req: Request): Session | null {
  try { return jwt.verify(req.cookies.session, secret!) as Session; } catch { return null; }
}
function requireUser(req: Request, res: Response, next: NextFunction) {
  const user = session(req);
  if (!user) { res.status(401).json({ error: 'Connectez-vous.' }); return; }
  res.locals.user = user;
  next();
}
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (res.locals.user.role !== 'ADMIN') { res.status(403).json({ error: "Accès réservé à l'administration." }); return; }
  next();
}
const memberInput = z.object({ name: z.string().trim().min(1).max(80), role: z.string().trim().min(1).max(80), bio: z.string().max(600).default(''), order: z.number().int().default(0) });
const eventInput = z.object({ title: z.string().trim().min(1).max(120), description: z.string().trim().min(1).max(3000), date: z.coerce.date(), location: z.string().trim().min(1).max(160), published: z.boolean() });
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/members', async (_req, res) => res.json(await db.member.findMany({ orderBy: [{ order: 'asc' }, { id: 'asc' }] })));
app.get('/api/events', async (_req, res) => {
  const events = await db.event.findMany({ where: { published: true }, orderBy: { date: 'asc' }, include: { reactions: true } });
  res.json(events.map(({ reactions, ...event }) => ({ ...event, interested: reactions.filter(r => r.type === 'INTERESTED').length })));
});
app.post('/api/register', async (req, res) => {
  const input = z.object({ name: z.string().trim().min(2).max(80), email: z.email(), password: z.string().min(10).max(128) }).safeParse(req.body);
  if (!input.success) { res.status(400).json({ error: 'Nom, email ou mot de passe invalide (10 caractères minimum).' }); return; }
  const existing = await db.user.findUnique({ where: { email: input.data.email } });
  if (existing) { res.status(409).json({ error: 'Cette adresse est déjà utilisée.' }); return; }
  const user = await db.user.create({ data: { name: input.data.name, email: input.data.email, passwordHash: await hash(input.data.password, 12) } });
  res.cookie('session', jwt.sign({ id: user.id, role: user.role, name: user.name }, secret!, { expiresIn: '7d' }), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 604800000 });
  res.status(201).json({ name: user.name, role: user.role });
});
app.post('/api/login', async (req, res) => {
  const input = z.object({ email: z.email(), password: z.string() }).safeParse(req.body);
  if (!input.success) { res.status(400).json({ error: 'Email ou mot de passe invalide.' }); return; }
  const user = await db.user.findUnique({ where: { email: input.data.email } });
  if (!user || !(await compare(input.data.password, user.passwordHash))) { res.status(401).json({ error: 'Identifiants incorrects.' }); return; }
  res.cookie('session', jwt.sign({ id: user.id, role: user.role, name: user.name }, secret!, { expiresIn: '7d' }), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 604800000 });
  res.json({ name: user.name, role: user.role });
});
app.post('/api/logout', (_req, res) => { res.clearCookie('session'); res.json({ ok: true }); });
app.get('/api/me', (req, res) => res.json({ user: session(req) }));
app.put('/api/events/:id/reaction', requireUser, async (req, res) => {
  const eventId = Number(req.params.id);
  const event = await db.event.findFirst({ where: { id: eventId, published: true } });
  if (!event) { res.status(404).json({ error: 'Événement introuvable.' }); return; }
  const key = { userId_eventId: { userId: res.locals.user.id as number, eventId } };
  const existing = await db.reaction.findUnique({ where: key });
  if (existing) await db.reaction.delete({ where: key });
  else await db.reaction.create({ data: { userId: res.locals.user.id, eventId, type: 'INTERESTED' } });
  res.json({ interested: !existing });
});
app.get('/api/admin/events', requireUser, requireAdmin, async (_req, res) => res.json(await db.event.findMany({ orderBy: { date: 'asc' } })));
app.post('/api/admin/events', requireUser, requireAdmin, async (req, res) => {
  const input = eventInput.parse(req.body);
  res.status(201).json(await db.event.create({ data: input }));
});
app.put('/api/admin/events/:id', requireUser, requireAdmin, async (req, res) => res.json(await db.event.update({ where: { id: Number(req.params.id) }, data: eventInput.parse(req.body) })));
app.delete('/api/admin/events/:id', requireUser, requireAdmin, async (req, res) => { await db.event.delete({ where: { id: Number(req.params.id) } }); res.status(204).end(); });
app.post('/api/admin/members', requireUser, requireAdmin, async (req, res) => res.status(201).json(await db.member.create({ data: memberInput.parse(req.body) })));
app.put('/api/admin/members/:id', requireUser, requireAdmin, async (req, res) => res.json(await db.member.update({ where: { id: Number(req.params.id) }, data: memberInput.parse(req.body) })));
app.delete('/api/admin/members/:id', requireUser, requireAdmin, async (req, res) => { await db.member.delete({ where: { id: Number(req.params.id) } }); res.status(204).end(); });

// REZEL OAUTH
app.get('/api/auth/rezel/start', (req: Request, res: Response) => {
  const state = Math.random().toString(36).substring(2, 15);
  const params = new URLSearchParams({
    client_id: process.env.REZEL_CLIENT_ID!,
    redirect_uri: process.env.REZEL_REDIRECT_URI!,
    response_type: 'code',
    scope: 'openid profile email',
    state: state
  });
  res.redirect(`${process.env.REZEL_AUTH_URL}?${params.toString()}`);
});

app.get('/api/auth/rezel/callback', async (req: Request, res: Response) => {
  const { code, error } = req.query;
  if (error) return res.redirect(`${process.env.WEB_ORIGIN}?error=${error}`);
  if (!code) return res.status(400).json({ error: 'Code manquant' });

  try {
    const tokenRes = await axios.post(process.env.REZEL_TOKEN_URL!, {
      grant_type: 'authorization_code',
      code: code,
      client_id: process.env.REZEL_CLIENT_ID!,
      client_secret: process.env.REZEL_CLIENT_SECRET!,
      redirect_uri: process.env.REZEL_REDIRECT_URI!
    });

    const accessToken = tokenRes.data.access_token;
    const userRes = await axios.get(process.env.REZEL_USERINFO_URL!, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const { email, name, given_name, family_name } = userRes.data;
    const displayName = name || `${given_name} ${family_name}`.trim() || email.split('@')[0];

    let user = await db.user.findUnique({ where: { email } });
    if (!user) {
      user = await db.user.create({
        data: { email, name: displayName, passwordHash: '', role: 'USER' }
      });
    }

    const sessionToken = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      secret!,
      { expiresIn: '7d' }
    );

    res.cookie('session', sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.redirect(process.env.WEB_ORIGIN!);
  } catch (error) {
    console.error('Erreur OAuth:', error);
    res.status(500).json({ error: 'Erreur connexion' });
  }
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof z.ZodError) { res.status(400).json({ error: 'Vérifiez les champs du formulaire.' }); return; }
  console.error(error);
  res.status(500).json({ error: 'Une erreur est survenue.' });
});
app.listen(Number(process.env.PORT || 4000), () => console.log(`API sur http://localhost:${process.env.PORT || 4000}`));