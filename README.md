# ChâteauForum

Site de liste étudiante : Next.js (interface), Express (API), Prisma (données SQLite en local). Le front lit l’API sur le port 4000 ; l’API seule accède à la base. Les routes `/api/admin/*` vérifient le rôle ADMIN côté serveur.

## Démarrer sur son ordinateur

Prérequis : Node.js 20 ou 22 et npm.

```bash
npm install
cp .env.example .env
```

Modifiez `.env` : donnez une vraie valeur longue et aléatoire à `JWT_SECRET`, votre email à `ADMIN_EMAIL` et un mot de passe fort à `ADMIN_PASSWORD`. Ensuite :

```bash
npm run db:setup
npm run dev
```

Ouvrez http://localhost:3000. L’API répond sur http://localhost:4000/api/health. Connectez-vous avec le compte administrateur créé par la commande `db:setup`. L’administration permet d’ajouter et modifier les membres et événements. L’événement de lancement est un exemple : remplacez-le.

Si la commande `cp` ne fonctionne pas sous Windows, utilisez `copy .env.example .env` dans l’invite de commandes ou `Copy-Item .env.example .env` dans PowerShell.

## Structure

- `apps/web/app` : pages et styles Next.js.
- `apps/web/components/Events.tsx` : affichage et réactions aux événements.
- `apps/api/src/index.ts` : routes Express et contrôle des accès.
- `prisma/schema.prisma` : tables User, Member, Event et Reaction.
- `prisma/seed.ts` : création du premier administrateur et d’un événement exemple.

## Avant la mise en ligne

Remplacez les trois engagements exemples par votre programme réel et renseignez les membres. L’inscription par email est disponible. Pour le bonus, remplacez ou complétez cette connexion avec Rezel Connect. Rezel Connect demande les URL et identifiants OAuth remis par Rezel ; n’inventez pas ces valeurs.

Hébergez le front Next.js, l’API Express et une base PostgreSQL persistante. Configurez `WEB_ORIGIN` avec l’URL HTTPS du front et `NEXT_PUBLIC_API_URL` avec celle de l’API. Pour PostgreSQL, changez le provider Prisma de `sqlite` à `postgresql`, définissez `DATABASE_URL`, appliquez une migration et redéployez. Les cookies entre deux domaines distincts demandent un paramétrage HTTPS/SameSite adapté ; privilégiez deux sous-domaines d’un même domaine. Ne publiez jamais `.env`. Exécutez `npm run build` avant le déploiement.
