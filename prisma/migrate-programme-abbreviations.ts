/**
 * One-off data migration: updates the "programme" field (and, for
 * postgraduate records, "degreeCategory") on existing membership
 * applications and members to the new abbreviated format — e.g.
 * "Bachelor of Education (B.Ed.) Special Education" -> "BEd Special
 * Education", "Master of Philosophy (M.Phil.)" -> "MPhil".
 *
 * Safe to run more than once: every row is only updated if its current
 * value actually matches something in the mapping tables below, so a row
 * already in the new format is simply left alone.
 *
 * Free-text alumni self-registration "programme" values are intentionally
 * NOT touched — that field was never constrained to a fixed list for
 * self-registered alumni, so there's nothing reliable to map from.
 *
 * Run once, after deploying this update, from the project root:
 *   npx tsx prisma/migrate-programme-abbreviations.ts
 */
import "dotenv/config";
import { db } from "../src/lib/db";

// Undergraduate: original full name -> new abbreviated form. Exact match.
const UG_FULL_TO_NEW: Record<string, string> = {
    "Bachelor of Arts (B.A.) Arabic Education": "BA Arabic Education",
    "Bachelor of Arts (B.A.) Art Education": "BA Art Education",
    "Bachelor of Arts (B.A.) Ewe Education": "BA Ewe Education",
    "Bachelor of Arts (B.A.) Fante, Nzema and Twi Education": "BA Fante, Nzema and Twi Education",
    "Bachelor of Arts (B.A.) French Education": "BA French Education",
    "Bachelor of Arts (B.A.) Ga and Dangme Education": "BA Ga and Dangme Education",
    "Bachelor of Arts (B.A.) Geography Education": "BA Geography Education",
    "Bachelor of Arts (B.A.) Graphic Design": "BA Graphic Design",
    "Bachelor of Arts (B.A.) History Education": "BA History Education",
    "Bachelor of Arts (B.A.) Music Education": "BA Music Education",
    "Bachelor of Arts (B.A.) Political Science Education": "BA Political Science Education",
    "Bachelor of Arts (B.A.) Religions and Moral Studies Education": "BA Religions and Moral Studies Education",
    "Bachelor of Arts (B.A.) Social Studies Education": "BA Social Studies Education",
    "Bachelor of Arts (B.A.) Theatre Arts": "BA Theatre Arts",
    "Bachelor of Business Administration (B.B.A.) Accounting": "BBA Accounting",
    "Bachelor of Business Administration (B.B.A.) Banking and Finance": "BBA Banking and Finance",
    "Bachelor of Business Administration (B.B.A.) Human Resource Management": "BBA Human Resource Management",
    "Bachelor of Business Administration (B.B.A.) Management": "BBA Management",
    "Bachelor of Business Administration (B.B.A.) Marketing and Entrepreneurship": "BBA Marketing and Entrepreneurship",
    "Bachelor of Business Administration (B.B.A.) Procurement and Supply Chain Management": "BBA Procurement and Supply Chain Management",
    "Bachelor of Education (B.Ed.) Basic Education (Early Grade / Primary / JHS Options)": "BEd Basic Education (Early Grade / Primary / JHS Options)",
    "Bachelor of Education (B.Ed.) Community-Based Rehabilitation and Disability Studies (CBRDS)": "BEd Community-Based Rehabilitation and Disability Studies (CBRDS)",
    "Bachelor of Education (B.Ed.) Counselling Psychology": "BEd Counselling Psychology",
    "Bachelor of Education (B.Ed.) Early Childhood Education": "BEd Early Childhood Education",
    "Bachelor of Education (B.Ed.) Special Education": "BEd Special Education",
    "Bachelor of Science (B.Sc.) Agriculture Education": "BSc Agriculture Education",
    "Bachelor of Science (B.Sc.) Biology Education": "BSc Biology Education",
    "Bachelor of Science (B.Sc.) Catering and Hospitality Education": "BSc Catering and Hospitality Education",
    "Bachelor of Science (B.Sc.) Chemistry Education": "BSc Chemistry Education",
    "Bachelor of Science (B.Sc.) Environmental Health and Sanitation Education": "BSc Environmental Health and Sanitation Education",
    "Bachelor of Science (B.Sc.) Fashion Design and Textiles Education": "BSc Fashion Design and Textiles Education",
    "Bachelor of Science (B.Sc.) Health Administration and Education": "BSc Health Administration and Education",
    "Bachelor of Science (B.Sc.) Information and Communication Technology Education": "BSc Information and Communication Technology Education",
    "Bachelor of Science (B.Sc.) Integrated Home Economics Education": "BSc Integrated Home Economics Education",
    "Bachelor of Science (B.Sc.) Integrated Science Education": "BSc Integrated Science Education",
    "Bachelor of Science (B.Sc.) Mathematics Education": "BSc Mathematics Education",
    "Bachelor of Science (B.Sc.) Physical Education": "BSc Physical Education",
    "Bachelor of Science (B.Sc.) Physics Education": "BSc Physics Education",
    "Bachelor of Science (B.Sc.) Sports Coaching": "BSc Sports Coaching",
    "Diploma in Accounting Studies": "Diploma Accounting Studies",
    "Diploma in Basic Education": "Diploma Basic Education",
    "Diploma in Early Childhood Education": "Diploma Early Childhood Education",
    "Diploma in Management Studies": "Diploma Management Studies",
  };

// Undergraduate: bare subject name (no degree prefix at all) -> new
// abbreviated form. This covers records submitted in the brief window
// between the previous "strip the whole prefix" round and this one.
// "Early Childhood Education" is genuinely ambiguous — it could have been
// BEd or Diploma, and that distinction was lost by the previous round's
// stripping — this defaults to the BEd version as the more common case.
const UG_BARE_TO_NEW_DEFAULT: Record<string, string> = {
    "Accounting": "BBA Accounting",
    "Accounting Studies": "Diploma Accounting Studies",
    "Agriculture Education": "BSc Agriculture Education",
    "Arabic Education": "BA Arabic Education",
    "Art Education": "BA Art Education",
    "Banking and Finance": "BBA Banking and Finance",
    "Basic Education": "Diploma Basic Education",
    "Basic Education (Early Grade / Primary / JHS Options)": "BEd Basic Education (Early Grade / Primary / JHS Options)",
    "Biology Education": "BSc Biology Education",
    "Catering and Hospitality Education": "BSc Catering and Hospitality Education",
    "Chemistry Education": "BSc Chemistry Education",
    "Community-Based Rehabilitation and Disability Studies (CBRDS)": "BEd Community-Based Rehabilitation and Disability Studies (CBRDS)",
    "Counselling Psychology": "BEd Counselling Psychology",
    "Early Childhood Education": "BEd Early Childhood Education",
    "Environmental Health and Sanitation Education": "BSc Environmental Health and Sanitation Education",
    "Ewe Education": "BA Ewe Education",
    "Fante, Nzema and Twi Education": "BA Fante, Nzema and Twi Education",
    "Fashion Design and Textiles Education": "BSc Fashion Design and Textiles Education",
    "French Education": "BA French Education",
    "Ga and Dangme Education": "BA Ga and Dangme Education",
    "Geography Education": "BA Geography Education",
    "Graphic Design": "BA Graphic Design",
    "Health Administration and Education": "BSc Health Administration and Education",
    "History Education": "BA History Education",
    "Human Resource Management": "BBA Human Resource Management",
    "Information and Communication Technology Education": "BSc Information and Communication Technology Education",
    "Integrated Home Economics Education": "BSc Integrated Home Economics Education",
    "Integrated Science Education": "BSc Integrated Science Education",
    "Management": "BBA Management",
    "Management Studies": "Diploma Management Studies",
    "Marketing and Entrepreneurship": "BBA Marketing and Entrepreneurship",
    "Mathematics Education": "BSc Mathematics Education",
    "Music Education": "BA Music Education",
    "Physical Education": "BSc Physical Education",
    "Physics Education": "BSc Physics Education",
    "Political Science Education": "BA Political Science Education",
    "Procurement and Supply Chain Management": "BBA Procurement and Supply Chain Management",
    "Religions and Moral Studies Education": "BA Religions and Moral Studies Education",
    "Social Studies Education": "BA Social Studies Education",
    "Special Education": "BEd Special Education",
    "Sports Coaching": "BSc Sports Coaching",
    "Theatre Arts": "BA Theatre Arts",
  };
const UG_AMBIGUOUS_BARE_NAMES = new Set(["Early Childhood Education"]);

// Postgraduate: original full name -> new abbreviated form. Exact match.
const PG_FULL_TO_NEW: Record<string, string> = {
    "Doctor of Education (Ed.D.) Social Studies Education": "EdD Social Studies Education",
    "Executive Master's in Human Rights, Conflict and Peace Studies": "Exec. Masters Human Rights, Conflict and Peace Studies",
    "Master of Arts (M.A.) Art Education": "MA Art Education",
    "Master of Arts (M.A.) Arts and Culture": "MA Arts and Culture",
    "Master of Arts (M.A.) Communication Instruction": "MA Communication Instruction",
    "Master of Arts (M.A.) Development Communication": "MA Development Communication",
    "Master of Arts (M.A.) English": "MA English",
    "Master of Arts (M.A.) French Translation": "MA French Translation",
    "Master of Arts (M.A.) Ghanaian Language Studies": "MA Ghanaian Language Studies",
    "Master of Arts (M.A.) History Education": "MA History Education",
    "Master of Arts (M.A.) Human Rights, Conflict and Peace Studies": "MA Human Rights, Conflict and Peace Studies",
    "Master of Arts (M.A.) Journalism and Media Studies": "MA Journalism and Media Studies",
    "Master of Arts (M.A.) Strategic Communication": "MA Strategic Communication",
    "Master of Arts (M.A.) Theatre Arts": "MA Theatre Arts",
    "Master of Arts (M.A.) Translation Studies": "MA Translation Studies",
    "Master of Business Administration (MBA) Accounting": "MBA Accounting",
    "Master of Business Administration (MBA) Finance": "MBA Finance",
    "Master of Business Administration (MBA) Human Resource Management": "MBA Human Resource Management",
    "Master of Business Administration (MBA) Management Information System": "MBA Management Information System",
    "Master of Business Administration (MBA) Marketing": "MBA Marketing",
    "Master of Business Administration (MBA) Procurement and Supply Chain Management": "MBA Procurement and Supply Chain Management",
    "Master of Education (M.Ed.) Basic Education": "MEd Basic Education",
    "Master of Education (M.Ed.) Biology Education": "MEd Biology Education",
    "Master of Education (M.Ed.) Clothing and Textiles": "MEd Clothing and Textiles",
    "Master of Education (M.Ed.) Computer Education and Technology": "MEd Computer Education and Technology",
    "Master of Education (M.Ed.) Counselling Psychology": "MEd Counselling Psychology",
    "Master of Education (M.Ed.) Early Childhood Education": "MEd Early Childhood Education",
    "Master of Education (M.Ed.) Educational Administration and Management": "MEd Educational Administration and Management",
    "Master of Education (M.Ed.) English": "MEd English",
    "Master of Education (M.Ed.) Family Life Management": "MEd Family Life Management",
    "Master of Education (M.Ed.) Food and Nutrition": "MEd Food and Nutrition",
    "Master of Education (M.Ed.) French Education": "MEd French Education",
    "Master of Education (M.Ed.) Geography Education": "MEd Geography Education",
    "Master of Education (M.Ed.) Guidance and Counselling": "MEd Guidance and Counselling",
    "Master of Education (M.Ed.) Institutional Mentorship and Supervision": "MEd Institutional Mentorship and Supervision",
    "Master of Education (M.Ed.) Mathematics Education": "MEd Mathematics Education",
    "Master of Education (M.Ed.) Physical Education and Sports Studies": "MEd Physical Education and Sports Studies",
    "Master of Education (M.Ed.) Political Science Education": "MEd Political Science Education",
    "Master of Education (M.Ed.) Science Education": "MEd Science Education",
    "Master of Education (M.Ed.) Social Studies": "MEd Social Studies",
    "Master of Education (M.Ed.) Special Education": "MEd Special Education",
    "Master of Education (M.Ed.) Supervision": "MEd Supervision",
    "Master of Education (M.Ed.) Teaching English as a Second Language (TESL)": "MEd Teaching English as a Second Language (TESL)",
    "Master of Fine Arts (MFA) Theatre Arts": "MFA Theatre Arts",
    "Master of Philosophy (M.Phil.) Accounting": "MPhil Accounting",
    "Master of Philosophy (M.Phil.) Applied Linguistics": "MPhil Applied Linguistics",
    "Master of Philosophy (M.Phil.) Art Education": "MPhil Art Education",
    "Master of Philosophy (M.Phil.) Arts and Culture": "MPhil Arts and Culture",
    "Master of Philosophy (M.Phil.) Assessment, Measurement and Evaluation": "MPhil Assessment, Measurement and Evaluation",
    "Master of Philosophy (M.Phil.) Basic Education": "MPhil Basic Education",
    "Master of Philosophy (M.Phil.) Biology Education": "MPhil Biology Education",
    "Master of Philosophy (M.Phil.) Business Administration (Human Resource Management option)": "MPhil Business Administration (Human Resource Management option)",
    "Master of Philosophy (M.Phil.) Chemistry Education": "MPhil Chemistry Education",
    "Master of Philosophy (M.Phil.) Clothing and Textiles": "MPhil Clothing and Textiles",
    "Master of Philosophy (M.Phil.) Communication Instruction": "MPhil Communication Instruction",
    "Master of Philosophy (M.Phil.) Counselling Psychology": "MPhil Counselling Psychology",
    "Master of Philosophy (M.Phil.) Curriculum and Pedagogic Studies": "MPhil Curriculum and Pedagogic Studies",
    "Master of Philosophy (M.Phil.) Development Finance": "MPhil Development Finance",
    "Master of Philosophy (M.Phil.) Early Childhood Education": "MPhil Early Childhood Education",
    "Master of Philosophy (M.Phil.) Economics": "MPhil Economics",
    "Master of Philosophy (M.Phil.) Educational Administration and Management": "MPhil Educational Administration and Management",
    "Master of Philosophy (M.Phil.) Entrepreneurship and Innovations Management": "MPhil Entrepreneurship and Innovations Management",
    "Master of Philosophy (M.Phil.) Environmental Science": "MPhil Environmental Science",
    "Master of Philosophy (M.Phil.) Family Life Management Education": "MPhil Family Life Management Education",
    "Master of Philosophy (M.Phil.) Finance": "MPhil Finance",
    "Master of Philosophy (M.Phil.) Food and Nutrition": "MPhil Food and Nutrition",
    "Master of Philosophy (M.Phil.) French": "MPhil French",
    "Master of Philosophy (M.Phil.) Geography with Education": "MPhil Geography with Education",
    "Master of Philosophy (M.Phil.) Ghanaian Language Studies": "MPhil Ghanaian Language Studies",
    "Master of Philosophy (M.Phil.) History Education": "MPhil History Education",
    "Master of Philosophy (M.Phil.) Human Rights, Conflict and Peace Studies": "MPhil Human Rights, Conflict and Peace Studies",
    "Master of Philosophy (M.Phil.) Information and Communication Technology Education": "MPhil Information and Communication Technology Education",
    "Master of Philosophy (M.Phil.) Instructional Design and Technology": "MPhil Instructional Design and Technology",
    "Master of Philosophy (M.Phil.) Integrated Science Education": "MPhil Integrated Science Education",
    "Master of Philosophy (M.Phil.) Mathematics Education": "MPhil Mathematics Education",
    "Master of Philosophy (M.Phil.) Music": "MPhil Music",
    "Master of Philosophy (M.Phil.) Physical Education and Sports Studies": "MPhil Physical Education and Sports Studies",
    "Master of Philosophy (M.Phil.) Physics Education": "MPhil Physics Education",
    "Master of Philosophy (M.Phil.) Political Science Education": "MPhil Political Science Education",
    "Master of Philosophy (M.Phil.) Procurement and Supply Chain Management": "MPhil Procurement and Supply Chain Management",
    "Master of Philosophy (M.Phil.) Science Education": "MPhil Science Education",
    "Master of Philosophy (M.Phil.) Social Studies Education": "MPhil Social Studies Education",
    "Master of Philosophy (M.Phil.) Special Education": "MPhil Special Education",
    "Master of Philosophy (M.Phil.) Strategic Communication": "MPhil Strategic Communication",
    "Master of Philosophy (M.Phil.) Teaching English as a Second Language": "MPhil Teaching English as a Second Language",
    "Master of Philosophy (M.Phil.) Textiles and Fashion Education": "MPhil Textiles and Fashion Education",
    "Master of Philosophy (M.Phil.) Theatre Arts": "MPhil Theatre Arts",
    "Master of Philosophy (M.Phil.) Visual Communication Studies": "MPhil Visual Communication Studies",
    "Master of Science (M.Sc.) Biology": "MSc Biology",
    "Master of Science (M.Sc.) Development Finance": "MSc Development Finance",
    "Master of Science (M.Sc.) Economics": "MSc Economics",
    "Master of Science (M.Sc.) Economics Education": "MSc Economics Education",
    "Master of Science (M.Sc.) Information Technology Education": "MSc Information Technology Education",
    "Ph.D. Applied Linguistics": "PhD Applied Linguistics",
    "Ph.D. Arts and Culture": "PhD Arts and Culture",
    "Ph.D. Basic Education": "PhD Basic Education",
    "Ph.D. Biology Education": "PhD Biology Education",
    "Ph.D. Chemistry Education": "PhD Chemistry Education",
    "Ph.D. Communication and Media Studies": "PhD Communication and Media Studies",
    "Ph.D. Counselling Psychology": "PhD Counselling Psychology",
    "Ph.D. Educational Leadership": "PhD Educational Leadership",
    "Ph.D. English": "PhD English",
    "Ph.D. French": "PhD French",
    "Ph.D. Geography Education": "PhD Geography Education",
    "Ph.D. Ghanaian Language Studies": "PhD Ghanaian Language Studies",
    "Ph.D. Mathematics Education": "PhD Mathematics Education",
    "Ph.D. Music": "PhD Music",
    "Ph.D. Science Education": "PhD Science Education",
    "Ph.D. Social Studies Education": "PhD Social Studies Education",
    "Ph.D. Special Education": "PhD Special Education",
    "Postgraduate Diploma in Education (PGDE)": "PGDE",
    "Postgraduate Diploma in Teaching and Learning in Higher Education (PGDTLHE)": "PGDTLHE",
  };

// Postgraduate: bare subject name -> new abbreviated form, looked up using
// the row's own stored degreeCategory (never shortened, so still
// reliable) to resolve the ambiguity a bare name alone can't.
const PG_BARE_BY_DEGREE: Record<string, Record<string, string>> = {
  "Doctor of Education (Ed.D.)": {
    "Social Studies Education": "EdD Social Studies Education",
  },
  "Executive Master's Degrees": {
    "Human Rights, Conflict and Peace Studies": "Exec. Masters Human Rights, Conflict and Peace Studies",
  },
  "Master of Arts (M.A.)": {
    "Art Education": "MA Art Education",
    "Arts and Culture": "MA Arts and Culture",
    "Communication Instruction": "MA Communication Instruction",
    "Development Communication": "MA Development Communication",
    "English": "MA English",
    "French Translation": "MA French Translation",
    "Ghanaian Language Studies": "MA Ghanaian Language Studies",
    "History Education": "MA History Education",
    "Human Rights, Conflict and Peace Studies": "MA Human Rights, Conflict and Peace Studies",
    "Journalism and Media Studies": "MA Journalism and Media Studies",
    "Strategic Communication": "MA Strategic Communication",
    "Theatre Arts": "MA Theatre Arts",
    "Translation Studies": "MA Translation Studies",
  },
  "Master of Business Administration (MBA)": {
    "Accounting": "MBA Accounting",
    "Finance": "MBA Finance",
    "Human Resource Management": "MBA Human Resource Management",
    "Management Information System": "MBA Management Information System",
    "Marketing": "MBA Marketing",
    "Procurement and Supply Chain Management": "MBA Procurement and Supply Chain Management",
  },
  "Master of Education (M.Ed.)": {
    "Basic Education": "MEd Basic Education",
    "Biology Education": "MEd Biology Education",
    "Clothing and Textiles": "MEd Clothing and Textiles",
    "Computer Education and Technology": "MEd Computer Education and Technology",
    "Counselling Psychology": "MEd Counselling Psychology",
    "Early Childhood Education": "MEd Early Childhood Education",
    "Educational Administration and Management": "MEd Educational Administration and Management",
    "English": "MEd English",
    "Family Life Management": "MEd Family Life Management",
    "Food and Nutrition": "MEd Food and Nutrition",
    "French Education": "MEd French Education",
    "Geography Education": "MEd Geography Education",
    "Guidance and Counselling": "MEd Guidance and Counselling",
    "Institutional Mentorship and Supervision": "MEd Institutional Mentorship and Supervision",
    "Mathematics Education": "MEd Mathematics Education",
    "Physical Education and Sports Studies": "MEd Physical Education and Sports Studies",
    "Political Science Education": "MEd Political Science Education",
    "Science Education": "MEd Science Education",
    "Social Studies": "MEd Social Studies",
    "Special Education": "MEd Special Education",
    "Supervision": "MEd Supervision",
    "Teaching English as a Second Language (TESL)": "MEd Teaching English as a Second Language (TESL)",
  },
  "Master of Fine Arts (MFA)": {
    "Theatre Arts": "MFA Theatre Arts",
  },
  "Master of Philosophy (M.Phil.)": {
    "Accounting": "MPhil Accounting",
    "Applied Linguistics": "MPhil Applied Linguistics",
    "Art Education": "MPhil Art Education",
    "Arts and Culture": "MPhil Arts and Culture",
    "Assessment, Measurement and Evaluation": "MPhil Assessment, Measurement and Evaluation",
    "Basic Education": "MPhil Basic Education",
    "Biology Education": "MPhil Biology Education",
    "Business Administration (Human Resource Management option)": "MPhil Business Administration (Human Resource Management option)",
    "Chemistry Education": "MPhil Chemistry Education",
    "Clothing and Textiles": "MPhil Clothing and Textiles",
    "Communication Instruction": "MPhil Communication Instruction",
    "Counselling Psychology": "MPhil Counselling Psychology",
    "Curriculum and Pedagogic Studies": "MPhil Curriculum and Pedagogic Studies",
    "Development Finance": "MPhil Development Finance",
    "Early Childhood Education": "MPhil Early Childhood Education",
    "Economics": "MPhil Economics",
    "Educational Administration and Management": "MPhil Educational Administration and Management",
    "Entrepreneurship and Innovations Management": "MPhil Entrepreneurship and Innovations Management",
    "Environmental Science": "MPhil Environmental Science",
    "Family Life Management Education": "MPhil Family Life Management Education",
    "Finance": "MPhil Finance",
    "Food and Nutrition": "MPhil Food and Nutrition",
    "French": "MPhil French",
    "Geography with Education": "MPhil Geography with Education",
    "Ghanaian Language Studies": "MPhil Ghanaian Language Studies",
    "History Education": "MPhil History Education",
    "Human Rights, Conflict and Peace Studies": "MPhil Human Rights, Conflict and Peace Studies",
    "Information and Communication Technology Education": "MPhil Information and Communication Technology Education",
    "Instructional Design and Technology": "MPhil Instructional Design and Technology",
    "Integrated Science Education": "MPhil Integrated Science Education",
    "Mathematics Education": "MPhil Mathematics Education",
    "Music": "MPhil Music",
    "Physical Education and Sports Studies": "MPhil Physical Education and Sports Studies",
    "Physics Education": "MPhil Physics Education",
    "Political Science Education": "MPhil Political Science Education",
    "Procurement and Supply Chain Management": "MPhil Procurement and Supply Chain Management",
    "Science Education": "MPhil Science Education",
    "Social Studies Education": "MPhil Social Studies Education",
    "Special Education": "MPhil Special Education",
    "Strategic Communication": "MPhil Strategic Communication",
    "Teaching English as a Second Language": "MPhil Teaching English as a Second Language",
    "Textiles and Fashion Education": "MPhil Textiles and Fashion Education",
    "Theatre Arts": "MPhil Theatre Arts",
    "Visual Communication Studies": "MPhil Visual Communication Studies",
  },
  "Master of Science (M.Sc.)": {
    "Biology": "MSc Biology",
    "Development Finance": "MSc Development Finance",
    "Economics": "MSc Economics",
    "Economics Education": "MSc Economics Education",
    "Information Technology Education": "MSc Information Technology Education",
  },
  "Doctor of Philosophy (Ph.D.)": {
    "Applied Linguistics": "PhD Applied Linguistics",
    "Arts and Culture": "PhD Arts and Culture",
    "Basic Education": "PhD Basic Education",
    "Biology Education": "PhD Biology Education",
    "Chemistry Education": "PhD Chemistry Education",
    "Communication and Media Studies": "PhD Communication and Media Studies",
    "Counselling Psychology": "PhD Counselling Psychology",
    "Educational Leadership": "PhD Educational Leadership",
    "English": "PhD English",
    "French": "PhD French",
    "Geography Education": "PhD Geography Education",
    "Ghanaian Language Studies": "PhD Ghanaian Language Studies",
    "Mathematics Education": "PhD Mathematics Education",
    "Music": "PhD Music",
    "Science Education": "PhD Science Education",
    "Social Studies Education": "PhD Social Studies Education",
    "Special Education": "PhD Special Education",
  },
  "Postgraduate Diploma in Education (PGDE)": {
    "Postgraduate Diploma in Education (PGDE)": "PGDE",
  },
  "Postgraduate Diploma in Teaching and Learning in Higher Education (PGDTLHE)": {
    "Postgraduate Diploma in Teaching and Learning in Higher Education (PGDTLHE)": "PGDTLHE",
  },
};

// The "Postgraduate Degree Category" field itself, full name -> new
// abbreviated form.
const DEGREE_CATEGORY_FULL_TO_NEW: Record<string, string> = {
    "Doctor of Education (Ed.D.)": "EdD",
    "Doctor of Philosophy (Ph.D.)": "PhD",
    "Executive Master's Degrees": "Exec. Masters",
    "Master of Arts (M.A.)": "MA",
    "Master of Business Administration (MBA)": "MBA",
    "Master of Education (M.Ed.)": "MEd",
    "Master of Fine Arts (MFA)": "MFA",
    "Master of Philosophy (M.Phil.)": "MPhil",
    "Master of Science (M.Sc.)": "MSc",
    "Postgraduate Diploma in Education (PGDE)": "PGDE",
    "Postgraduate Diploma in Teaching and Learning in Higher Education (PGDTLHE)": "PGDTLHE",
  };

interface Row {
  id: string;
  programme: string;
  degreeCategory: string | null;
  applicationTrack: string | null;
}

function resolveNewProgramme(row: Row, reviewList: string[]): string | null {
  if (row.applicationTrack === "POSTGRADUATE") {
    if (PG_FULL_TO_NEW[row.programme]) return PG_FULL_TO_NEW[row.programme];
    const byDegree = row.degreeCategory ? PG_BARE_BY_DEGREE[row.degreeCategory] : undefined;
    if (byDegree?.[row.programme]) return byDegree[row.programme];
    return null;
  }
  // Undergraduate (or track not recorded — treat as undergraduate, since
  // that's the only track that existed before the postgraduate form shipped).
  if (UG_FULL_TO_NEW[row.programme]) return UG_FULL_TO_NEW[row.programme];
  if (UG_BARE_TO_NEW_DEFAULT[row.programme]) {
    if (UG_AMBIGUOUS_BARE_NAMES.has(row.programme)) reviewList.push(row.id);
    return UG_BARE_TO_NEW_DEFAULT[row.programme];
  }
  return null;
}

async function migrateProgramme(
  label: string,
  rows: Row[],
  updateOne: (id: string, programme: string) => Promise<unknown>,
) {
  const reviewList: string[] = [];
  let updated = 0;
  for (const row of rows) {
    const next = resolveNewProgramme(row, reviewList);
    if (next && next !== row.programme) {
      await updateOne(row.id, next);
      updated++;
    }
  }
  console.log(`[${label}] programme: ${updated} of ${rows.length} rows updated.`);
  if (reviewList.length > 0) {
    console.log(
      `[${label}] ${reviewList.length} row(s) had an ambiguous bare programme name and were defaulted to the Bachelor's version — worth a manual check:`,
      reviewList,
    );
  }
}

async function migrateDegreeCategory(
  label: string,
  rows: { id: string; degreeCategory: string | null }[],
  updateOne: (id: string, degreeCategory: string) => Promise<unknown>,
) {
  let updated = 0;
  for (const row of rows) {
    if (!row.degreeCategory) continue;
    const next = DEGREE_CATEGORY_FULL_TO_NEW[row.degreeCategory];
    if (next && next !== row.degreeCategory) {
      await updateOne(row.id, next);
      updated++;
    }
  }
  console.log(`[${label}] degreeCategory: ${updated} of ${rows.length} rows updated.`);
}

async function main() {
  const applications = await db.membershipApplication.findMany({
    select: { id: true, programme: true, degreeCategory: true, applicationTrack: true },
  });
  await migrateProgramme("membership_applications", applications, (id, programme) =>
    db.membershipApplication.update({ where: { id }, data: { programme } }),
  );
  await migrateDegreeCategory("membership_applications", applications, (id, degreeCategory) =>
    db.membershipApplication.update({ where: { id }, data: { degreeCategory } }),
  );

  const members = await db.member.findMany({
    select: { id: true, programme: true, degreeCategory: true, applicationTrack: true },
  });
  await migrateProgramme("members", members, (id, programme) =>
    db.member.update({ where: { id }, data: { programme } }),
  );
  await migrateDegreeCategory("members", members, (id, degreeCategory) =>
    db.member.update({ where: { id }, data: { degreeCategory } }),
  );

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
