// ========================
// Mock Data for ContentFlow - SaaS CMS Multi-Tenant
// ========================

import type {
  Newsletter, Article, Announcement, Campaign,
  CMSUser, MediaItem, ContentTemplate, DistributionChannel,
  Automation, AuditLogEntry, CalendarEvent,
} from './types';

// ─── Users ──────────────────────────────────────────────────────────────
export const mockUsers: CMSUser[] = [
  { id: 'u-1', name: 'Marie Dupont', email: 'marie@globalcorp.com', avatar: '', role: 'tenant_admin', status: 'online', tenantId: 't-1', tenantName: 'Global Corp France', lastActive: new Date().toISOString(), contentCount: 34 },
  { id: 'u-2', name: 'Jean-Pierre Martin', email: 'jp.martin@globalcorp.com', avatar: '', role: 'editor', status: 'online', tenantId: 't-1', tenantName: 'Global Corp France', lastActive: new Date().toISOString(), contentCount: 28 },
  { id: 'u-3', name: 'Sophie Laurent', email: 'sophie.l@globalcorp.com', avatar: '', role: 'editor', status: 'away', tenantId: 't-1', tenantName: 'Global Corp France', lastActive: new Date(Date.now() - 30 * 60000).toISOString(), contentCount: 22 },
  { id: 'u-4', name: 'Patrick Mbeki', email: 'patrick@globalcorp-rdc.com', avatar: '', role: 'tenant_admin', status: 'online', tenantId: 't-2', tenantName: 'Global Corp RDC', lastActive: new Date().toISOString(), contentCount: 15 },
  { id: 'u-5', name: 'Aminata Diallo', email: 'aminata@globalcorp-rdc.com', avatar: '', role: 'contributor', status: 'offline', tenantId: 't-2', tenantName: 'Global Corp RDC', lastActive: new Date(Date.now() - 2 * 3600000).toISOString(), contentCount: 8 },
  { id: 'u-6', name: 'Lucas Bernard', email: 'lucas@techbrand.com', avatar: '', role: 'editor', status: 'busy', tenantId: 't-3', tenantName: 'TechBrand', lastActive: new Date(Date.now() - 10 * 60000).toISOString(), contentCount: 19 },
  { id: 'u-7', name: 'Claire Moreau', email: 'claire@globalcorp.com', avatar: '', role: 'contributor', status: 'online', tenantId: 't-1', tenantName: 'Global Corp France', lastActive: new Date().toISOString(), contentCount: 12 },
  { id: 'u-8', name: 'David Koffi', email: 'david@globalcorp-rdc.com', avatar: '', role: 'reader', status: 'offline', tenantId: 't-2', tenantName: 'Global Corp RDC', lastActive: new Date(Date.now() - 24 * 3600000).toISOString(), contentCount: 3 },
];

// ─── Newsletters ────────────────────────────────────────────────────────
export const mockNewsletters: Newsletter[] = [
  { id: 'nl-1', type: 'newsletter', title: 'Flash Info Juin 2025', subject: 'Flash Info - Toutes les actualités du mois', excerpt: 'Récapitulatif des actualités importantes du mois de juin', status: 'published', priority: 'high', authorId: 'u-2', tenantId: 't-1', tags: ['mensuel', 'interne'], scheduledAt: '2025-06-01T09:00:00Z', publishedAt: '2025-06-01T09:05:00Z', createdAt: '2025-05-28T14:00:00Z', updatedAt: '2025-06-01T09:05:00Z', viewCount: 342, openRate: 68.5, clickRate: 24.3, bounceRate: 2.1, unsubscribeRate: 0.5, recipientCount: 450, channelIds: ['ch-1', 'ch-2'] },
  { id: 'nl-2', type: 'newsletter', title: 'Weekly Digest #24', subject: 'Votre résumé hebdomadaire', excerpt: 'Les temps forts de la semaine du 2 au 6 juin', status: 'scheduled', priority: 'medium', authorId: 'u-3', tenantId: 't-1', tags: ['hebdomadaire', 'externe'], scheduledAt: '2025-06-09T08:00:00Z', createdAt: '2025-06-05T10:00:00Z', updatedAt: '2025-06-06T16:00:00Z', viewCount: 0, openRate: 0, clickRate: 0, bounceRate: 0, unsubscribeRate: 0, recipientCount: 520, channelIds: ['ch-1'] },
  { id: 'nl-3', type: 'newsletter', title: 'Lettre aux partenaires', subject: 'Partenaires - Avancées et perspectives', excerpt: 'Informations destinées à nos partenaires stratégiques', status: 'review', priority: 'high', authorId: 'u-1', tenantId: 't-1', tags: ['partenaires', 'externe'], createdAt: '2025-06-04T11:00:00Z', updatedAt: '2025-06-06T15:00:00Z', viewCount: 0, openRate: 0, clickRate: 0, bounceRate: 0, unsubscribeRate: 0, recipientCount: 85, channelIds: ['ch-3'] },
  { id: 'nl-4', type: 'newsletter', title: 'Bulletin RDC - Juin', subject: 'Actualités de Global Corp RDC', excerpt: 'Nouvelles de la filiale congolaise', status: 'draft', priority: 'medium', authorId: 'u-4', tenantId: 't-2', tags: ['mensuel', 'filiale'], createdAt: '2025-06-06T09:00:00Z', updatedAt: '2025-06-06T14:00:00Z', viewCount: 0, openRate: 0, clickRate: 0, bounceRate: 0, unsubscribeRate: 0, recipientCount: 120, channelIds: ['ch-1'] },
  { id: 'nl-5', type: 'newsletter', title: 'Newsletter TechBrand #12', subject: 'TechBrand - Innovations et produits', excerpt: 'Dernières innovations de TechBrand', status: 'approved', priority: 'medium', authorId: 'u-6', tenantId: 't-3', tags: ['produit', 'externe'], createdAt: '2025-06-03T08:00:00Z', updatedAt: '2025-06-05T17:00:00Z', viewCount: 0, openRate: 0, clickRate: 0, bounceRate: 0, unsubscribeRate: 0, recipientCount: 2100, channelIds: ['ch-2', 'ch-4'] },
  { id: 'nl-6', type: 'newsletter', title: 'Rapports Q1 2025', subject: 'Vos résultats du premier trimestre', excerpt: 'Bilan financier et opérationnel du Q1', status: 'archived', priority: 'low', authorId: 'u-1', tenantId: 't-1', tags: ['trimestriel', 'interne'], publishedAt: '2025-04-15T10:00:00Z', createdAt: '2025-04-10T09:00:00Z', updatedAt: '2025-04-15T10:00:00Z', viewCount: 892, openRate: 72.1, clickRate: 18.7, bounceRate: 1.8, unsubscribeRate: 0.3, recipientCount: 380, channelIds: ['ch-1'] },
];

// ─── Articles ───────────────────────────────────────────────────────────
export const mockArticles: Article[] = [
  { id: 'ar-1', type: 'article', title: 'Stratégie de communication 2025', excerpt: 'Notre nouvelle approche pour les communications internes et externes', status: 'published', priority: 'high', authorId: 'u-1', tenantId: 't-1', tags: ['stratégie', 'communication'], publishedAt: '2025-05-20T10:00:00Z', createdAt: '2025-05-15T14:00:00Z', updatedAt: '2025-05-20T10:00:00Z', viewCount: 567, category: 'Stratégie', readingTime: 8, commentCount: 12, likeCount: 34, shareCount: 8, clickRate: 12.5, openRate: 0 },
  { id: 'ar-2', type: 'article', title: 'Guide du contributeur - Meilleures pratiques', excerpt: 'Comment rédiger des contenus efficaces pour notre plateforme', status: 'published', priority: 'medium', authorId: 'u-2', tenantId: 't-1', tags: ['guide', 'rédaction'], publishedAt: '2025-05-10T09:00:00Z', createdAt: '2025-05-01T11:00:00Z', updatedAt: '2025-05-10T09:00:00Z', viewCount: 324, category: 'Guide', readingTime: 12, commentCount: 8, likeCount: 21, shareCount: 5, clickRate: 8.2, openRate: 0 },
  { id: 'ar-3', type: 'article', title: 'Résultats financiers Q2 2025', excerpt: 'Analyse des performances du deuxième trimestre', status: 'review', priority: 'urgent', authorId: 'u-3', tenantId: 't-1', tags: ['finance', 'rapport'], createdAt: '2025-06-05T08:00:00Z', updatedAt: '2025-06-06T16:00:00Z', viewCount: 0, category: 'Finance', readingTime: 15, commentCount: 3, likeCount: 0, shareCount: 0, clickRate: 0, openRate: 0 },
  { id: 'ar-4', type: 'article', title: 'Nouvelles directives RGPD', excerpt: 'Mise à jour des procédures de conformité au RGPD', status: 'draft', priority: 'high', authorId: 'u-7', tenantId: 't-1', tags: ['rgpd', 'conformité'], createdAt: '2025-06-06T10:00:00Z', updatedAt: '2025-06-06T14:00:00Z', viewCount: 0, category: 'Conformité', readingTime: 6, commentCount: 0, likeCount: 0, shareCount: 0, clickRate: 0, openRate: 0 },
  { id: 'ar-5', type: 'article', title: 'Inauguration bureau Kinshasa', excerpt: 'Ouverture de notre nouvelle succursale en RDC', status: 'approved', priority: 'medium', authorId: 'u-4', tenantId: 't-2', tags: ['inauguration', 'filiale'], createdAt: '2025-06-02T09:00:00Z', updatedAt: '2025-06-04T11:00:00Z', viewCount: 0, category: 'Événement', readingTime: 4, commentCount: 2, likeCount: 0, shareCount: 0, clickRate: 0, openRate: 0 },
  { id: 'ar-6', type: 'article', title: 'Lancement produit TechFlow Pro', excerpt: 'Présentation de notre nouvelle solution TechFlow Pro', status: 'scheduled', priority: 'high', authorId: 'u-6', tenantId: 't-3', tags: ['produit', 'lancement'], scheduledAt: '2025-06-15T10:00:00Z', createdAt: '2025-06-01T08:00:00Z', updatedAt: '2025-06-06T09:00:00Z', viewCount: 0, category: 'Produit', readingTime: 7, commentCount: 5, likeCount: 2, shareCount: 1, clickRate: 0, openRate: 0 },
];

// ─── Announcements ──────────────────────────────────────────────────────
export const mockAnnouncements: Announcement[] = [
  { id: 'an-1', type: 'announcement', title: 'Mise à jour système prévue', excerpt: 'Maintenance planifiée le 15 juin de 22h à 2h', status: 'published', priority: 'urgent', authorId: 'u-1', tenantId: 't-1', tags: ['maintenance', 'système'], publishedAt: '2025-06-06T08:00:00Z', createdAt: '2025-06-05T14:00:00Z', updatedAt: '2025-06-06T08:00:00Z', viewCount: 189, urgency: 'critical', targetAudience: 'all', acknowledgedCount: 156, totalRecipients: 200, openRate: 0, clickRate: 0 },
  { id: 'an-2', type: 'announcement', title: 'Nouveau processus de validation', excerpt: 'Modification du workflow de validation des contenus', status: 'published', priority: 'medium', authorId: 'u-2', tenantId: 't-1', tags: ['processus', 'workflow'], publishedAt: '2025-06-04T10:00:00Z', createdAt: '2025-06-03T09:00:00Z', updatedAt: '2025-06-04T10:00:00Z', viewCount: 134, urgency: 'info', targetAudience: 'tenant', acknowledgedCount: 98, totalRecipients: 120, openRate: 0, clickRate: 0 },
  { id: 'an-3', type: 'announcement', title: 'Politique de télétravail mise à jour', excerpt: 'Nouvelle politique hybride à partir de juillet', status: 'review', priority: 'high', authorId: 'u-1', tenantId: 't-1', tags: ['rh', 'télétravail'], createdAt: '2025-06-06T11:00:00Z', updatedAt: '2025-06-06T15:00:00Z', viewCount: 0, urgency: 'warning', targetAudience: 'all', acknowledgedCount: 0, totalRecipients: 200, openRate: 0, clickRate: 0 },
  { id: 'an-4', type: 'announcement', title: 'Fermeture bureaux - Fête nationale', excerpt: 'Bureaux fermés le 30 juin pour la fête nationale', status: 'draft', priority: 'low', authorId: 'u-4', tenantId: 't-2', tags: ['fermeture', 'férié'], createdAt: '2025-06-06T08:00:00Z', updatedAt: '2025-06-06T10:00:00Z', viewCount: 0, urgency: 'info', targetAudience: 'tenant', acknowledgedCount: 0, totalRecipients: 120, openRate: 0, clickRate: 0 },
];

// ─── Campaigns ──────────────────────────────────────────────────────────
export const mockCampaigns: Campaign[] = [
  { id: 'cp-1', name: 'Campagne Rentrée 2025', description: 'Communication de rentrée pour tous les collaborateurs', color: '#3b82f6', status: 'active', startDate: '2025-06-01', endDate: '2025-06-30', tenantId: 't-1', contentCount: 12, publishedCount: 8, totalReach: 2500, avgOpenRate: 65.2, avgClickRate: 22.1, channels: ['ch-1', 'ch-2', 'ch-3'], createdAt: '2025-05-20T10:00:00Z' },
  { id: 'cp-2', name: 'Lancement TechFlow Pro', description: 'Campagne de lancement du nouveau produit', color: '#f59e0b', status: 'active', startDate: '2025-06-10', endDate: '2025-07-10', tenantId: 't-3', contentCount: 8, publishedCount: 3, totalReach: 5000, avgOpenRate: 58.7, avgClickRate: 31.4, channels: ['ch-2', 'ch-4'], createdAt: '2025-06-01T08:00:00Z' },
  { id: 'cp-3', name: 'Engagement interne Q2', description: 'Renforcer l\'engagement des collaborateurs', color: '#06b6d4', status: 'draft', startDate: '2025-07-01', endDate: '2025-07-31', tenantId: 't-1', contentCount: 5, publishedCount: 0, totalReach: 0, avgOpenRate: 0, avgClickRate: 0, channels: ['ch-1'], createdAt: '2025-06-05T14:00:00Z' },
  { id: 'cp-4', name: 'Expansion RDC', description: 'Communication autour de l\'expansion en RDC', color: '#ef4444', status: 'paused', startDate: '2025-05-15', endDate: '2025-06-15', tenantId: 't-2', contentCount: 6, publishedCount: 4, totalReach: 800, avgOpenRate: 54.3, avgClickRate: 18.9, channels: ['ch-1', 'ch-3'], createdAt: '2025-05-10T09:00:00Z' },
  { id: 'cp-5', name: 'Anniversaire 10 ans', description: 'Célébration des 10 ans de Global Corp', color: '#8b5cf6', status: 'completed', startDate: '2025-04-01', endDate: '2025-04-30', tenantId: 't-1', contentCount: 15, publishedCount: 15, totalReach: 3200, avgOpenRate: 71.5, avgClickRate: 28.3, channels: ['ch-1', 'ch-2', 'ch-3', 'ch-4'], createdAt: '2025-03-20T10:00:00Z' },
];

// ─── Media ──────────────────────────────────────────────────────────────
export const mockMedia: MediaItem[] = [
  { id: 'm-1', name: 'banner-rentree-2025.jpg', type: 'image', mimeType: 'image/jpeg', size: 2400000, url: '#', thumbnailUrl: '#', uploadedBy: 'u-2', tenantId: 't-1', alt: 'Bannière Rentrée 2025', width: 1920, height: 600, createdAt: '2025-05-20T10:00:00Z' },
  { id: 'm-2', name: 'rapport-q1-2025.pdf', type: 'document', mimeType: 'application/pdf', size: 5400000, url: '#', uploadedBy: 'u-1', tenantId: 't-1', createdAt: '2025-04-15T09:00:00Z' },
  { id: 'm-3', name: 'presentation-techflow.mp4', type: 'video', mimeType: 'video/mp4', size: 52000000, url: '#', thumbnailUrl: '#', uploadedBy: 'u-6', tenantId: 't-3', width: 1920, height: 1080, createdAt: '2025-06-01T08:00:00Z' },
  { id: 'm-4', name: 'logo-globalcorp.svg', type: 'image', mimeType: 'image/svg+xml', size: 45000, url: '#', thumbnailUrl: '#', uploadedBy: 'u-2', tenantId: 't-1', alt: 'Logo Global Corp', width: 400, height: 120, createdAt: '2025-01-10T10:00:00Z' },
  { id: 'm-5', name: 'guide-contributeur.docx', type: 'document', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 890000, url: '#', uploadedBy: 'u-2', tenantId: 't-1', createdAt: '2025-05-01T11:00:00Z' },
  { id: 'm-6', name: 'photo-equipes.jpg', type: 'image', mimeType: 'image/jpeg', size: 3100000, url: '#', thumbnailUrl: '#', uploadedBy: 'u-7', tenantId: 't-1', alt: 'Photo des équipes', width: 2400, height: 1600, createdAt: '2025-06-03T14:00:00Z' },
  { id: 'm-7', name: 'podcast-interne-ep3.mp3', type: 'audio', mimeType: 'audio/mpeg', size: 15000000, url: '#', uploadedBy: 'u-3', tenantId: 't-1', createdAt: '2025-06-05T16:00:00Z' },
  { id: 'm-8', name: 'infographie-rgpd.png', type: 'image', mimeType: 'image/png', size: 1200000, url: '#', thumbnailUrl: '#', uploadedBy: 'u-7', tenantId: 't-1', alt: 'Infographie RGPD', width: 1200, height: 800, createdAt: '2025-06-06T10:00:00Z' },
];

// ─── Templates ──────────────────────────────────────────────────────────
export const mockTemplates: ContentTemplate[] = [
  { id: 'tp-1', name: 'Newsletter mensuelle', description: 'Template standard pour les newsletters mensuelles', type: 'newsletter', thumbnail: '📧', category: 'Newsletter', isPremium: false, usageCount: 45, createdAt: '2024-01-15T10:00:00Z' },
  { id: 'tp-2', name: 'Article corporate', description: 'Template pour articles institutionnels', type: 'article', thumbnail: '📄', category: 'Article', isPremium: false, usageCount: 32, createdAt: '2024-02-10T10:00:00Z' },
  { id: 'tp-3', name: 'Annonce urgente', description: 'Template pour annonces critiques', type: 'announcement', thumbnail: '🚨', category: 'Annonce', isPremium: false, usageCount: 18, createdAt: '2024-03-05T10:00:00Z' },
  { id: 'tp-4', name: 'Communiqué de presse', description: 'Template professionnel pour communiqués', type: 'communique', thumbnail: '📰', category: 'Communiqué', isPremium: true, usageCount: 12, createdAt: '2024-04-20T10:00:00Z' },
  { id: 'tp-5', name: 'Flash info', description: 'Template court pour flash d\'information', type: 'newsletter', thumbnail: '⚡', category: 'Newsletter', isPremium: false, usageCount: 67, createdAt: '2024-05-01T10:00:00Z' },
  { id: 'tp-6', name: 'Rapport trimestriel', description: 'Template pour rapports financiers', type: 'article', thumbnail: '📊', category: 'Rapport', isPremium: true, usageCount: 8, createdAt: '2024-06-15T10:00:00Z' },
];

// ─── Distribution Channels ──────────────────────────────────────────────
export const mockChannels: DistributionChannel[] = [
  { id: 'ch-1', name: 'Email - Collaborateurs', type: 'email', icon: '📧', subscriberCount: 520, isActive: true, lastSentAt: '2025-06-06T09:00:00Z' },
  { id: 'ch-2', name: 'Site Web Corporate', type: 'web', icon: '🌐', subscriberCount: 0, isActive: true, lastSentAt: '2025-06-05T14:00:00Z' },
  { id: 'ch-3', name: 'Intranet Global', type: 'intranet', icon: '🏢', subscriberCount: 380, isActive: true, lastSentAt: '2025-06-04T10:00:00Z' },
  { id: 'ch-4', name: 'Réseaux Sociaux', type: 'social', icon: '📱', subscriberCount: 12500, isActive: true, lastSentAt: '2025-06-06T08:00:00Z' },
  { id: 'ch-5', name: 'Notifications Push', type: 'push', icon: '🔔', subscriberCount: 290, isActive: true, lastSentAt: '2025-06-06T07:00:00Z' },
  { id: 'ch-6', name: 'SMS Urgences', type: 'sms', icon: '💬', subscriberCount: 150, isActive: false, lastSentAt: '2025-05-20T16:00:00Z' },
];

// ─── Automations ────────────────────────────────────────────────────────
export const mockAutomations: Automation[] = [
  { id: 'au-1', name: 'Rappel échéance 24h', trigger: 'Deadline approaching', action: 'Send notification', enabled: true, lastRun: '2025-06-06T08:00:00Z', runCount: 124, tenantId: 't-1' },
  { id: 'au-2', name: 'Auto-approuver lectures', trigger: 'Content submitted', action: 'Auto-approve for readers', enabled: true, lastRun: '2025-06-06T07:00:00Z', runCount: 89, tenantId: 't-1' },
  { id: 'au-3', name: 'Notifier valideurs', trigger: 'Content in review', action: 'Send notification to validators', enabled: true, lastRun: '2025-06-06T06:00:00Z', runCount: 56, tenantId: 't-1' },
  { id: 'au-4', name: 'Archiver contenus > 1 an', trigger: 'Content age > 365 days', action: 'Move to archive', enabled: false, lastRun: '2025-05-01T00:00:00Z', runCount: 3, tenantId: 't-1' },
  { id: 'au-5', name: 'Rapport hebdomadaire', trigger: 'Every Monday 9:00', action: 'Generate weekly report', enabled: true, lastRun: '2025-06-02T09:00:00Z', runCount: 22, tenantId: 't-1' },
];

// ─── Audit Logs ─────────────────────────────────────────────────────────
export const mockAuditLogs: AuditLogEntry[] = [
  { id: 'al-1', action: 'create', entityType: 'newsletter', entityId: 'nl-2', userId: 'u-3', tenantId: 't-1', details: 'Newsletter "Weekly Digest #24" créée', timestamp: '2025-06-06T16:00:00Z' },
  { id: 'al-2', action: 'validate', entityType: 'newsletter', entityId: 'nl-5', userId: 'u-1', tenantId: 't-3', details: 'Newsletter "Newsletter TechBrand #12" approuvée', timestamp: '2025-06-05T17:00:00Z' },
  { id: 'al-3', action: 'publish', entityType: 'announcement', entityId: 'an-1', userId: 'u-1', tenantId: 't-1', details: 'Annonce "Mise à jour système" publiée', timestamp: '2025-06-06T08:00:00Z' },
  { id: 'al-4', action: 'update', entityType: 'article', entityId: 'ar-3', userId: 'u-3', tenantId: 't-1', details: 'Article "Résultats financiers Q2" modifié', timestamp: '2025-06-06T16:00:00Z' },
  { id: 'al-5', action: 'login', entityType: 'user', entityId: 'u-1', userId: 'u-1', tenantId: 't-1', details: 'Connexion de Marie Dupont', timestamp: '2025-06-06T07:30:00Z' },
  { id: 'al-6', action: 'permission_change', entityType: 'user', entityId: 'u-8', userId: 'u-4', tenantId: 't-2', details: 'Rôle de David Koffi changé en Lecteur', timestamp: '2025-06-05T14:00:00Z' },
  { id: 'al-7', action: 'delete', entityType: 'article', entityId: 'ar-old', userId: 'u-2', tenantId: 't-1', details: 'Article obsolète supprimé', timestamp: '2025-06-04T11:00:00Z' },
  { id: 'al-8', action: 'publish', entityType: 'newsletter', entityId: 'nl-1', userId: 'u-2', tenantId: 't-1', details: 'Newsletter "Flash Info Juin" envoyée', timestamp: '2025-06-01T09:05:00Z' },
];

// ─── Calendar Events ────────────────────────────────────────────────────
export const mockCalendarEvents: CalendarEvent[] = [
  { id: 'ce-1', title: 'Publication Flash Info', date: '2025-06-09', type: 'publication', color: '#3b82f6', contentId: 'nl-2', tenantId: 't-1' },
  { id: 'ce-2', title: 'Revue article Q2', date: '2025-06-10', type: 'review', color: '#f59e0b', contentId: 'ar-3', tenantId: 't-1' },
  { id: 'ce-3', title: 'Lancement TechFlow Pro', date: '2025-06-15', type: 'campaign', color: '#06b6d4', contentId: 'cp-2', tenantId: 't-3' },
  { id: 'ce-4', title: 'Deadline campagne rentrée', date: '2025-06-30', type: 'deadline', color: '#ef4444', contentId: 'cp-1', tenantId: 't-1' },
  { id: 'ce-5', title: 'Réunion éditoriale', date: '2025-06-12', type: 'meeting', color: '#8b5cf6', tenantId: 't-1' },
  { id: 'ce-6', title: 'Publication article RGPD', date: '2025-06-20', type: 'publication', color: '#3b82f6', contentId: 'ar-4', tenantId: 't-1' },
  { id: 'ce-7', title: 'Revue annuelle RDC', date: '2025-06-18', type: 'review', color: '#f59e0b', tenantId: 't-2' },
  { id: 'ce-8', title: 'Fin campagne expansion RDC', date: '2025-06-15', type: 'campaign', color: '#ef4444', contentId: 'cp-4', tenantId: 't-2' },
];

// ─── Legacy mock data (kept for reports-view compatibility) ─────────────
export const mockTasks = [
  { id: 't-1', title: 'Rédiger newsletter juin', status: 'done', priority: 'high', projectId: 'p-1', assigneeId: 'u-2', dueDate: '2025-06-01', tags: ['newsletter'] },
  { id: 't-2', title: 'Valider article Q2', status: 'in_progress', priority: 'urgent', projectId: 'p-1', assigneeId: 'u-1', dueDate: '2025-06-10', tags: ['validation'] },
  { id: 't-3', title: 'Mettre à jour guide contributeur', status: 'todo', priority: 'medium', projectId: 'p-2', assigneeId: 'u-2', dueDate: '2025-06-15', tags: ['guide'] },
  { id: 't-4', title: 'Préparer campagne rentrée', status: 'in_progress', priority: 'high', projectId: 'p-2', assigneeId: 'u-3', dueDate: '2025-06-20', tags: ['campagne'] },
  { id: 't-5', title: 'Réviser contenu RGPD', status: 'review', priority: 'high', projectId: 'p-3', assigneeId: 'u-7', dueDate: '2025-06-08', tags: ['rgpd'] },
  { id: 't-6', title: 'Publier annonce maintenance', status: 'done', priority: 'urgent', projectId: 'p-1', assigneeId: 'u-1', dueDate: '2025-06-06', tags: ['annonce'] },
  { id: 't-7', title: 'Créer visuel campagne', status: 'todo', priority: 'medium', projectId: 'p-2', assigneeId: 'u-7', dueDate: '2025-06-12', tags: ['visuel'] },
  { id: 't-8', title: 'Rédiger communiqué partenariat', status: 'draft', priority: 'low', projectId: 'p-3', assigneeId: 'u-3', dueDate: '2025-06-25', tags: ['communiqué'] },
  { id: 't-9', title: 'Archiver contenus Q1', status: 'done', priority: 'low', projectId: 'p-1', assigneeId: 'u-2', dueDate: '2025-05-30', tags: ['archive'] },
  { id: 't-10', title: 'Planifier envoi flash info', status: 'in_progress', priority: 'medium', projectId: 'p-2', assigneeId: 'u-3', dueDate: '2025-06-09', tags: ['planification'] },
  { id: 't-11', title: 'Mettre à jour template newsletter', status: 'todo', priority: 'medium', projectId: 'p-3', assigneeId: 'u-6', dueDate: '2025-06-18', tags: ['template'] },
  { id: 't-12', title: 'Relancer valideurs en retard', status: 'urgent', priority: 'high', projectId: 'p-1', assigneeId: 'u-1', dueDate: '2025-06-07', tags: ['relance'] },
];

export const mockProjects = [
  { id: 'p-1', name: 'Communication Interne', color: '#3b82f6', status: 'active', progress: 72, memberCount: 4 },
  { id: 'p-2', name: 'Campagne Rentrée 2025', color: '#f59e0b', status: 'active', progress: 45, memberCount: 3 },
  { id: 'p-3', name: 'Conformité RGPD', color: '#06b6d4', status: 'active', progress: 30, memberCount: 2 },
  { id: 'p-4', name: 'Lancement TechFlow Pro', color: '#ef4444', status: 'on_hold', progress: 60, memberCount: 2 },
];

// ─── Helper functions ───────────────────────────────────────────────────
export function getUserName(id: string): string {
  return mockUsers.find((u) => u.id === id)?.name || 'Inconnu';
}

export function getUserInitials(id: string): string {
  const user = mockUsers.find((u) => u.id === id);
  return user ? user.name.split(' ').map((n) => n[0]).join('') : '??';
}

export function getTenantName(id: string): string {
  return mockUsers.find((u) => u.id === id)?.tenantName || 'Inconnu';
}

export const contentStatusColors: Record<string, { bg: string; text: string; border: string }> = {
  draft: { bg: 'bg-slate-500/10', text: 'text-slate-600', border: 'border-slate-500/20' },
  review: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/20' },
  approved: { bg: 'bg-cyan-500/10', text: 'text-cyan-600', border: 'border-cyan-500/20' },
  scheduled: { bg: 'bg-violet-500/10', text: 'text-violet-600', border: 'border-violet-500/20' },
  published: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/20' },
  archived: { bg: 'bg-slate-500/10', text: 'text-slate-500', border: 'border-slate-500/20' },
};

export const contentStatusLabels: Record<string, Record<string, string>> = {
  fr: { draft: 'Brouillon', review: 'En révision', approved: 'Approuvé', scheduled: 'Planifié', published: 'Publié', archived: 'Archivé' },
  en: { draft: 'Draft', review: 'In Review', approved: 'Approved', scheduled: 'Scheduled', published: 'Published', archived: 'Archived' },
};

export const roleColors: Record<string, { bg: string; text: string; border: string }> = {
  super_admin: { bg: 'bg-rose-500/10', text: 'text-rose-600', border: 'border-rose-500/20' },
  tenant_admin: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/20' },
  editor: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/20' },
  contributor: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/20' },
  reader: { bg: 'bg-slate-500/10', text: 'text-slate-600', border: 'border-slate-500/20' },
};
