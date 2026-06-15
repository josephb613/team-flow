import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const PROJECT_ID = 'cmqc77he50007xlzwb9sv7p5w';
const BAGS_SACKS_ID = 'cmqcw6zno0001xly4eec5ybk5';

const suppliers = [
  {
    id: BAGS_SACKS_ID,
    update: true,
    data: {
      name: 'Bags&Sacks SARL',
      organization: 'Kinshasa / Lubumbashi',
      role: 'Fournisseur sacs PP tissés — leader national',
      email: 'info@bagsandsacks.net',
      website: 'https://bagsandsacks.net',
      influence: 5,
      interest: 5,
      engagement: 'supportive',
      strategy: `Entreprise sœur de B&S, leader national du sac tissé PP. Usines à Kimpese (Kongo Central) et Lubumbashi (Haut-Katanga).

Produits : sacs en polypropylène tissé, fond plat (block-bottom) pour ciment et sacs agricoles (maïs, farine, sucre, etc.).

Capacité : ~2 millions de big-bags/an par usine (~70 % de la demande locale de bulk-bags). Effectif : ~250-400 personnes.

Certifications non précisées ; produits conformes aux normes industrielles de l'emballage. Prix/FOB locaux non publiés ; MOQ typiques usine ≈ 10 000+.

Livraison locale rapide (quelques jours) en camion. Paiement : probablement LC ou acompte. Avis clients non disponibles publiquement.

Risques : dépendance aux coûts PP importé, concurrence d'importations (bags & sacks importés), sensibilité à la réglementation plastique (RDC a interdit certains plastiques fins).

Contact : info@bagsandsacks.net | 586 Route de Kipushi, Lubumbashi`,
    },
  },
  {
    create: true,
    matchName: 'FilaFil',
    data: {
      name: 'FilaFil',
      organization: 'Kinshasa — 13ᵉ rue Limete',
      role: 'TPE familiale — sacs PP tissés personnalisés',
      phone: '+243 819 206 939 / +243 852 656 186',
      influence: 2,
      interest: 4,
      engagement: 'neutral',
      strategy: `TPE familiale spécialisée dans les sacs PP tissés personnalisés. Siège : 13ᵉ rue Limete, Kinshasa.

Offre : sacs PP de toutes tailles et couleurs, doublure PE possible pour étanchéité. Grammages courants sacs 25 kg (riz, maïs) : ~70-85 g/m², dimensions ~50×90 cm.

Capacité mensuelle non spécifiée. Pas de certification. Aucun site web ni données publiques de production.

Prix de vente au détail local ≈ 0,2-0,4 $/sac (source non vérifiée). Livraison : local Kinshasa, délai 1-2 j. Paiement à la commande.

Risques : petite structure, fiabilité logistique limitée, sans accès facile au PP importé (cadences variables).

Contact : +243 819 206 939 / +243 852 656 186`,
      projectId: PROJECT_ID,
    },
  },
  {
    create: true,
    matchName: 'NODAPLAST SARL',
    data: {
      name: 'NODAPLAST SARL',
      organization: 'Kinshasa — 12, 10ᵉ Rue Industrielle, Limete',
      role: 'Distributeur / plasticien — emballages sur mesure',
      phone: '(+243) 846 888 888',
      email: 'nodaplast@hotmail.com',
      influence: 3,
      interest: 4,
      engagement: 'neutral',
      strategy: `Distributeur/plasticien limetais, vente d'emballages sur mesure. Adresse : 12, 10ᵉ Rue Industrielle, Limete (Kinshasa).

Gamme : films PE, sachets alimentaires, cartons, sacs PP non tissés et tissés (y compris sacs biodégradables). Sacs 25 kg en PP ou doublés PE ; dimensions et grammage non communiqués.

Capacité de production nulle (revendeur), dépend d'imports de matière ou sous-traitants. Certifications qualité non détaillées.

Prix : à la commande, non divulgué publiquement. MOQ adaptables (~500+). Délais : immédiat (stock local). Paiement comptant ou LC.

Risques : dépendance aux fournisseurs internationaux, volatilité des cours PP, variations de change.

Contact : (+243) 846 888 888 | nodaplast@hotmail.com`,
      projectId: PROJECT_ID,
    },
  },
];

for (const supplier of suppliers) {
  if (supplier.update) {
    const updated = await db.stakeholder.update({
      where: { id: supplier.id },
      data: supplier.data,
    });
    console.log(`Updated: ${updated.name}`);
    continue;
  }

  const existing = await db.stakeholder.findFirst({
    where: { projectId: PROJECT_ID, name: supplier.data.name },
  });

  if (existing) {
    const updated = await db.stakeholder.update({
      where: { id: existing.id },
      data: supplier.data,
    });
    console.log(`Updated existing: ${updated.name}`);
  } else {
    const created = await db.stakeholder.create({ data: supplier.data });
    console.log(`Created: ${created.name}`);
  }
}

const all = await db.stakeholder.findMany({
  where: { projectId: PROJECT_ID },
  select: { id: true, name: true, role: true, influence: true, interest: true },
  orderBy: { name: 'asc' },
});
console.log('\nStakeholders du projet Usine de fabrication de riz:');
console.log(JSON.stringify(all, null, 2));

await db.$disconnect();
