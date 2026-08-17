import "dotenv/config";
import { PrismaClient, AdminRole, ContentStatus, ApplicationStatus, Gender } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function hash(password: string) {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log("Seeding database...\n");

  // ---------------------------------------------------------------------
  // Admin users (obviously-fake sample credentials — change immediately)
  // ---------------------------------------------------------------------
  const superAdmin = await db.adminUser.upsert({
    where: { email: "superadmin@example.edu.gh" },
    update: {},
    create: {
      name: "Ama Sample-Admin",
      email: "superadmin@example.edu.gh",
      passwordHash: await hash("ChangeMe123!"),
      role: AdminRole.SUPER_ADMIN,
    },
  });

  await db.adminUser.upsert({
    where: { email: "membership@example.edu.gh" },
    update: {},
    create: {
      name: "Kwesi Membership-Officer",
      email: "membership@example.edu.gh",
      passwordHash: await hash("ChangeMe123!"),
      role: AdminRole.MEMBERSHIP_OFFICER,
    },
  });

  console.log("✓ Admin users created (superadmin@example.edu.gh / membership@example.edu.gh, password: ChangeMe123!)");

  // ---------------------------------------------------------------------
  // Site settings
  // ---------------------------------------------------------------------
  await db.siteSetting.upsert({
    where: { key: "general" },
    update: {},
    create: {
      key: "general",
      value: {
        siteTitle: "Acme University Students' Association",
        footerDescription:
          "The official membership and information portal of the Acme University Students' Association. Sample content — replace with your institution's details.",
        logoUrl: null,
        faviconUrl: null,
        copyrightText: `© ${new Date().getFullYear()} Acme University Students' Association. All rights reserved.`,
        generalEmail: "info@example.edu.gh",
        membershipEmail: "membership@example.edu.gh",
        adminEmail: "admin@example.edu.gh",
        phonePrimary: "+233 20 000 0000",
        phoneSecondary: "",
        physicalAddress: "Acme University Campus, Sample Road, Accra, Ghana",
        postalAddress: "P.O. Box AC 000, Accra, Ghana",
        officeHours: "Mon–Fri, 8:00am – 5:00pm",
        mapEmbedUrl: "",
      },
    },
  });
  console.log("✓ Site settings created");

  // ---------------------------------------------------------------------
  // Social links (sample placeholders — point these at real accounts)
  // ---------------------------------------------------------------------
  const socialLinks: { platform: "FACEBOOK" | "INSTAGRAM" | "TWITTER" | "YOUTUBE"; displayName: string; url: string; order: number }[] = [
    { platform: "FACEBOOK", displayName: "Facebook", url: "https://facebook.com/example", order: 0 },
    { platform: "INSTAGRAM", displayName: "Instagram", url: "https://instagram.com/example", order: 1 },
    { platform: "TWITTER", displayName: "X (Twitter)", url: "https://x.com/example", order: 2 },
    { platform: "YOUTUBE", displayName: "YouTube", url: "https://youtube.com/@example", order: 3 },
  ];
  for (const link of socialLinks) {
    const existing = await db.socialLink.findFirst({ where: { platform: link.platform } });
    if (!existing) await db.socialLink.create({ data: { ...link, isActive: true } });
  }
  console.log("✓ Social links created");

  // ---------------------------------------------------------------------
  // Hero slides
  // ---------------------------------------------------------------------
  const heroCount = await db.heroSlide.count();
  if (heroCount === 0) {
    await db.heroSlide.create({
      data: {
        title: "Welcome to the Acme University Students' Association",
        subtitle:
          "One membership portal for news, events, the resource library, and everything happening across our student community.",
        ctaText: "Become a Member",
        ctaUrl: "/membership/enroll",
        order: 0,
        isActive: true,
      },
    });
    await db.heroSlide.create({
      data: {
        title: "Stay Connected, Stay Informed",
        subtitle: "Catch up on the latest announcements and upcoming events from across the association.",
        ctaText: "Read the Latest News",
        ctaUrl: "/news",
        order: 1,
        isActive: true,
      },
    });
  }
  console.log("✓ Hero slides created");

  // ---------------------------------------------------------------------
  // About / Donate singleton content
  // ---------------------------------------------------------------------
  await db.aboutContent.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      mission:
        "To represent, support, and connect every registered student of Acme University — advocating for student welfare and building a strong, inclusive campus community.",
      vision: "A united, empowered student body that shapes a better university experience for every generation.",
      coreValues: "Integrity · Service · Unity · Excellence · Accountability",
      leadershipMessage:
        "Sample leadership message — replace with a note from your association's current executives.",
    },
  });

  await db.donateContent.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      title: "Donate to the Association",
      description: "Your contribution helps fund student welfare programmes, events, and emergency support.",
      instructions: "Sample donation instructions — replace bank and mobile money details with real information before going live.",
      bankDetails: "Bank: Sample Bank Ghana\nAccount Name: Acme University Students' Association\nAccount Number: 0000000000",
      mobileMoneyDetails: "Network: Sample MoMo\nNumber: 024 000 0000\nName: Acme University SA",
      contactInfo: "donations@example.edu.gh",
    },
  });
  console.log("✓ About & Donate content created");

  // ---------------------------------------------------------------------
  // News categories + sample articles
  // ---------------------------------------------------------------------
  const announcementsCategory = await db.newsCategory.upsert({
    where: { slug: "announcements" },
    update: {},
    create: { name: "Announcements", slug: "announcements" },
  });
  const campusLifeCategory = await db.newsCategory.upsert({
    where: { slug: "campus-life" },
    update: {},
    create: { name: "Campus Life", slug: "campus-life" },
  });

  const newsCount = await db.news.count();
  if (newsCount === 0) {
    await db.news.create({
      data: {
        title: "Welcome to the New Membership Portal",
        slug: "welcome-to-the-new-membership-portal",
        excerpt:
          "We're excited to launch our new membership and information portal — here's what you can do with it.",
        body: "<p>This is <strong>sample content</strong>. Replace it with a real announcement from the admin dashboard.</p><p>The new portal brings together news, events, the resource library, membership applications, and elections information in one place.</p>",
        status: ContentStatus.PUBLISHED,
        featured: true,
        publishedAt: new Date(),
        categoryId: announcementsCategory.id,
        authorId: superAdmin.id,
        tags: ["portal", "launch"],
      },
    });
    await db.news.create({
      data: {
        title: "Sample Article: Orientation Week Highlights",
        slug: "sample-article-orientation-week-highlights",
        excerpt: "A look back at this year's orientation week activities. (Sample content.)",
        body: "<p>This is placeholder content for demonstration. Replace with real coverage of your association's activities.</p>",
        status: ContentStatus.PUBLISHED,
        featured: false,
        publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        categoryId: campusLifeCategory.id,
        authorId: superAdmin.id,
        tags: ["orientation"],
      },
    });
  }
  console.log("✓ Sample news created");

  // ---------------------------------------------------------------------
  // Event categories + sample events
  // ---------------------------------------------------------------------
  const generalEventCategory = await db.eventCategory.upsert({
    where: { slug: "general" },
    update: {},
    create: { name: "General", slug: "general" },
  });

  const eventCount = await db.event.count();
  if (eventCount === 0) {
    const in14Days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    await db.event.create({
      data: {
        title: "Sample Event: General Members' Meeting",
        slug: "sample-event-general-members-meeting",
        description: "This is a sample event for demonstration purposes. Replace with a real upcoming event.",
        shortDescription: "Quarterly meeting for all registered members.",
        startDate: in14Days,
        endDate: in14Days,
        startTime: "17:00",
        endTime: "19:00",
        venue: "Main Auditorium (sample venue)",
        organizer: "Acme University Students' Association",
        status: ContentStatus.PUBLISHED,
        featured: true,
        categoryId: generalEventCategory.id,
        createdById: superAdmin.id,
      },
    });
    const past30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await db.event.create({
      data: {
        title: "Sample Past Event: Welcome Social",
        slug: "sample-past-event-welcome-social",
        description: "This is a sample past event, shown to demonstrate the past-events view.",
        startDate: past30Days,
        endDate: past30Days,
        venue: "Student Center (sample venue)",
        status: ContentStatus.PUBLISHED,
        categoryId: generalEventCategory.id,
        createdById: superAdmin.id,
      },
    });
  }
  console.log("✓ Sample events created");

  // ---------------------------------------------------------------------
  // Library categories (no sample files — real documents require an R2
  // upload, which this seed script intentionally does not fabricate)
  // ---------------------------------------------------------------------
  await db.documentCategory.upsert({
    where: { slug: "forms" },
    update: {},
    create: { name: "Forms", slug: "forms" },
  });
  await db.documentCategory.upsert({
    where: { slug: "constitution" },
    update: {},
    create: { name: "Constitution & Policies", slug: "constitution" },
  });
  await db.documentCategory.upsert({
    where: { slug: "reports" },
    update: {},
    create: { name: "Reports", slug: "reports" },
  });
  console.log("✓ Library categories created (upload real documents via /admin/library)");

  // ---------------------------------------------------------------------
  // A sample PENDING application, so the review workflow has something to
  // demonstrate immediately after seeding.
  // ---------------------------------------------------------------------
  const existingSampleApplication = await db.membershipApplication.findUnique({
    where: { indexNumber: "SAMPLE/0001/24" },
  });
  if (!existingSampleApplication) {
    await db.membershipApplication.create({
      data: {
        firstName: "Kojo",
        lastName: "Sample-Applicant",
        dateOfBirth: new Date("2001-05-14"),
        gender: Gender.MALE,
        phone: "+233 24 000 0000",
        email: "kojo.sample@example.com",
        indexNumber: "SAMPLE/0001/24",
        programme: "B.Ed. Sample Programme",
        department: "Sample Department",
        facultySchool: "Sample Faculty",
        level: "200",
        campus: "Main Campus",
        yearOfAdmission: new Date().getFullYear() - 1,
        residentialAddress: "Sample Address, Accra",
        region: "Greater Accra",
        emergencyContactName: "Ama Sample-Contact",
        emergencyContactPhone: "+233 24 111 1111",
        membershipType: "Regular",
        agreedToTerms: true,
        status: ApplicationStatus.PENDING,
      },
    });
    console.log("✓ Sample pending application created (SAMPLE/0001/24) — try the review workflow in /admin/membership-applications");
  }

  console.log("\nSeed complete.");
  console.log("──────────────────────────────────────────────");
  console.log("Admin login:  /admin/login");
  console.log("  superadmin@example.edu.gh / ChangeMe123!");
  console.log("  membership@example.edu.gh / ChangeMe123!");
  console.log("→ Change these credentials immediately in a real deployment.");
  console.log("──────────────────────────────────────────────");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
