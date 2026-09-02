import { z } from "zod";
import { Gender } from "@/generated/prisma/enums";
import { MembershipType } from "@/generated/prisma/enums";
import { isPasswordStrongEnough, PASSWORD_REQUIREMENTS_MESSAGE } from "@/lib/auth/password";

const phoneRegex = /^[0-9+()\-\s]{7,20}$/;

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

export const CAMPUSES = [
  "Ajumako Campus (College of Languages Education)",
  "Kumasi Campus (AAMUSTED / College programmes link)",
  "Mampong Campus (College of Agriculture Education)",
  "Winneba Campus (Main Campus)",
] as const;

export const HALLS_OF_AFFILIATION = [
  "Simpa Hall",
  "North Campus Hall",
  "South Campus Hall",
  "Ghartey Hall",
  "Kwegyir Aggrey Hall",
  "Ajumako Hall",
  "Atwea Hall",
] as const;

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

// Undergraduate enrollment only for now — postgraduate has its own (future)
// application flow, so "Postgraduate" is intentionally not offered here.
export const LEVELS = ["Level 100", "Level 200", "Level 300", "Level 400"] as const;

export const MEMBERSHIP_TYPE_LABELS: Record<MembershipType, string> = {
  REGULAR: "Regular",
  DISTANCE: "Distance",
  SANDWICH: "Sandwich",
};

export const MAX_PASSPORT_PICTURE_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_MEDICAL_REPORT_BYTES = 5 * 1024 * 1024; // 5 MB

export const enrollmentSchema = z.object({
  // Preliminary — membership type must be chosen before the rest of the form
  membershipType: z.enum(MembershipType, { message: "Select a membership type" }),

  // Section A: Personal Identification
  firstName: z.string().trim().min(1, "First name is required").max(100),
  middleName: z.string().trim().max(100).optional().or(z.literal("")),
  lastName: z.string().trim().min(1, "Surname is required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid personal email address"),
  phone: z.string().trim().regex(phoneRegex, "Enter a valid phone / WhatsApp number"),

  // Kept from the original build (not in the new blueprint, but not removed
  // since existing applications/members already rely on them).
  dateOfBirth: z.coerce.date({ message: "Enter a valid date of birth" }),
  gender: z.enum(Gender),

  // Section B: UEW Campus & Academic Department
  campus: z.enum(CAMPUSES, { message: "Select a campus" }),
  hallOfAffiliation: z.enum(HALLS_OF_AFFILIATION).optional().or(z.literal("")),
  academicDepartment: z.enum(ACADEMIC_DEPARTMENTS, { message: "Select your academic department" }),
  programme: z.enum(PROGRAMS_OF_STUDY, { message: "Select your program of study" }),
  level: z.enum(LEVELS, { message: "Select your level" }),
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
