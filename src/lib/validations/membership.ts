import { z } from "zod";
import { MembershipType } from "@/generated/prisma/enums";
import { isPasswordStrongEnough, PASSWORD_REQUIREMENTS_MESSAGE } from "@/lib/auth/password";

const phoneRegex = /^[0-9+()\-\s]{7,20}$/;

export const APPLICATION_TRACKS = ["UNDERGRADUATE", "POSTGRADUATE"] as const;
export type ApplicationTrack = (typeof APPLICATION_TRACKS)[number];

export const DISABILITY_CATEGORIES = [
  "Visual Impairment",
  "Hearing Impairment",
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
  "Department of Accounting",
  "Department of Agricultural Science Education",
  "Department of Akan-Nzema Education",
  "Department of Applied Finance and Policy Management",
  "Department of Applied Linguistics",
  "Department of Art Education",
  "Department of Basic Education",
  "Department of Biology Education",
  "Department of Chemistry Education",
  "Department of Communication Instruction",
  "Department of Early Childhood Education",
  "Department of Economics Education",
  "Department of Educational Foundations",
  "Department of English Education",
  "Department of Ewe Education",
  "Department of French Education",
  "Department of Ga-Dangme Education",
  "Department of Geography Education",
  "Department of Graphic Design",
  "Department of Gur-Gonja Education",
  "Department of Health, Physical Education, Recreation and Sports (HPERS)",
  "Department of History Education",
  "Department of Information and Communication Technology (ICT)",
  "Department of Integrated Home Economics Education",
  "Department of Integrated Science Education",
  "Department of Journalism and Media Studies",
  "Department of Management Sciences",
  "Department of Marketing and Entrepreneurship",
  "Department of Mathematics Education",
  "Department of Music Education",
  "Department of Physics Education",
  "Department of Political Science Education",
  "Department of Psychology and Education",
  "Department of Social Studies Education",
  "Department of Special Education",
  "Department of Theatre Arts",
] as const;

export const PROGRAMS_OF_STUDY = [
  "Bachelor of Arts (B.A.) Arabic Education",
  "Bachelor of Arts (B.A.) Art Education",
  "Bachelor of Arts (B.A.) Ewe Education",
  "Bachelor of Arts (B.A.) Fante, Nzema and Twi Education",
  "Bachelor of Arts (B.A.) French Education",
  "Bachelor of Arts (B.A.) Ga and Dangme Education",
  "Bachelor of Arts (B.A.) Geography Education",
  "Bachelor of Arts (B.A.) Graphic Design",
  "Bachelor of Arts (B.A.) History Education",
  "Bachelor of Arts (B.A.) Music Education",
  "Bachelor of Arts (B.A.) Political Science Education",
  "Bachelor of Arts (B.A.) Religions and Moral Studies Education",
  "Bachelor of Arts (B.A.) Social Studies Education",
  "Bachelor of Arts (B.A.) Theatre Arts",
  "Bachelor of Business Administration (B.B.A.) Accounting",
  "Bachelor of Business Administration (B.B.A.) Banking and Finance",
  "Bachelor of Business Administration (B.B.A.) Human Resource Management",
  "Bachelor of Business Administration (B.B.A.) Management",
  "Bachelor of Business Administration (B.B.A.) Marketing and Entrepreneurship",
  "Bachelor of Business Administration (B.B.A.) Procurement and Supply Chain Management",
  "Bachelor of Education (B.Ed.) Basic Education (Early Grade / Primary / JHS Options)",
  "Bachelor of Education (B.Ed.) Community-Based Rehabilitation and Disability Studies (CBRDS)",
  "Bachelor of Education (B.Ed.) Counselling Psychology",
  "Bachelor of Education (B.Ed.) Early Childhood Education",
  "Bachelor of Education (B.Ed.) Special Education",
  "Bachelor of Science (B.Sc.) Agriculture Education",
  "Bachelor of Science (B.Sc.) Biology Education",
  "Bachelor of Science (B.Sc.) Catering and Hospitality Education",
  "Bachelor of Science (B.Sc.) Chemistry Education",
  "Bachelor of Science (B.Sc.) Environmental Health and Sanitation Education",
  "Bachelor of Science (B.Sc.) Fashion Design and Textiles Education",
  "Bachelor of Science (B.Sc.) Health Administration and Education",
  "Bachelor of Science (B.Sc.) Information and Communication Technology Education",
  "Bachelor of Science (B.Sc.) Integrated Home Economics Education",
  "Bachelor of Science (B.Sc.) Integrated Science Education",
  "Bachelor of Science (B.Sc.) Mathematics Education",
  "Bachelor of Science (B.Sc.) Physical Education",
  "Bachelor of Science (B.Sc.) Physics Education",
  "Bachelor of Science (B.Sc.) Sports Coaching",
  "Diploma in Accounting Studies",
  "Diploma in Basic Education",
  "Diploma in Early Childhood Education",
  "Diploma in Management Studies",
] as const;

export const LEVELS = ["Level 100", "Level 200", "Level 300", "Level 400"] as const;

// ---------------------------------------------------------------------------
// Postgraduate
// ---------------------------------------------------------------------------

export const POSTGRAD_DEGREE_CATEGORIES = [
  "Doctor of Education (Ed.D.)",
  "Doctor of Philosophy (Ph.D.)",
  "Executive Master's Degrees",
  "Master of Arts (M.A.)",
  "Master of Business Administration (MBA)",
  "Master of Education (M.Ed.)",
  "Master of Fine Arts (MFA)",
  "Master of Philosophy (M.Phil.)",
  "Master of Science (M.Sc.)",
  "Postgraduate Diploma in Education (PGDE)",
  "Postgraduate Diploma in Teaching and Learning in Higher Education (PGDTLHE)",
] as const;

export const POSTGRAD_DEPARTMENTS = [
  "Department of Accounting",
  "Department of Akan-Nzema Education",
  "Department of Applied Finance and Policy Management",
  "Department of Applied Linguistics",
  "Department of Art Education",
  "Department of Basic Education",
  "Department of Biology Education",
  "Department of Chemistry Education",
  "Department of Clothing and Textiles Education",
  "Department of Communication Instruction",
  "Department of Counselling Psychology",
  "Department of Development Communication",
  "Department of Early Childhood Education",
  "Department of Economics Education",
  "Department of Educational Foundations",
  "Department of Educational Management and Administration Education",
  "Department of English Education",
  "Department of Environmental Health and Sanitation Education",
  "Department of Environmental Science Education",
  "Department of Ewe Education",
  "Department of Family Life Management Education",
  "Department of Food and Nutrition Education",
  "Department of French Education",
  "Department of Ga-Dangme Education",
  "Department of Geography Education",
  "Department of Graphic Design",
  "Department of Gur-Gonja Education",
  "Department of Health Administration Education",
  "Department of Health, Physical Education, Recreation and Sports",
  "Department of History Education",
  "Department of Information and Communication Technology",
  "Department of Integrated Home Economics Education",
  "Department of Integrated Science Education",
  "Department of Journalism and Media Studies",
  "Department of Management Sciences",
  "Department of Marketing and Entrepreneurship",
  "Department of Mathematics Education",
  "Department of Music Education",
  "Department of Physics Education",
  "Department of Political Science Education",
  "Department of Procurement and Supply Chain Management",
  "Department of Social Studies Education",
  "Department of Special Education",
  "Department of Strategic Communication",
  "Department of Textiles and Fashion Education",
  "Department of Theatre Arts",
] as const;

export const POSTGRAD_PROGRAMS = [
  "Doctor of Education (Ed.D.) Social Studies Education",
  "Executive Master's in Human Rights, Conflict and Peace Studies",
  "Master of Arts (M.A.) Art Education",
  "Master of Arts (M.A.) Arts and Culture",
  "Master of Arts (M.A.) Communication Instruction",
  "Master of Arts (M.A.) Development Communication",
  "Master of Arts (M.A.) English",
  "Master of Arts (M.A.) French Translation",
  "Master of Arts (M.A.) Ghanaian Language Studies",
  "Master of Arts (M.A.) History Education",
  "Master of Arts (M.A.) Human Rights, Conflict and Peace Studies",
  "Master of Arts (M.A.) Journalism and Media Studies",
  "Master of Arts (M.A.) Strategic Communication",
  "Master of Arts (M.A.) Theatre Arts",
  "Master of Arts (M.A.) Translation Studies",
  "Master of Business Administration (MBA) Accounting",
  "Master of Business Administration (MBA) Finance",
  "Master of Business Administration (MBA) Human Resource Management",
  "Master of Business Administration (MBA) Management Information System",
  "Master of Business Administration (MBA) Marketing",
  "Master of Business Administration (MBA) Procurement and Supply Chain Management",
  "Master of Education (M.Ed.) Basic Education",
  "Master of Education (M.Ed.) Biology Education",
  "Master of Education (M.Ed.) Clothing and Textiles",
  "Master of Education (M.Ed.) Computer Education and Technology",
  "Master of Education (M.Ed.) Counselling Psychology",
  "Master of Education (M.Ed.) Early Childhood Education",
  "Master of Education (M.Ed.) Educational Administration and Management",
  "Master of Education (M.Ed.) English",
  "Master of Education (M.Ed.) Family Life Management",
  "Master of Education (M.Ed.) Food and Nutrition",
  "Master of Education (M.Ed.) French Education",
  "Master of Education (M.Ed.) Geography Education",
  "Master of Education (M.Ed.) Guidance and Counselling",
  "Master of Education (M.Ed.) Institutional Mentorship and Supervision",
  "Master of Education (M.Ed.) Mathematics Education",
  "Master of Education (M.Ed.) Physical Education and Sports Studies",
  "Master of Education (M.Ed.) Political Science Education",
  "Master of Education (M.Ed.) Science Education",
  "Master of Education (M.Ed.) Social Studies",
  "Master of Education (M.Ed.) Special Education",
  "Master of Education (M.Ed.) Supervision",
  "Master of Education (M.Ed.) Teaching English as a Second Language (TESL)",
  "Master of Fine Arts (MFA) Theatre Arts",
  "Master of Philosophy (M.Phil.) Accounting",
  "Master of Philosophy (M.Phil.) Applied Linguistics",
  "Master of Philosophy (M.Phil.) Art Education",
  "Master of Philosophy (M.Phil.) Arts and Culture",
  "Master of Philosophy (M.Phil.) Assessment, Measurement and Evaluation",
  "Master of Philosophy (M.Phil.) Basic Education",
  "Master of Philosophy (M.Phil.) Biology Education",
  "Master of Philosophy (M.Phil.) Business Administration (Human Resource Management option)",
  "Master of Philosophy (M.Phil.) Chemistry Education",
  "Master of Philosophy (M.Phil.) Clothing and Textiles",
  "Master of Philosophy (M.Phil.) Communication Instruction",
  "Master of Philosophy (M.Phil.) Counselling Psychology",
  "Master of Philosophy (M.Phil.) Curriculum and Pedagogic Studies",
  "Master of Philosophy (M.Phil.) Development Finance",
  "Master of Philosophy (M.Phil.) Early Childhood Education",
  "Master of Philosophy (M.Phil.) Economics",
  "Master of Philosophy (M.Phil.) Educational Administration and Management",
  "Master of Philosophy (M.Phil.) Entrepreneurship and Innovations Management",
  "Master of Philosophy (M.Phil.) Environmental Science",
  "Master of Philosophy (M.Phil.) Family Life Management Education",
  "Master of Philosophy (M.Phil.) Finance",
  "Master of Philosophy (M.Phil.) Food and Nutrition",
  "Master of Philosophy (M.Phil.) French",
  "Master of Philosophy (M.Phil.) Geography with Education",
  "Master of Philosophy (M.Phil.) Ghanaian Language Studies",
  "Master of Philosophy (M.Phil.) History Education",
  "Master of Philosophy (M.Phil.) Human Rights, Conflict and Peace Studies",
  "Master of Philosophy (M.Phil.) Information and Communication Technology Education",
  "Master of Philosophy (M.Phil.) Instructional Design and Technology",
  "Master of Philosophy (M.Phil.) Integrated Science Education",
  "Master of Philosophy (M.Phil.) Mathematics Education",
  "Master of Philosophy (M.Phil.) Music",
  "Master of Philosophy (M.Phil.) Physical Education and Sports Studies",
  "Master of Philosophy (M.Phil.) Physics Education",
  "Master of Philosophy (M.Phil.) Political Science Education",
  "Master of Philosophy (M.Phil.) Procurement and Supply Chain Management",
  "Master of Philosophy (M.Phil.) Science Education",
  "Master of Philosophy (M.Phil.) Social Studies Education",
  "Master of Philosophy (M.Phil.) Special Education",
  "Master of Philosophy (M.Phil.) Strategic Communication",
  "Master of Philosophy (M.Phil.) Teaching English as a Second Language",
  "Master of Philosophy (M.Phil.) Textiles and Fashion Education",
  "Master of Philosophy (M.Phil.) Theatre Arts",
  "Master of Philosophy (M.Phil.) Visual Communication Studies",
  "Master of Science (M.Sc.) Biology",
  "Master of Science (M.Sc.) Development Finance",
  "Master of Science (M.Sc.) Economics",
  "Master of Science (M.Sc.) Economics Education",
  "Master of Science (M.Sc.) Information Technology Education",
  "Ph.D. Applied Linguistics",
  "Ph.D. Arts and Culture",
  "Ph.D. Basic Education",
  "Ph.D. Biology Education",
  "Ph.D. Chemistry Education",
  "Ph.D. Communication and Media Studies",
  "Ph.D. Counselling Psychology",
  "Ph.D. Educational Leadership",
  "Ph.D. English",
  "Ph.D. French",
  "Ph.D. Geography Education",
  "Ph.D. Ghanaian Language Studies",
  "Ph.D. Mathematics Education",
  "Ph.D. Music",
  "Ph.D. Science Education",
  "Ph.D. Social Studies Education",
  "Ph.D. Special Education",
  "Postgraduate Diploma in Education (PGDE)",
  "Postgraduate Diploma in Teaching and Learning in Higher Education (PGDTLHE)",
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
