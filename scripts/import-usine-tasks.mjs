import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const PROJECT_ID = 'cmqc77he50007xlzwb9sv7p5w';

const sections = [
  {
    title: '1. Constitution de l\'équipe',
    description:
      'Mise en place d\'une équipe compétente, bien structurée et clairement organisée pour le lancement du projet.',
    color: '#3b82f6',
    tasks: [
      'Constituer une équipe solide et organisée pour le lancement du projet',
      'Recruter un manutentionnaire chargé du transport et du port des charges',
      'Recruter une personne responsable de la couture et de la fermeture des sacs',
      'Recruter un opérateur chargé du traitement du riz et de l\'utilisation des machines',
      'Définir clairement les rôles et responsabilités de chaque membre de l\'équipe',
      'Prévoir une formation de base sur l\'utilisation des équipements et les règles de sécurité',
    ],
  },
  {
    title: '2. Équipements et maintenance',
    description:
      'Assurer le bon fonctionnement des équipements, leur capacité de production et leur entretien régulier.',
    color: '#8b5cf6',
    tasks: [
      'Ajouter un moteur supplémentaire en complément de celui déjà existant',
      'Faire appel à un mécanicien afin d\'évaluer si les moteurs actuels sont adaptés et suffisamment performants',
      'Effectuer des tests sur le terrain avec les machines existantes afin de vérifier leur capacité de production',
      'Vérifier la consommation électrique et les besoins énergétiques des équipements',
      'Prévoir un plan de maintenance préventive des machines',
      'Identifier les pièces de rechange importantes à garder en réserve',
      'Évaluer la possibilité d\'acquérir des équipements supplémentaires pour augmenter la productivité',
    ],
  },
  {
    title: '3. Fourniture et branding des sacs',
    description:
      'Emballage fonctionnel, résistant et reflétant une image de marque professionnelle et attractive.',
    color: '#f59e0b',
    tasks: [
      'Trouver un fournisseur fiable de sacs de riz aux formats 5 kg, 10 kg, 20 kg et 50 kg',
      'Étudier les possibilités de branding et de personnalisation des sacs',
      'Vérifier si le fournisseur peut imprimer le logo, le nom de la marque et les informations du produit sur les sacs',
      'Concevoir l\'identité visuelle et le design des emballages',
      'Déterminer la qualité des sacs adaptée au transport et à la conservation du riz',
      'Comparer plusieurs fournisseurs afin d\'obtenir le meilleur rapport qualité-prix',
    ],
  },
  {
    title: '4. Aspects légaux et administratifs',
    description:
      'Formalisation juridique et administrative du projet pour exercer légalement l\'activité et protéger les intérêts des partenaires.',
    color: '#ef4444',
    tasks: [
      'Signer un contrat de partenariat avec les différents partenaires du projet',
      'Définir les responsabilités, investissements et parts de chaque partenaire',
      'Vérifier les autorisations nécessaires pour l\'exploitation de l\'usine',
      'Étudier les démarches de création officielle de l\'entreprise',
      'Prévoir les documents administratifs et fiscaux nécessaires',
      'Mettre en place un règlement interne pour l\'équipe',
    ],
  },
  {
    title: '5. Lieu d\'exploitation',
    description:
      'Choix et aménagement du site de production pour de bonnes conditions de travail, accessibilité et sécurité.',
    color: '#10b981',
    tasks: [
      'Effectuer une descente sur le site d\'exploitation afin d\'étudier la faisabilité de l\'installation des équipements',
      'Vérifier l\'accessibilité du site pour les fournisseurs et les véhicules de transport',
      'Étudier la disponibilité de l\'électricité et de l\'eau sur le site',
      'Évaluer la possibilité de louer un petit dépôt si l\'espace actuel est insuffisant',
      'Étudier l\'option de construire un hangar ou un dépôt en tôle pour l\'exploitation',
      'Réfléchir aux solutions de sécurisation du site (clôture, gardiennage, éclairage, caméras, etc.)',
      'Prévoir un espace de stockage sécurisé pour le riz et les équipements',
    ],
  },
  {
    title: '6. Achat de matières premières',
    description:
      'Approvisionnement régulier et de qualité en riz paddy pour assurer une production continue.',
    color: '#06b6d4',
    tasks: [
      'Négocier un prix d\'achat avantageux pour le riz paddy',
      'S\'engager avec des fournisseurs fiables et réguliers',
      'Identifier plusieurs fournisseurs afin d\'éviter les ruptures d\'approvisionnement',
      'Vérifier la qualité du riz paddy avant achat',
      'Évaluer les coûts de transport des matières premières',
      'Prévoir un stock minimum pour assurer la continuité de la production',
      'Mettre en place un suivi des achats et des dépenses liées aux matières premières',
    ],
  },
  {
    title: '7. Commercialisation et stratégie de vente',
    description:
      'Stratégie commerciale pour écouler la production, construire une marque reconnue et atteindre les cibles du marché.',
    color: '#ec4899',
    tasks: [
      'Définir une stratégie de commercialisation du riz',
      'Identifier les marchés cibles et les potentiels distributeurs',
      'Déterminer les prix de vente selon les différents formats de sacs',
      'Créer une marque forte et reconnaissable',
      'Prévoir des supports marketing et de communication',
      'Étudier les possibilités de distribution dans les commerces, supermarchés et restaurants',
      'Mettre en place un système de suivi des ventes et des livraisons',
    ],
  },
  {
    title: '8. Gestion financière et budget',
    description:
      'Gestion financière rigoureuse pour maîtriser les coûts, anticiper la trésorerie et assurer la rentabilité.',
    color: '#6366f1',
    tasks: [
      'Établir un budget global pour le lancement du projet',
      'Évaluer les coûts liés aux machines, à la main-d\'œuvre, au transport et aux matières premières',
      'Prévoir un fonds de roulement pour les premiers mois d\'exploitation',
      'Déterminer les besoins en financement supplémentaires',
      'Mettre en place un système de suivi des dépenses et des recettes',
      'Prévoir un plan de rentabilité et des objectifs financiers',
      'Identifier des partenaires financiers ou investisseurs potentiels si nécessaire',
    ],
  },
  {
    title: '9. Logistique et transport',
    description:
      'Organisation efficace des flux de marchandises pour réduire les coûts et améliorer la satisfaction des clients.',
    color: '#14b8a6',
    tasks: [
      'Organiser le transport des matières premières vers le site de production',
      'Prévoir les moyens de livraison du riz fini vers les clients et distributeurs',
      'Évaluer les coûts logistiques et les optimiser',
      'Identifier des transporteurs fiables',
      'Prévoir un espace de chargement et de déchargement des marchandises',
      'Mettre en place un système de gestion des stocks et des livraisons',
      'Planifier les itinéraires et délais de distribution',
    ],
  },
  {
    title: '10. Qualité, hygiène et sécurité',
    description:
      'Qualité du produit final et sécurité des travailleurs — respect des normes d\'hygiène pour la confiance des consommateurs.',
    color: '#f97316',
    tasks: [
      'Mettre en place des règles d\'hygiène pour la manipulation du riz',
      'Prévoir des équipements de protection pour les travailleurs',
      'Vérifier régulièrement la qualité du riz produit',
      'Définir des procédures de nettoyage des machines et du site',
      'Prévoir des extincteurs et équipements de sécurité sur le lieu d\'exploitation',
      'Sensibiliser l\'équipe aux normes de sécurité et de prévention des accidents',
      'Mettre en place un système de contrôle qualité avant la commercialisation du produit',
    ],
  },
];

async function main() {
  const project = await db.project.findUnique({ where: { id: PROJECT_ID } });
  if (!project) {
    throw new Error(`Projet introuvable: ${PROJECT_ID}`);
  }

  const existingTasks = await db.task.count({ where: { projectId: PROJECT_ID } });
  if (existingTasks > 0) {
    console.log(`Le projet contient déjà ${existingTasks} tâche(s). Import annulé pour éviter les doublons.`);
    return;
  }

  await db.project.update({
    where: { id: PROJECT_ID },
    data: {
      name: 'Usine de fabrication de riz',
      description:
        'Projet d\'usine de fabrication de riz — plan de travail complet couvrant les aspects humain, technique, commercial, financier et réglementaire.',
      icon: '🌾',
      color: '#10b981',
    },
  });

  let taskCount = 0;
  let milestoneCount = 0;
  let sprintCount = 0;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];

    const milestone = await db.milestone.create({
      data: {
        title: section.title,
        description: section.description,
        projectId: PROJECT_ID,
        color: section.color,
        status: 'upcoming',
      },
    });
    milestoneCount++;

    const sprintStart = new Date('2026-06-16T00:00:00.000Z');
    sprintStart.setDate(sprintStart.getDate() + i * 14);
    const sprintEnd = new Date(sprintStart);
    sprintEnd.setDate(sprintEnd.getDate() + 13);

    const sprint = await db.sprint.create({
      data: {
        name: section.title,
        goal: section.description,
        projectId: PROJECT_ID,
        status: 'planning',
        startDate: sprintStart,
        endDate: sprintEnd,
      },
    });
    sprintCount++;

    const tag = section.title.replace(/^\d+\.\s*/, '');

    for (const taskTitle of section.tasks) {
      await db.task.create({
        data: {
          title: taskTitle,
          description: section.description,
          status: 'todo',
          priority: 'medium',
          tags: tag,
          projectId: PROJECT_ID,
          milestoneId: milestone.id,
          sprintId: sprint.id,
        },
      });
      taskCount++;
    }
  }

  console.log(
    `Import terminé : ${taskCount} tâches, ${milestoneCount} jalons et ${sprintCount} sprints pour le projet "${project.name}".`
  );
}

main()
  .catch((err) => {
    console.error('Erreur:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
