/**
 * Qualifications awarded in Ghana, for picking rather than typing.
 *
 * A CV is read by employers who scan for the qualification and move on, so
 * "WASSCE", "W.A.S.S.C.E", "wassce" and "West African Senior School Cert."
 * all being the same thing typed four ways costs the writer interviews.
 * Picking from a list also spares anybody using a screen reader or a
 * switch from spelling out a long official name letter by letter.
 *
 * Grouped the way somebody progresses through the system, so the one being
 * looked for is where it is expected. Old certificates are kept in —
 * MSLC, Teacher's Certificate 'A', GCE, SSSCE — because graduates of that
 * era are alumni of this association and their qualification is not
 * obsolete just because it is no longer awarded.
 *
 * Nothing forces a choice from the list: OTHER_QUALIFICATION opens a box,
 * and whatever a person typed before this list existed is kept as it was.
 */

export interface QualificationGroup {
  label: string;
  options: string[];
}

/** Picked when nothing in the list fits; reveals a plain text box. */
export const OTHER_QUALIFICATION = "Other";

export const QUALIFICATION_GROUPS: QualificationGroup[] = [
  {
    label: "Basic education",
    options: [
      "Basic Education Certificate Examination (BECE)",
      "Junior High School Certificate",
      "Middle School Leaving Certificate (MSLC)",
    ],
  },
  {
    label: "Senior high school",
    options: [
      "West African Senior School Certificate Examination (WASSCE)",
      "Senior Secondary School Certificate Examination (SSSCE)",
      "GCE Ordinary Level (O Level)",
      "GCE Advanced Level (A Level)",
      "Senior High School Certificate",
    ],
  },
  {
    label: "Technical and vocational",
    options: [
      "NVTI Proficiency I Certificate",
      "NVTI Proficiency II Certificate",
      "NVTI National Craftsmanship Certificate",
      "City & Guilds Certificate",
      "Ghana TVET Certificate I",
      "Ghana TVET Certificate II",
      "Ghana TVET Certificate III",
      "Competency-Based Training (CBT) Certificate",
      "Technician Part I / II / III Certificate",
      "General Business Certificate Examination (GBCE)",
      "Advanced Business Certificate Examination (ABCE)",
      "Apprenticeship Certificate",
    ],
  },
  {
    label: "Teacher education",
    options: [
      "Teacher's Certificate 'A' (Post-Secondary)",
      "Diploma in Basic Education (DBE)",
      "Untrained Teacher Diploma in Basic Education (UTDBE)",
      "Post-Diploma in Basic Education",
      "Diploma in Education",
      "Diploma in Special Education",
      "Ghana Teacher Licensure Certificate",
    ],
  },
  {
    label: "Certificates and diplomas",
    options: [
      "Access Course Certificate",
      "Certificate (tertiary)",
      "Diploma",
      "Higher National Diploma (HND)",
      "Advanced Diploma",
      "Professional Diploma",
      "Postgraduate Diploma (PGD)",
      "Short course certificate",
    ],
  },
  {
    label: "Nursing, midwifery and health",
    options: [
      "Health Assistant (Clinical) Certificate",
      "Community Health Nurse Certificate",
      "Registered General Nurse (RGN)",
      "Registered Mental Nurse (RMN)",
      "Registered Midwife",
      "Diploma in Nursing",
      "Diploma in Midwifery",
      "Bachelor of Science in Nursing (BSc Nursing)",
    ],
  },
  {
    label: "Bachelor's degrees",
    options: [
      "Bachelor of Education (B.Ed.)",
      "Bachelor of Education in Special Education (B.Ed. Special Education)",
      "Bachelor of Arts (BA)",
      "Bachelor of Science (BSc)",
      "Bachelor of Business Administration (BBA)",
      "Bachelor of Commerce (BCom)",
      "Bachelor of Management Studies (BMS)",
      "Bachelor of Laws (LLB)",
      "Bachelor of Fine Art (BFA)",
      "Bachelor of Music (B.Mus.)",
      "Bachelor of Engineering (BEng)",
      "Bachelor of Technology (B.Tech.)",
      "Bachelor of Architecture (B.Arch.)",
      "Bachelor of Social Work (BSW)",
      "Bachelor of Pharmacy (B.Pharm.)",
      "Doctor of Pharmacy (Pharm.D.)",
      "Bachelor of Medicine and Bachelor of Surgery (MBChB)",
      "Bachelor of Dental Surgery (BDS)",
      "Doctor of Veterinary Medicine (DVM)",
      "Bachelor of Public Health (BPH)",
      "Bachelor of Development Studies",
    ],
  },
  {
    label: "Master's degrees",
    options: [
      "Master of Philosophy (MPhil)",
      "Master of Education (M.Ed.)",
      "Master of Education in Special Education (M.Ed. Special Education)",
      "Master of Arts (MA)",
      "Master of Science (MSc)",
      "Master of Business Administration (MBA)",
      "Master of Public Administration (MPA)",
      "Master of Public Health (MPH)",
      "Master of Laws (LLM)",
      "Master of Fine Art (MFA)",
      "Master of Engineering (MEng)",
      "Master of Technology (M.Tech.)",
      "Master of Social Work (MSW)",
      "Master of Nursing (MN)",
    ],
  },
  {
    label: "Doctoral degrees",
    options: [
      "Doctor of Philosophy (PhD)",
      "Doctor of Education (Ed.D.)",
      "Doctor of Business Administration (DBA)",
      "Doctor of Medicine (MD)",
      "Doctor of Laws (LLD)",
    ],
  },
  {
    label: "Professional qualifications",
    options: [
      "Chartered Accountant (ICAG)",
      "Association of Chartered Certified Accountants (ACCA)",
      "Chartered Institute of Management Accountants (CIMA)",
      "Certified Public Accountant (CPA)",
      "Qualifying Certificate in Law (Ghana School of Law)",
      "Barrister-at-Law (Called to the Ghana Bar)",
      "Chartered Institute of Bankers, Ghana (CIB Ghana)",
      "Chartered Institute of Marketing (CIM)",
      "Chartered Institute of Procurement & Supply (CIPS)",
      "Chartered Institute of Human Resource Management (CIHRM Ghana)",
      "Chartered Insurance Practitioner (CII)",
      "Professional Engineer (Ghana Institution of Engineering)",
      "Project Management Professional (PMP)",
      "Ghanaian Sign Language Interpreting Certificate",
      "Braille Transcription Certificate",
      "Information Technology certification",
    ],
  },
];

/** Every listed qualification, flat — for checking whether one is known. */
export const QUALIFICATIONS: string[] = QUALIFICATION_GROUPS.flatMap((group) => group.options);

/**
 * Whether a stored value is one this list offers.
 *
 * Anything else — typed in before the list existed, or entered under
 * "Other" — belongs in the free-text box, not silently replaced.
 */
export function isListedQualification(value: string): boolean {
  return QUALIFICATIONS.includes(value);
}
