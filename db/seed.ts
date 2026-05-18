import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const db = new PrismaClient();

async function seed() {
  console.log("🌱 Seeding database...");

  // Create users (sequential to respect connection_limit=1)
  const userDefs = [
    { email: "alex@acmecorp.com", name: "Alex Thompson", role: "admin", status: "online" },
    { email: "sarah@acmecorp.com", name: "Sarah Chen", role: "member", status: "online" },
    { email: "marcus@acmecorp.com", name: "Marcus Rivera", role: "member", status: "away" },
    { email: "emily@acmecorp.com", name: "Emily Watson", role: "member", status: "offline" },
    { email: "david@acmecorp.com", name: "David Kim", role: "guest", status: "online" },
    { email: "lisa@acmecorp.com", name: "Lisa Park", role: "member", status: "busy" },
    { email: "james@acmecorp.com", name: "James Wilson", role: "member", status: "online" },
    { email: "nina@acmecorp.com", name: "Nina Patel", role: "admin", status: "away" },
  ];
  const users = [];
  for (const u of userDefs) {
    users.push(
      await db.userProfile.upsert({
        where: { email: u.email },
        update: {},
        create: { neonAuthUserId: crypto.randomUUID(), email: u.email, name: u.name, role: u.role, status: u.status },
      }),
    );
  }
  console.log(`  ✅ ${users.length} utilisateurs créés`);

  // Create workspace
  const workspace = await db.workspace.upsert({
    where: { slug: "acme-corp" },
    update: {},
    create: {
      name: "Acme Corp",
      slug: "acme-corp",
      color: "#10b981",
      icon: "🏢",
    },
  });
  console.log(`  ✅ Workspace: ${workspace.name}`);

  // Add users to workspace
  for (const user of users) {
    await db.workspaceMember.upsert({
      where: {
        userId_workspaceId: { userId: user.neonAuthUserId, workspaceId: workspace.id },
      },
      update: {},
      create: {
        userId: user.neonAuthUserId,
        workspaceId: workspace.id,
        role: user.role,
      },
    });
  }
  console.log(`  ✅ ${users.length} membres ajoutés au workspace`);

  // Create projects (sequential)
  const projectDefs = [
    { name: "Website Redesign", description: "Complete redesign of the company website", color: "#10b981", icon: "🌐", status: "active", dueDate: new Date("2025-03-15") },
    { name: "Mobile App V2", description: "Second version of our mobile application", color: "#f59e0b", icon: "📱", status: "active", dueDate: new Date("2025-04-30") },
    { name: "API Integration", description: "Third-party API integrations", color: "#ef4444", icon: "⚡", status: "active", dueDate: new Date("2025-02-28") },
    { name: "Marketing Campaign", description: "Q1 2025 marketing campaign", color: "#8b5cf6", icon: "📢", status: "on_hold", dueDate: new Date("2025-05-01") },
  ];
  const projects = [];
  for (const p of projectDefs) {
    projects.push(await db.project.create({ data: { ...p, workspaceId: workspace.id } }));
  }
  console.log(`  ✅ ${projects.length} projets créés`);

  // Create tasks (sequential)
  const taskDefs = [
    { title: "Design homepage hero section", description: "Create a visually striking hero section", status: "in_progress", priority: "high", tags: "design,frontend", dueDate: new Date("2025-01-25"), projectIdx: 0, assigneeIdx: 1, creatorIdx: 0 },
    { title: "Set up authentication flow", description: "Implement OAuth2 with providers", status: "todo", priority: "urgent", tags: "backend,security", dueDate: new Date("2025-01-22"), projectIdx: 0, assigneeIdx: 0, creatorIdx: 0 },
    { title: "Create onboarding screens", description: "Design and implement mobile onboarding", status: "review", priority: "medium", tags: "design,mobile", dueDate: new Date("2025-01-28"), projectIdx: 1, assigneeIdx: 3, creatorIdx: 1 },
    { title: "Implement payment API", description: "Stripe payment integration", status: "in_progress", priority: "high", tags: "backend,payments", dueDate: new Date("2025-01-30"), projectIdx: 1, assigneeIdx: 2, creatorIdx: 0 },
    { title: "Database migration script", description: "Migration scripts for new schema", status: "done", priority: "high", tags: "backend,database", dueDate: new Date("2025-01-20"), projectIdx: 2, assigneeIdx: 0, creatorIdx: 0 },
  ];
  for (const t of taskDefs) {
    await db.task.create({
      data: {
        title: t.title, description: t.description, status: t.status, priority: t.priority,
        tags: t.tags, dueDate: t.dueDate,
        projectId: projects[t.projectIdx].id,
        assigneeId: users[t.assigneeIdx].neonAuthUserId,
        creatorId: users[t.creatorIdx].neonAuthUserId,
      },
    });
  }
  console.log("  ✅ 5 tâches créées");

  // Create channels (sequential)
  const channelDefs = [
    { name: "general", type: "team" as const },
    { name: "website-redesign", type: "project" as const },
    { name: "engineering", type: "team" as const },
  ];
  const channels = [];
  for (const c of channelDefs) {
    channels.push(await db.channel.create({ data: { name: c.name, type: c.type, workspaceId: workspace.id } }));
  }
  console.log(`  ✅ ${channels.length} channels créés`);

  // Add channel members
  for (const channel of channels) {
    for (const user of users.slice(0, 5)) {
      await db.channelMember.create({
        data: { channelId: channel.id, userId: user.neonAuthUserId },
      });
    }
  }
  console.log("  ✅ Membres de channels ajoutés");

  // Create messages (sequential)
  const messageDefs = [
    { content: "Hey team! Just pushed the latest changes to staging.", channelIdx: 0, userIdx: 0 },
    { content: "On it! I'll review the API changes this afternoon.", channelIdx: 0, userIdx: 2 },
    { content: "The new dashboard looks amazing! 🎉", channelIdx: 0, userIdx: 1 },
    { content: "Homepage mockup is ready for review.", channelIdx: 1, userIdx: 1 },
  ];
  for (const m of messageDefs) {
    await db.message.create({ data: { content: m.content, channelId: channels[m.channelIdx].id, userId: users[m.userIdx].neonAuthUserId } });
  }
  console.log("  ✅ 4 messages créés");

  // Create teams (sequential)
  await db.team.create({ data: { name: "Engineering", description: "Core engineering team", color: "#10b981", workspaceId: workspace.id } });
  await db.team.create({ data: { name: "Design", description: "UI/UX design and brand", color: "#f59e0b", workspaceId: workspace.id } });
  console.log("  ✅ 2 équipes créées");

  console.log("🌱 Seed terminé avec succès !");
  console.log("   Login: alex@acmecorp.com / password123");
}

seed()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
