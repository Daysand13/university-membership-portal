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
  "Arabic Education",
  "Art Education",
  "Ewe Education",
  "Fante, Nzema and Twi Education",
  "French Education",
  "Ga and Dangme Education",
  "Geography Education",
  "Graphic Design",
  "History Education",
  "Music Education",
  "Political Science Education",
  "Religions and Moral Studies Education",
  "Social Studies Education",
  "Theatre Arts",
  "Accounting",
  "Banking and Finance",
  "Human Resource Management",
  "Management",
  "Marketing and Entrepreneurship",
  "Procurement and Supply Chain Management",
  "Basic Education (Early Grade / Primary / JHS Options)",
  "Community-Based Rehabilitation and Disability Studies (CBRDS)",
  "Counselling Psychology",
  "Early Childhood Education",
  "Special Education",
  "Agriculture Education",
  "Biology Education",
  "Catering and Hospitality Education",
  "Chemistry Education",
  "Environmental Health and Sanitation Education",
  "Fashion Design and Textiles Education",
  "Health Administration and Education",
  "Information and Communication Technology Education",
  "Integrated Home Economics Education",
  "Integrated Science Education",
  "Mathematics Education",
  "Physical Education",
  "Physics Education",
  "Sports Coaching",
  "Accounting Studies",
  "Basic Education",
  "Management Studies",
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
  "Accounting",
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
  "Social Studies Education",
  "Human Rights, Conflict and Peace Studies",
  "Art Education",
  "Arts and Culture",
  "Communication Instruction",
  "Development Communication",
  "English",
  "French Translation",
  "Ghanaian Language Studies",
  "History Education",
  "Journalism and Media Studies",
  "Strategic Communication",
  "Theatre Arts",
  "Translation Studies",
  "Accounting",
  "Finance",
  "Human Resource Management",
  "Management Information System",
  "Marketing",
  "Procurement and Supply Chain Management",
  "Basic Education",
  "Biology Education",
  "Clothing and Textiles",
  "Computer Education and Technology",
  "Counselling Psychology",
  "Early Childhood Education",
  "Educational Administration and Management",
  "Family Life Management",
  "Food and Nutrition",
  "French Education",
  "Geography Education",
  "Guidance and Counselling",
  "Institutional Mentorship and Supervision",
  "Mathematics Education",
  "Physical Education and Sports Studies",
  "Political Science Education",
  "Science Education",
  "Social Studies",
  "Special Education",
  "Supervision",
  "Teaching English as a Second Language (TESL)",
  "Applied Linguistics",
  "Assessment, Measurement and Evaluation",
  "Business Administration (Human Resource Management option)",
  "Chemistry Education",
  "Curriculum and Pedagogic Studies",
  "Development Finance",
  "Economics",
  "Entrepreneurship and Innovations Management",
  "Environmental Science",
  "Family Life Management Education",
  "French",
  "Geography with Education",
  "Information and Communication Technology Education",
  "Instructional Design and Technology",
  "Integrated Science Education",
  "Music",
  "Physics Education",
  "Teaching English as a Second Language",
  "Textiles and Fashion Education",
  "Visual Communication Studies",
  "Biology",
  "Economics Education",
  "Information Technology Education",
  "Communication and Media Studies",
  "Educational Leadership",
  "Education (PGDE)",
  "Teaching and Learning in Higher Education (PGDTLHE)",
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
