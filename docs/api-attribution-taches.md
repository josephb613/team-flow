# TeamFlow — Documentation d'Attribution de Tâches via APIs Externes

> **Version** : 0.2.0  
> **Dernière mise à jour** : Mai 2025  
> **Public cible** : Développeurs, intégrateurs, services externes (CRM, ERP, automatisations)

---

## Table des matières

1. [Introduction](#introduction)
2. [Authentification](#authentification)
3. [Aperçu des Endpoints Tâches](#aperçu-des-endpoints-tâches)
4. [Créer une Tâche et l'Attribuer](#créer-une-tâche-et-lattribuer)
5. [Modifier l'Attribution d'une Tâche Existante](#modifier-lattribution-dune-tâche-existante)
6. [Récupérer les Tâches par Assigné](#récupérer-les-tâches-par-assigné)
7. [Supprimer une Tâche](#supprimer-une-tâche)
8. [Gestion des Opportunités (Pipeline CRM)](#gestion-des-opportunités-pipeline-crm)
9. [Modèle de Données — Tâche](#modèle-de-données--tâche)
10. [Codes d'Erreur et Gestion](#codes-derreur-et-gestion)
11. [Bonnes Pratiques & Rate Limiting](#bonnes-pratiques--rate-limiting)
12. [Exemples Complets d'Intégration](#exemples-complets-dintégration)

---

## Introduction

**TeamFlow** expose une API REST complète permettant aux services externes (CRM, ERP, outils de ticketing, scripts d'automatisation, chatbots, etc.) de **créer, lire, mettre à jour et supprimer des tâches**, avec la possibilité de les **attribuer à des membres** de l'espace de travail.

### Cas d'usage typiques

| Scénario | Description |
|---|---|
| **CRM → Tâche** | Un commercial gagne une opportunité → création automatique d'une tâche « Onboarding client » assignée au chef de projet |
| **Support → Tâche** | Un ticket critique est escaladé → tâche assignée à l'équipe technique |
| **CI/CD → Tâche** | Un build échoue → tâche de correction assignée au lead dev |
| **Webhook externe** | Un formulaire Typeform/Calendly → tâche de suivi assignée au commercial |

### URL de base

```
https://votre-domaine.com/api
```

En développement local :

```
http://localhost:3001/api
```

---

## Authentification

Toutes les requêtes API nécessitent une **session NextAuth** valide. L'authentification se fait via un **cookie de session** (`next-auth.session-token`) obtenu après connexion.

### Méthodes d'authentification

| Méthode | Usage |
|---|---|
| **Cookie de session** | Pour les appels depuis le frontend TeamFlow (navigateur) |
| **API Key / Bearer Token** | *(Planifié pour v0.3.0)* Pour les intégrations tierces |

### Exemple avec cookie (cURL)

```bash
curl -X GET "https://votre-domaine.com/api/tasks?workspaceId=clx..." \
  -H "Cookie: next-auth.session-token=VOTRE_TOKEN"
```

> ⚠️ **Important** : L'authentification est gérée par la fonction `withAuth()` (voir `src/lib/api-utils.ts`). Toute requête non authentifiée reçoit un **401 Unauthorized**.

---

## Aperçu des Endpoints Tâches

| Méthode | Endpoint | Description | Auth requise |
|---|---|---|---|
| `GET` | `/api/tasks` | Lister les tâches (filtrable par workspace) | Session |
| `POST` | `/api/tasks` | Créer une nouvelle tâche | Session |
| `GET` | `/api/tasks/[id]` | Récupérer une tâche par ID | Session |
| `PATCH` | `/api/tasks/[id]` | Modifier une tâche (statut, assigné, etc.) | Session |
| `DELETE` | `/api/tasks/[id]` | Supprimer une tâche | Session |
| `GET` | `/api/tasks/[id]/comments` | Récupérer les commentaires d'une tâche | Session |
| `POST` | `/api/tasks/[id]/comments` | Ajouter un commentaire | Session |

---

## Créer une Tâche et l'Attribuer

### `POST /api/tasks`

Crée une nouvelle tâche dans un projet et l'assigne optionnellement à un membre.

#### Corps de la requête (JSON)

```json
{
  "title": "Préparer le rapport mensuel",
  "description": "Compiler les KPI du mois et générer le PDF pour le client.",
  "status": "todo",
  "priority": "high",
  "tags": ["rapport", "client", "mensuel"],
  "dueDate": "2025-06-15T18:00:00.000Z",
  "projectId": "clxabc123...",
  "assigneeId": "clxdef456...",
  "subtasks": [
    { "title": "Collecter les données Google Analytics", "completed": false },
    { "title": "Mettre en page le document", "completed": false }
  ]
}
```

#### Paramètres

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `title` | `string` | ✅ | Titre de la tâche (1–200 caractères) |
| `description` | `string` | ❌ | Description détaillée (max 5000 car.) — Markdown supporté |
| `status` | `string` | ❌ | Statut initial : `todo` (défaut), `in_progress`, `review`, `done` |
| `priority` | `string` | ❌ | Priorité : `low`, `medium` (défaut), `high`, `urgent` |
| `tags` | `string[]` | ❌ | Tableau de tags |
| `dueDate` | `string` (ISO 8601) | ❌ | Date d'échéance |
| `projectId` | `string` | ✅ | ID du projet auquel rattacher la tâche |
| **`assigneeId`** | `string` | ❌ | **ID de l'utilisateur à qui attribuer la tâche** |
| `subtasks` | `array` | ❌ | Liste de sous-tâches `{ title, completed }` |

#### Réponse — 201 Created

```json
{
  "id": "clxtask789...",
  "title": "Préparer le rapport mensuel",
  "description": "Compiler les KPI du mois...",
  "status": "todo",
  "priority": "high",
  "tags": "rapport,client,mensuel",
  "dueDate": "2025-06-15T18:00:00.000Z",
  "projectId": "clxabc123...",
  "assigneeId": "clxdef456...",
  "creatorId": "clxghi789...",
  "createdAt": "2025-05-20T14:30:00.000Z",
  "updatedAt": "2025-05-20T14:30:00.000Z",
  "assignee": {
    "id": "clxdef456...",
    "name": "Marie Dupont",
    "email": "marie@entreprise.fr",
    "avatar": "...",
    "role": "member",
    "status": "online"
  },
  "subtasks": [
    { "id": "...", "title": "Collecter les données Google Analytics", "completed": false },
    { "id": "...", "title": "Mettre en page le document", "completed": false }
  ],
  "project": {
    "id": "clxabc123...",
    "name": "Projet Alpha",
    ...
  }
}
```

#### Exemple cURL

```bash
curl -X POST "https://votre-domaine.com/api/tasks" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=VOTRE_TOKEN" \
  -d '{
    "title": "Préparer le rapport mensuel",
    "priority": "high",
    "projectId": "clxabc123...",
    "assigneeId": "clxdef456..."
  }'
```

#### Exemple JavaScript (fetch)

```js
const response = await fetch("/api/tasks", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "Préparer le rapport mensuel",
    priority: "high",
    projectId: "clxabc123...",
    assigneeId: "clxdef456...",  // ← Attribution ici
    dueDate: new Date("2025-06-15").toISOString(),
  }),
});

const task = await response.json();
console.log(`Tâche créée : ${task.id}, assignée à ${task.assignee?.name}`);
```

---

## Modifier l'Attribution d'une Tâche Existante

### `PATCH /api/tasks/[id]`

Permet de **changer l'assigné**, le statut, la priorité, ou tout autre champ modifiable d'une tâche.

#### Corps de la requête (JSON) — Réassignation

```json
{
  "assigneeId": "clxnewassign789..."
}
```

#### Exemple : transférer une tâche à un autre membre

```bash
curl -X PATCH "https://votre-domaine.com/api/tasks/clxtask789..." \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=VOTRE_TOKEN" \
  -d '{"assigneeId": "clxnewassign789..."}'
```

#### Exemple : changer statut + assigné en une seule requête

```json
{
  "status": "in_progress",
  "assigneeId": "clxnewassign789...",
  "priority": "urgent"
}
```

#### Comportement important

- Si `assigneeId` est `null`, la tâche est **désassignée** (plus personne responsable).
- Un log d'activité est automatiquement créé (visible dans le fil d'activité du workspace).
- Les notifications sont envoyées au nouveau membre assigné.

#### Vérifications de sécurité

L'API vérifie que :
1. L'utilisateur authentifié est **membre du workspace** propriétaire du projet.
2. La tâche existe bien.
3. Le nouvel assigné (si fourni) existe et appartient au workspace.

---

## Récupérer les Tâches par Assigné

### `GET /api/tasks?workspaceId=...`

Retourne toutes les tâches accessibles à l'utilisateur connecté.  
Pour filtrer par assigné, utilisez les paramètres de requête côté client ou construisez votre propre logique.

#### Réponse (extrait)

```json
[
  {
    "id": "clxtask001...",
    "title": "Préparer le rapport mensuel",
    "assigneeId": "clxdef456...",
    "assignee": { "id": "clxdef456...", "name": "Marie Dupont" },
    "status": "todo",
    ...
  },
  ...
]
```

#### Filtrage côté client (JavaScript)

```js
const workspaceId = "clxworkspace...";
const assigneeId = "clxdef456...";

const res = await fetch(`/api/tasks?workspaceId=${workspaceId}`);
const tasks = await res.json();

// Filtrer les tâches assignées à une personne spécifique
const mesTaches = tasks.filter(t => t.assigneeId === assigneeId);
console.log(`${mesTaches.length} tâche(s) assignée(s)`);
```

> 💡 **Astuce** : Utilisez le hook React `useApiData` (déjà disponible dans `src/hooks/use-api-data.ts`) pour intégrer facilement les données dans vos composants.

---

## Supprimer une Tâche

### `DELETE /api/tasks/[id]`

Supprime définitivement une tâche. L'opération est **irréversible**.

```bash
curl -X DELETE "https://votre-domaine.com/api/tasks/clxtask789..." \
  -H "Cookie: next-auth.session-token=VOTRE_TOKEN"
```

#### Réponse — 200 OK

```json
{
  "message": "Task deleted successfully"
}
```

Un log d'activité de type `task_deleted` est enregistré automatiquement.

---

## Gestion des Opportunités (Pipeline CRM)

TeamFlow dispose également d'un pipeline d'opportunités (style CRM) accessible via l'API :

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/opportunities?workspaceId=...` | Lister les opportunités |
| `POST` | `/api/opportunities` | Créer une opportunité |
| `GET` | `/api/opportunities/[id]` | Détail d'une opportunité |
| `PATCH` | `/api/opportunities/[id]` | Modifier une opportunité |
| `DELETE` | `/api/opportunities/[id]` | Supprimer une opportunité |

### Créer une opportunité avec un responsable

```json
{
  "title": "Nouveau partenariat ACME Corp",
  "description": "Opportunité entrante via le salon TechConnect.",
  "organisation": "ACME Corp",
  "status": "nouveau",
  "dueDate": "2025-07-01T00:00:00.000Z",
  "responsableId": "clxuser...",
  "workspaceId": "clxworkspace..."
}
```

| Statut | Signification |
|---|---|
| `nouveau` | Nouvelle opportunité |
| `en_preparation` | Dossier en cours de préparation |
| `soumis` | Proposition soumise |
| `entretien` | Phase d'entretien / négociation |
| `accepte` | Opportunité gagnée |
| `refuse` | Opportunité perdue |

---

## Modèle de Données — Tâche

Voici le schéma complet d'une tâche tel que défini dans le modèle Prisma (`prisma/schema.prisma`) :

```prisma
model Task {
  id          String    @id @default(cuid())
  title       String
  description String?
  status      String    @default("todo")     // todo | in_progress | review | done
  priority    String    @default("medium")   // low | medium | high | urgent
  tags        String    @default("")         // Stockés en CSV : "tag1,tag2,tag3"
  dueDate     DateTime?
  projectId   String
  assigneeId  String?                        // null = non assigné
  creatorId   String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  project   Project   @relation(fields: [projectId], references: [id])
  assignee  User?     @relation("AssignedTo", fields: [assigneeId], references: [id])
  creator   User?     @relation("CreatedBy", fields: [creatorId], references: [id])
  subtasks  Subtask[]
  comments  Comment[]
}
```

### Schéma Zod — Validation côté serveur

Les données envoyées à l'API sont validées avec Zod (voir `src/lib/validations.ts`) :

```ts
export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional().nullable(),
  status: z.string().min(1).max(50).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  tags: z.array(z.string()).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  projectId: z.string().min(1, "Project is required"),
  assigneeId: z.string().optional().nullable(),
  creatorId: z.string().optional().nullable(),
  subtasks: z.array(z.object({
    title: z.string().min(1),
    completed: z.boolean().optional().default(false),
  })).optional(),
});
```

---

## Codes d'Erreur et Gestion

| Code HTTP | Signification | Exemple |
|---|---|---|
| `200` | Succès (GET, PATCH, DELETE) | — |
| `201` | Tâche créée avec succès | — |
| `400` | Erreur de validation (champs invalides) | `{"error":"Validation failed","details":{"title":["Title is required"]}}` |
| `401` | Non authentifié | `{"error":"Unauthorized"}` |
| `403` | Accès interdit (workspace non membre) | `{"error":"Workspace not found or access denied"}` |
| `404` | Ressource introuvable | `{"error":"Task not found"}` |
| `500` | Erreur interne serveur | `{"error":"Internal server error"}` |

### Exemple de gestion d'erreur côté client

```js
try {
  const res = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json();
    console.error(`Erreur ${res.status}:`, err.error);
    if (err.details) {
      console.error("Détails de validation:", err.details);
    }
    return;
  }

  const task = await res.json();
  // Succès !
} catch (error) {
  console.error("Erreur réseau:", error);
}
```

---

## Bonnes Pratiques & Rate Limiting

### Bonnes pratiques

1. **Validez vos données en amont** — Respectez le schéma Zod pour éviter les erreurs 400.
2. **Utilisez les IDs, pas les noms** — Pour `projectId`, `assigneeId`, `workspaceId`, utilisez toujours l'ID unique (CUID), jamais un nom lisible.
3. **Tags** — Les tags sont stockés en CSV (ex: `"urgent,client,facturation"`). À l'envoi, passez un tableau de chaînes (`string[]`), l'API les convertit automatiquement.
4. **Dates** — Format ISO 8601 obligatoire : `"2025-06-15T18:00:00.000Z"`.
5. **Ne créez pas de doublons** — Vérifiez si une tâche similaire existe avant d'en créer une nouvelle.
6. **Loggez les erreurs** — L'API logue déjà les erreurs côté serveur. Côté client, loggez également pour le debugging.
7. **Webhook / Polling** — Si vous intégrez un service externe, privilégiez le polling (GET périodique) ou attendez la v0.3.0 qui introduira les webhooks.

### Rate Limiting

> ⚠️ **Actuellement (v0.2.0)** : Aucun rate limiting n'est implémenté au niveau applicatif.  
> La protection repose sur l'infrastructure de déploiement (Render, Caddy).  
> **Recommandation** : Limitez vos appels à **60 requêtes/minute** par IP en attendant la v0.3.0.

### Cycle de vie d'une tâche (workflow recommandé)

```
[Création] → todo → in_progress → review → done
                   ↘ (réouverture) ↗
```

---

## Exemples Complets d'Intégration

### Exemple 1 : Script Node.js d'attribution automatique

```js
// auto-assign.js — Exécutable avec `bun run auto-assign.js`
const BASE = "https://votre-domaine.com/api";
const SESSION_COOKIE = "next-auth.session-token=VOTRE_TOKEN";

async function creerTacheEtAssigner({ titre, projetId, assigneeId, priorite }) {
  const res = await fetch(`${BASE}/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": SESSION_COOKIE,
    },
    body: JSON.stringify({
      title: titre,
      projectId,
      assigneeId,
      priority: priorite || "medium",
      status: "todo",
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Erreur ${res.status}: ${err.error}`);
  }

  return res.json();
}

// Usage
const membres = {
  alice: "clxalice...",
  bob: "clxbob...",
  charlie: "clxcharlie...",
};

(async () => {
  const tache = await creerTacheEtAssigner({
    titre: "[Auto] Vérifier les logs de production",
    projetId: "clxprojet...",
    assigneeId: membres.bob,
    priorite: "high",
  });
  console.log(`✅ Tâche "${tache.title}" assignée à Bob (ID: ${tache.assigneeId})`);
})();
```

### Exemple 2 : Webhook entrant (Next.js API Route)

```ts
// pages/api/webhook/tache-entrante.ts (ou app/api/webhook/tache-entrante/route.ts)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json();
  const { titre, description, assigneeEmail, workspaceId, projectId } = body;

  // Résoudre l'email en ID utilisateur
  const user = await db.user.findUnique({
    where: { email: assigneeEmail },
    include: {
      workspaceMembers: { where: { workspaceId } },
    },
  });

  if (!user || user.workspaceMembers.length === 0) {
    return NextResponse.json(
      { error: "Utilisateur introuvable dans ce workspace" },
      { status: 400 },
    );
  }

  // Créer la tâche
  const task = await db.task.create({
    data: {
      title: titre,
      description: description || null,
      status: "todo",
      priority: "medium",
      projectId,
      assigneeId: user.id,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
```

### Exemple 3 : Réassignation en masse (script)

```js
// reassign-bulk.js
const tasksAReassigner = [
  { taskId: "clxtask001...", nouvelAssignee: "clxuserA..." },
  { taskId: "clxtask002...", nouvelAssignee: "clxuserB..." },
  { taskId: "clxtask003...", nouvelAssignee: "clxuserA..." },
];

for (const { taskId, nouvelAssignee } of tasksAReassigner) {
  await fetch(`${BASE}/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Cookie": SESSION_COOKIE,
    },
    body: JSON.stringify({ assigneeId: nouvelAssignee }),
  });
  console.log(`🔄 Tâche ${taskId} → assignée à ${nouvelAssignee}`);
}
```

---

## Architecture Interne (pour référence)

### Flux d'une requête POST /api/tasks

```
Client (fetch)
    │
    ▼
withErrorHandler()         ← Try/catch global → 500 en cas d'erreur
    │
    ▼
withAuth()                 ← Vérifie la session NextAuth → 401 si absent
    │
    ▼
validateBody()             ← Validation Zod → 400 si invalide
    │
    ▼
Vérification workspace     ← L'utilisateur doit être membre → 403 si non
    │
    ▼
db.task.create()           ← Création Prisma (SQLite)
    │
    ▼
logActivity()              ← Log d'activité non-bloquant
    │
    ▼
Response 201 + JSON
```

### Fichiers clés

| Fichier | Rôle |
|---|---|
| `src/app/api/tasks/route.ts` | Endpoints GET (liste) et POST (création) |
| `src/app/api/tasks/[id]/route.ts` | Endpoints GET, PATCH, DELETE par ID |
| `src/lib/api-utils.ts` | Wrappers `withAuth`, `withErrorHandler`, `validateBody` |
| `src/lib/validations.ts` | Schémas Zod (`createTaskSchema`, `updateTaskSchema`) |
| `src/lib/activity-logger.ts` | Logger d'activité non-bloquant |
| `src/lib/db.ts` | Instance Prisma Client |
| `prisma/schema.prisma` | Modèle de données |

---

## Roadmap & Évolutions

| Version | Fonctionnalité |
|---|---|
| **v0.3.0** | API Keys / Bearer Token pour les intégrations tierces |
| **v0.3.0** | Webhooks sortants (callback URL sur événements tâche) |
| **v0.4.0** | Rate limiting configurable |
| **v0.4.0** | Endpoint de recherche full-text des tâches |
| **v0.5.0** | Synchronisation bidirectionnelle avec outils externes (Jira, Notion, Trello) |

---

> **Contact & Support** : Pour toute question technique, référez-vous au dépôt Git ou ouvrez une issue.  
> Déploiement : Render (compte `jeremybasix@gmail.com`).
