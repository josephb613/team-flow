import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const db = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

const DEFAULT_PASSWORD = hashPassword("password123");

async function seed() {
  console.log("🌱 Seeding database...");

  // Create users
  const users = await Promise.all([
    db.user.upsert({
      where: { email: "alex@acmecorp.com" },
      update: { password: DEFAULT_PASSWORD },
      create: {
        email: "alex@acmecorp.com",
        name: "Alex Thompson",
        password: DEFAULT_PASSWORD,
        role: "admin",
        status: "online",
      },
    }),
    db.user.upsert({
      where: { email: "sarah@acmecorp.com" },
      update: { password: DEFAULT_PASSWORD },
      create: {
        email: "sarah@acmecorp.com",
        name: "Sarah Chen",
        password: DEFAULT_PASSWORD,
        role: "member",
        status: "online",
      },
    }),
    db.user.upsert({
      where: { email: "marcus@acmecorp.com" },
      update: { password: DEFAULT_PASSWORD },
      create: {
        email: "marcus@acmecorp.com",
        name: "Marcus Rivera",
        password: DEFAULT_PASSWORD,
        role: "member",
        status: "away",
      },
    }),
    db.user.upsert({
      where: { email: "emily@acmecorp.com" },
      update: { password: DEFAULT_PASSWORD },
      create: {
        email: "emily@acmecorp.com",
        name: "Emily Watson",
        password: DEFAULT_PASSWORD,
        role: "member",
        status: "offline",
      },
    }),
    db.user.upsert({
      where: { email: "david@acmecorp.com" },
      update: { password: DEFAULT_PASSWORD },
      create: {
        email: "david@acmecorp.com",
        name: "David Kim",
        password: DEFAULT_PASSWORD,
        role: "guest",
        status: "online",
      },
    }),
    db.user.upsert({
      where: { email: "lisa@acmecorp.com" },
      update: { password: DEFAULT_PASSWORD },
      create: {
        email: "lisa@acmecorp.com",
        name: "Lisa Park",
        password: DEFAULT_PASSWORD,
        role: "member",
        status: "busy",
      },
    }),
    db.user.upsert({
      where: { email: "james@acmecorp.com" },
      update: { password: DEFAULT_PASSWORD },
      create: {
        email: "james@acmecorp.com",
        name: "James Wilson",
        password: DEFAULT_PASSWORD,
        role: "member",
        status: "online",
      },
    }),
    db.user.upsert({
      where: { email: "nina@acmecorp.com" },
      update: { password: DEFAULT_PASSWORD },
      create: {
        email: "nina@acmecorp.com",
        name: "Nina Patel",
        password: DEFAULT_PASSWORD,
        role: "admin",
        status: "away",
      },
    }),
  ]);
  console.log(`  ✅ ${users.length} users created`);

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
        userId_workspaceId: { userId: user.id, workspaceId: workspace.id },
      },
      update: {},
      create: {
        userId: user.id,
        workspaceId: workspace.id,
        role: user.role,
      },
    });
  }
  console.log(`  ✅ ${users.length} workspace members added`);

  // Create projects
  const projects = await Promise.all([
    db.project.create({
      data: {
        name: "Website Redesign",
        description:
          "Complete redesign of the company website with modern UI/UX",
        color: "#10b981",
        icon: "🌐",
        status: "active",
        workspaceId: workspace.id,
      },
    }),
    db.project.create({
      data: {
        name: "Mobile App V2",
        description: "Second version of our mobile application",
        color: "#f59e0b",
        icon: "📱",
        status: "active",
        workspaceId: workspace.id,
      },
    }),
    db.project.create({
      data: {
        name: "API Integration",
        description: "Third-party API integrations and microservices",
        color: "#ef4444",
        icon: "⚡",
        status: "active",
        workspaceId: workspace.id,
      },
    }),
    db.project.create({
      data: {
        name: "Marketing Campaign",
        description: "Q1 2025 marketing campaign planning and execution",
        color: "#8b5cf6",
        icon: "📢",
        status: "on_hold",
        workspaceId: workspace.id,
      },
    }),
    db.project.create({
      data: {
        name: "Data Analytics Dashboard",
        description: "Real-time analytics dashboard for business insights",
        color: "#06b6d4",
        icon: "📊",
        status: "active",
        workspaceId: workspace.id,
      },
    }),
    db.project.create({
      data: {
        name: "Security Audit",
        description: "Annual security audit and compliance review",
        color: "#ec4899",
        icon: "🔒",
        status: "completed",
        workspaceId: workspace.id,
      },
    }),
  ]);
  console.log(`  ✅ ${projects.length} projects created`);

  // Create some tasks
  await Promise.all([
    db.task.create({
      data: {
        title: "Design homepage hero section",
        description: "Create a visually striking hero section with animations",
        status: "in_progress",
        priority: "high",
        tags: "design,frontend",
        dueDate: new Date("2025-01-25"),
        projectId: projects[0].id,
        assigneeId: users[1].id,
        creatorId: users[0].id,
      },
    }),
    db.task.create({
      data: {
        title: "Set up authentication flow",
        description: "Implement OAuth2 with Google and GitHub providers",
        status: "todo",
        priority: "urgent",
        tags: "backend,security",
        dueDate: new Date("2025-01-22"),
        projectId: projects[0].id,
        assigneeId: users[0].id,
        creatorId: users[0].id,
      },
    }),
    db.task.create({
      data: {
        title: "Create onboarding screens",
        description: "Design and implement mobile onboarding flow",
        status: "review",
        priority: "medium",
        tags: "design,mobile",
        dueDate: new Date("2025-01-28"),
        projectId: projects[1].id,
        assigneeId: users[3].id,
        creatorId: users[1].id,
      },
    }),
    db.task.create({
      data: {
        title: "Implement payment API",
        description: "Stripe payment integration for subscriptions",
        status: "in_progress",
        priority: "high",
        tags: "backend,payments",
        dueDate: new Date("2025-01-30"),
        projectId: projects[1].id,
        assigneeId: users[2].id,
        creatorId: users[0].id,
      },
    }),
    db.task.create({
      data: {
        title: "Database migration script",
        description: "Migration scripts for new schema",
        status: "done",
        priority: "high",
        tags: "backend,database",
        dueDate: new Date("2025-01-20"),
        projectId: projects[2].id,
        assigneeId: users[0].id,
        creatorId: users[0].id,
      },
    }),
    db.task.create({
      data: {
        title: "Write API documentation",
        description: "Complete OpenAPI spec for all endpoints",
        status: "todo",
        priority: "medium",
        tags: "documentation,api",
        dueDate: new Date("2025-02-15"),
        projectId: projects[2].id,
        assigneeId: users[5].id,
        creatorId: users[0].id,
      },
    }),
  ]);
  console.log("  ✅ Tasks created");

  // Create channels
  const channels = await Promise.all([
    db.channel.create({
      data: { name: "general", type: "team", workspaceId: workspace.id },
    }),
    db.channel.create({
      data: {
        name: "website-redesign",
        type: "project",
        workspaceId: workspace.id,
      },
    }),
    db.channel.create({
      data: {
        name: "engineering",
        type: "team",
        workspaceId: workspace.id,
      },
    }),
    db.channel.create({
      data: {
        name: "design",
        type: "team",
        workspaceId: workspace.id,
      },
    }),
  ]);
  console.log(`  ✅ ${channels.length} channels created`);

  // Add channel members
  for (const channel of channels) {
    for (const user of users.slice(0, 6)) {
      await db.channelMember.upsert({
        where: {
          channelId_userId: { channelId: channel.id, userId: user.id },
        },
        update: {},
        create: { channelId: channel.id, userId: user.id },
      });
    }
  }
  console.log("  ✅ Channel members added");

  // Create some messages
  await Promise.all([
    db.message.create({
      data: {
        content: "Hey team! Just pushed the latest changes to staging.",
        channelId: channels[0].id,
        userId: users[0].id,
      },
    }),
    db.message.create({
      data: {
        content: "On it! I'll review the API changes this afternoon.",
        channelId: channels[0].id,
        userId: users[2].id,
      },
    }),
    db.message.create({
      data: {
        content: "The new dashboard looks amazing! 🎉",
        channelId: channels[0].id,
        userId: users[1].id,
      },
    }),
    db.message.create({
      data: {
        content: "Homepage mockup is ready for review.",
        channelId: channels[1].id,
        userId: users[1].id,
      },
    }),
  ]);
  console.log("  ✅ Messages created");

  // Create teams
  const teams = await Promise.all([
    db.team.create({
      data: {
        name: "Engineering",
        description: "Core engineering team",
        color: "#10b981",
        workspaceId: workspace.id,
      },
    }),
    db.team.create({
      data: {
        name: "Design",
        description: "UI/UX design and brand",
        color: "#f59e0b",
        workspaceId: workspace.id,
      },
    }),
  ]);
  console.log(`  ✅ ${teams.length} teams created`);

  console.log("\n🎉 Database seeded successfully!");
  console.log("   You can now log in with:");
  console.log("   Email: alex@acmecorp.com");
  console.log("   Password: password123");
}

seed()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
