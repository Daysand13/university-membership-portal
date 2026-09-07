import { z } from "zod";
import { MembershipType } from "@/generated/prisma/enums";
import { isPasswordStrongEnough, PASSWORD_REQUIREMENTS_MESSAGE } from "@/lib/auth/password";

const phoneRegex = /^[0-9+()\-\s]{7,20}$/;

export const APPLICATION_TRACKS = ["UNDERGRADUATE", "POSTGRADUATE"] as const;
export type ApplicationTrack = (typeof APPLICATION_TRACKS)[number];

export const DISABILITY_CATEGORIES = [
  "Visual Impairment",
  "Deaf",
  "Deafblindness",
  "Physical Disability",
  "Intellectual Disability",
  "Specific Learning Disability",
  "Autism Spectrum Disorder",
  "Speech and Language Disorder",
  "Emotional and Behavioural Disorder",
  "Multiple Disabilities",
  "Cerebral Palsy",
  "Epilepsy",
  "Attention Deficit Hyperactivity Disorder",
  "Other",
] as const;

export const SUPPORT_NEEDS = [
  "Screen Reader / Assistive Technology Support",
  "Sign Language Interpretation",
  "Accessible Hostel Accommodation",
  "Campus Navigation / Mobility Assistance",
  "Extra Time / Exam Accommodations",
] as const;

export const CAMPUSES = ["Winneba Main Campus", "Ejumako Campus"] as const;

export const GHANA_REGIONS = [
  "Ahafo",
  "Ashanti",
  "Bono",
  "Bono East",
  "Central",
  "Eastern",
  "Greater Accra",
  "North East",
  "Northern",
  "Oti",
  "Savannah",
  "Upper East",
  "Upper West",
  "Volta",
  "Western",
  "Western North",
] as const;

export const HALLS_OF_AFFILIATION = [
  "Ghartey Hall",
  "GUSSS Hall",
  "Kwegyir Aggrey Hall",
  "Simpa Hall",
  "University Hall",
  "Other Hall",
] as const;

// ---------------------------------------------------------------------------
// Undergraduate
// ---------------------------------------------------------------------------

export const ACADEMIC_DEPARTMENTS = [
  "Accounting",
  "African and Liberal Studies",
  "Agricultural Science Education",
  "Akan-Nzema Education",
  "Applied Finance and Policy Management",
  "Applied Linguistics",
  "Art Education",
  "Basic Education",
  "Biology Education",
  "Chemistry Education",
  "Communication Instruction",
  "Early Childhood Education",
  "Economics Education",
  "Educational Foundations",
  "English Education",
  "Ewe Education",
  "French Education",
  "Ga-Dangme Education",
  "Geography Education",
  "Graphic Design",
  "Gur-Gonja Education",
  "Health, Physical Education, Recreation and Sports (HPERS)",
  "History Education",
  "Information and Communication Technology (ICT)",
  "Integrated Home Economics Education",
  "Integrated Science Education",
  "Journalism and Media Studies",
  "Management Sciences",
  "Marketing and Entrepreneurship",
  "Mathematics Education",
  "Music Education",
  "Physics Education",
  "Political Science Education",
  "Psychology and Education",
  "Social Studies Education",
  "Special Education",
  "Theatre Arts",
] as const;

export const PROGRAMS_OF_STUDY = [
  "BA Arabic Education",
  "BA Art Education",
  "BA Ewe Education",
  "BA Fante, Nzema and Twi Education",
  "BA French Education",
  "BA Ga and Dangme Education",
  "BA Geography Education",
  "BA Graphic Design",
  "BA History Education",
  "BA Music Education",
  "BA Political Science Education",
  "BA Religions and Moral Studies Education",
  "BA Social Studies Education",
  "BA Theatre Arts",
  "BBA Accounting",
  "BBA Banking and Finance",
  "BBA Human Resource Management",
  "BBA Management",
  "BBA Marketing and Entrepreneurship",
  "BBA Procurement and Supply Chain Management",
  "BEd Basic Education (Early Grade / Primary / JHS Options)",
  "BEd Community-Based Rehabilitation and Disability Studies (CBRDS)",
  "BEd Counselling Psychology",
  "BEd Early Childhood Education",
  "BEd Special Education",
  "BSc Agriculture Education",
  "BSc Biology Education",
  "BSc Catering and Hospitality Education",
  "BSc Chemistry Education",
  "BSc Environmental Health and Sanitation Education",
  "BSc Fashion Design and Textiles Education",
  "BSc Health Administration and Education",
  "BSc Information and Communication Technology Education",
  "BSc Integrated Home Economics Education",
  "BSc Integrated Science Education",
  "BSc Mathematics Education",
  "BSc Physical Education",
  "BSc Physics Education",
  "BSc Sports Coaching",
  "Diploma Accounting Studies",
  "Diploma Basic Education",
  "Diploma Early Childhood Education",
  "Diploma Management Studies",
] as const;

export const LEVELS = ["Level 100", "Level 200", "Level 300", "Level 400"] as const;

// ---------------------------------------------------------------------------
// Postgraduate
// ---------------------------------------------------------------------------

export const POSTGRAD_DEGREE_CATEGORIES = [
  "EdD",
  "PhD",
  "Exec. Masters",
  "MA",
  "MBA",
  "MEd",
  "MFA",
  "MPhil",
  "MSc",
  "PGDE",
  "PGDTLHE",
] as const;

export const POSTGRAD_DEPARTMENTS = [
  "Accounting",
  "African and Liberal Studies",
  "Akan-Nzema Education",
  "Applied Finance and Policy Management",
  "Applied Linguistics",
  "Art Education",
  "Basic Education",
  "Biology Education",
  "Chemistry Education",
  "Clothing and Textiles Education",
  "Communication Instruction",
  "Counselling Psychology",
  "Development Communication",
  "Early Childhood Education",
  "Economics Education",
  "Educational Foundations",
  "Educational Management and Administration Education",
  "English Education",
  "Environmental Health and Sanitation Education",
  "Environmental Science Education",
  "Ewe Education",
  "Family Life Management Education",
  "Food and Nutrition Education",
  "French Education",
  "Ga-Dangme Education",
  "Geography Education",
  "Graphic Design",
  "Gur-Gonja Education",
  "Health Administration Education",
  "Health, Physical Education, Recreation and Sports",
  "History Education",
  "Information and Communication Technology",
  "Integrated Home Economics Education",
  "Integrated Science Education",
  "Journalism and Media Studies",
  "Management Sciences",
  "Marketing and Entrepreneurship",
  "Mathematics Education",
  "Music Education",
  "Physics Education",
  "Political Science Education",
  "Procurement and Supply Chain Management",
  "Social Studies Education",
  "Special Education",
  "Strategic Communication",
  "Textiles and Fashion Education",
  "Theatre Arts",
] as const;

export const POSTGRAD_PROGRAMS = [
  "BA Journalism and Media Studies",
  "EdD Social Studies Education",
  "Exec. Masters Human Rights, Conflict and Peace Studies",
  "MA Art Education",
  "MA Arts and Culture",
  "MA Communication Instruction",
  "MA Development Communication",
  "MA English",
  "MA French Translation",
  "MA Ghanaian Language Studies",
  "MA History Education",
  "MA Human Rights, Conflict and Peace Studies",
  "MA Journalism and Media Studies",
  "MA Strategic Communication",
  "MA Theatre Arts",
  "MA Translation Studies",
  "MBA Accounting",
  "MBA Finance",
  "MBA Human Resource Management",
  "MBA Management Information System",
  "MBA Marketing",
  "MBA Procurement and Supply Chain Management",
  "MEd Basic Education",
  "MEd Biology Education",
  "MEd Clothing and Textiles",
  "MEd Computer Education and Technology",
  "MEd Counselling Psychology",
  "MEd Early Childhood Education",
  "MEd Educational Administration and Management",
  "MEd English",
  "MEd Family Life Management",
  "MEd Food and Nutrition",
  "MEd French Education",
  "MEd Geography Education",
  "MEd Guidance and Counselling",
  "MEd Institutional Mentorship and Supervision",
  "MEd Mathematics Education",
  "MEd Physical Education and Sports Studies",
  "MEd Political Science Education",
  "MEd Science Education",
  "MEd Social Studies",
  "MEd Special Education",
  "MEd Supervision",
  "MEd Teaching English as a Second Language (TESL)",
  "MFA Theatre Arts",
  "MPhil Accounting",
  "MPhil Applied Linguistics",
  "MPhil Art Education",
  "MPhil Arts and Culture",
  "MPhil Assessment, Measurement and Evaluation",
  "MPhil Basic Education",
  "MPhil Biology Education",
  "MPhil Business Administration (Human Resource Management option)",
  "MPhil Chemistry Education",
  "MPhil Clothing and Textiles",
  "MPhil Communication Instruction",
  "MPhil Counselling Psychology",
  "MPhil Curriculum and Pedagogic Studies",
  "MPhil Development Finance",
  "MPhil Early Childhood Education",
  "MPhil Economics",
  "MPhil Educational Administration and Management",
  "MPhil Entrepreneurship and Innovations Management",
  "MPhil Environmental Science",
  "MPhil Family Life Management Education",
  "MPhil Finance",
  "MPhil Food and Nutrition",
  "MPhil French",
  "MPhil Geography with Education",
  "MPhil Ghanaian Language Studies",
  "MPhil History Education",
  "MPhil Human Rights, Conflict and Peace Studies",
  "MPhil Information and Communication Technology Education",
  "MPhil Instructional Design and Technology",
  "MPhil Integrated Science Education",
  "MPhil Mathematics Education",
  "MPhil Music",
  "MPhil Physical Education and Sports Studies",
  "MPhil Physics Education",
  "MPhil Political Science Education",
  "MPhil Procurement and Supply Chain Management",
  "MPhil Science Education",
  "MPhil Social Studies Education",
  "MPhil Special Education",
  "MPhil Strategic Communication",
  "MPhil Teaching English as a Second Language",
  "MPhil Textiles and Fashion Education",
  "MPhil Theatre Arts",
  "MPhil Visual Communication Studies",
  "MSc Biology",
  "MSc Development Finance",
  "MSc Economics",
  "MSc Economics Education",
  "MSc Information Technology Education",
  "PhD Applied Linguistics",
  "PhD Arts and Culture",
  "PhD Basic Education",
  "PhD Biology Education",
  "PhD Chemistry Education",
  "PhD Communication and Media Studies",
  "PhD Counselling Psychology",
  "PhD Educational Leadership",
  "PhD English",
  "PhD French",
  "PhD Geography Education",
  "PhD Ghanaian Language Studies",
  "PhD Mathematics Education",
  "PhD Music",
  "PhD Science Education",
  "PhD Social Studies Education",
  "PhD Special Education",
  "PGDE",
  "PGDTLHE",
] as const;

export const POSTGRAD_LEVELS = ["Year 1", "Year 2", "Year 3", "Year 4"] as const;

export const MEMBERSHIP_TYPE_LABELS: Record<MembershipType, string> = {
  REGULAR: "Regular",
  DISTANCE: "Distance",
  SANDWICH: "Sandwich",
};

export const MAX_PASSPORT_PICTURE_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_MEDICAL_REPORT_BYTES = 5 * 1024 * 1024; // 5 MB

// A single schema handles both tracks: which list of departments/programmes/
// levels is valid (and whether a degree category is required) depends on
// the `track` field itself, checked in superRefine below.
export const enrollmentSchema = z
  .object({
    track: z.enum(APPLICATION_TRACKS),

    // Preliminary — membership type must be chosen before the rest of the form
    membershipType: z.enum(MembershipType, { message: "Select a membership type" }),

    // Section A: Personal Identification
    firstName: z.string().trim().min(1, "First name is required").max(100),
    middleName: z.string().trim().max(100).optional().or(z.literal("")),
    lastName: z.string().trim().min(1, "Surname is required").max(100),
    email: z.string().trim().toLowerCase().email("Enter a valid personal email address"),
    phone: z.string().trim().regex(phoneRegex, "Enter a valid phone / WhatsApp number"),

    dateOfBirth: z.coerce.date({ message: "Enter a valid date of birth" }),
    gender: z.enum(["MALE", "FEMALE"], { message: "Select a gender" }),

    // Section B: Campus & Academic Department (valid options depend on track)
    campus: z.enum(CAMPUSES, { message: "Select a campus" }),
    hallOfAffiliation: z.enum(HALLS_OF_AFFILIATION).optional().or(z.literal("")),
    degreeCategory: z.string().trim().optional().or(z.literal("")),
    academicDepartment: z.string().trim().min(1, "Select your academic department"),
    programme: z.string().trim().min(1, "Select your program of study"),
    level: z.string().trim().min(1, "Select your level"),
    indexNumber: z.string().trim().min(3, "Index number is required").max(50),
    yearOfAdmission: z.coerce
      .number()
      .int()
      .min(2000)
      .max(new Date().getFullYear() + 1),
    expectedGraduationYear: z.coerce.number().int().min(2000).max(2100).optional(),

    // Section C: Category of Special Needs
    department: z.enum(DISABILITY_CATEGORIES, {
      message: "Select a category of special needs",
    }),
    specificSupportNeeds: z.array(z.enum(SUPPORT_NEEDS)).optional().default([]),

    // Section D: Document Attachments
    profileImageKey: z.string().optional(),
    medicalReportKey: z.string().min(1, "Medical report is required"),

    // Additional information (kept from the original build)
    residentialAddress: z.string().trim().min(1, "Residential address is required").max(300),
    region: z.string().trim().min(1, "Region is required").max(100),
    emergencyContactName: z.string().trim().min(1, "Emergency contact name is required").max(150),
    emergencyContactPhone: z.string().trim().regex(phoneRegex, "Enter a valid phone number"),

    // Section E: Final Consent
    agreedToTerms: z.literal(true, {
      message: "You must confirm registration at the Resource Center and accept the terms to continue",
    }),
  })
  .superRefine((data, ctx) => {
    const isPg = data.track === "POSTGRADUATE";
    const validDepartments = isPg ? POSTGRAD_DEPARTMENTS : ACADEMIC_DEPARTMENTS;
    const validProgrammes = isPg ? POSTGRAD_PROGRAMS : PROGRAMS_OF_STUDY;
    const validLevels = isPg ? POSTGRAD_LEVELS : LEVELS;

    if (!(validDepartments as readonly string[]).includes(data.academicDepartment)) {
      ctx.addIssue({ code: "custom", path: ["academicDepartment"], message: "Select a valid academic department" });
    }
    if (!(validProgrammes as readonly string[]).includes(data.programme)) {
      ctx.addIssue({ code: "custom", path: ["programme"], message: "Select a valid program of study" });
    }
    if (!(validLevels as readonly string[]).includes(data.level)) {
      ctx.addIssue({ code: "custom", path: ["level"], message: "Select a valid level" });
    }
    if (isPg && !(POSTGRAD_DEGREE_CATEGORIES as readonly string[]).includes(data.degreeCategory ?? "")) {
      ctx.addIssue({ code: "custom", path: ["degreeCategory"], message: "Select your postgraduate degree category" });
    }
  });

export type EnrollmentInput = z.infer<typeof enrollmentSchema>;

export const memberLoginSchema = z.object({
  indexNumber: z.string().trim().min(1, "Index number is required"),
  password: z.string().trim().min(1, "Password is required"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().trim().min(1, "Current password is required"),
    newPassword: z.string().trim().refine(isPasswordStrongEnough, PASSWORD_REQUIREMENTS_MESSAGE),
    confirmNewPassword: z.string().trim(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(1),
    newPassword: z.string().trim().refine(isPasswordStrongEnough, PASSWORD_REQUIREMENTS_MESSAGE),
    confirmNewPassword: z.string().trim(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

export const applicationReviewSchema = z.object({
  applicationId: z.string().min(1),
  action: z.enum(["APPROVE", "REJECT", "UNDER_REVIEW", "SUSPEND", "REQUEST_CHANGES"]),
  adminNote: z.string().max(1000).optional().or(z.literal("")),
});

/**
 * Fields an admin can correct on an existing member's record — everything a
 * data-entry mistake or a life change (marriage, transfer, a mistyped index
 * number at enrollment) could reasonably need fixed, short of the two things
 * that already have their own dedicated, audited controls (account status,
 * marking graduated) and the two file attachments (no admin re-upload path
 * exists yet).
 *
 * Deliberately looser than enrollmentSchema: this edits a record that
 * already passed that validation once, an admin is doing the editing, and
 * several fields here are nullable in the database in a way a first-time
 * application's fields are not. Values are still checked for shape (email
 * format, phone pattern) — just not re-forced through every one-time-only
 * enrollment rule.
 */
export const memberAdminEditSchema = z.object({
  indexNumber: z.string().trim().min(3, "Index number is required").max(50),
  firstName: z.string().trim().min(1, "First name is required").max(100),
  middleName: z.string().trim().max(100).optional().or(z.literal("")),
  lastName: z.string().trim().min(1, "Surname is required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z.string().trim().regex(phoneRegex, "Enter a valid phone / WhatsApp number"),
  dateOfBirth: z.coerce.date().optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE"]).optional().or(z.literal("")),
  membershipType: z.enum(MembershipType).optional().or(z.literal("")),

  applicationTrack: z.enum(APPLICATION_TRACKS).optional().or(z.literal("")),
  campus: z.string().trim().min(1, "Select a campus").max(100),
  hallOfAffiliation: z.string().trim().max(100).optional().or(z.literal("")),
  degreeCategory: z.string().trim().max(50).optional().or(z.literal("")),
  academicDepartment: z.string().trim().max(150).optional().or(z.literal("")),
  programme: z.string().trim().min(1, "Programme is required").max(200),
  level: z.string().trim().min(1, "Level is required").max(50),
  yearOfAdmission: z.coerce.number().int().min(2000).max(new Date().getFullYear() + 1),
  expectedGraduationYear: z.coerce.number().int().min(2000).max(2100).optional(),

  department: z.string().trim().min(1, "Select a category of special needs").max(150),
  specificSupportNeeds: z.array(z.string()).optional().default([]),

  residentialAddress: z.string().trim().max(300).optional().or(z.literal("")),
  region: z.string().trim().max(100).optional().or(z.literal("")),
  emergencyContactName: z.string().trim().max(150).optional().or(z.literal("")),
  emergencyContactPhone: z.string().trim().regex(phoneRegex, "Enter a valid phone number").optional().or(z.literal("")),
});

export type MemberAdminEditInput = z.infer<typeof memberAdminEditSchema>;
