/**
 * Canonical Academic Structure & Constants for UPSA (University of Professional Studies, Accra)
 * UniStudy is strictly dedicated to UPSA students, faculties, and academic curriculum.
 */

export interface UPSAFaculty {
  code: string;
  name: string;
  shortName: string;
  description: string;
  departments: Array<{ code: string; name: string }>;
  programmes: string[];
}

export const UPSA_INSTITUTION = {
  id: '00000000-0000-0000-0000-000000007054',
  name: 'University of Professional Studies, Accra',
  shortName: 'UPSA',
  abbreviation: 'UPSA',
  motto: 'Scholarship with Professionalism',
  established: 1965,
  location: 'Accra, Ghana (Madina - Legon Corridor)',
  domains: ['upsamail.edu.gh', 'st.upsa.edu.gh', 'upsa.edu.gh'],
  portalUrl: 'https://upsavirtual.site',
  website: 'https://upsa.edu.gh',
} as const;

export const UPSA_LEVELS = [
  { value: 100, label: 'Level 100 (Freshman / First Year)' },
  { value: 200, label: 'Level 200 (Sophomore / Second Year)' },
  { value: 300, label: 'Level 300 (Junior / Third Year)' },
  { value: 400, label: 'Level 400 (Senior / Final Year)' },
  { value: 500, label: 'Postgraduate / Graduate Studies (MSc / MBA)' },
] as const;

export const UPSA_FACULTIES: UPSAFaculty[] = [
  {
    code: 'FITCS',
    name: 'Faculty of Information Technology and Communication Studies',
    shortName: 'FITCS',
    description: 'Leading digital transformation, computing, software engineering, and corporate communications.',
    departments: [
      { code: 'IT', name: 'Department of Information Technology' },
      { code: 'COMM', name: 'Department of Communication Studies' },
    ],
    programmes: [
      'BSc Information Technology Management',
      'BSc Computer Science',
      'BSc Business Information Systems',
      'BA Communication Studies',
      'BA Public Relations Management',
      'Diploma in Information Technology Management',
      'Diploma in Public Relations Management',
    ],
  },
  {
    code: 'FAF',
    name: 'Faculty of Accounting and Finance',
    shortName: 'Accounting & Finance',
    description: 'Premier training for chartered accountants, investment bankers, and actuarial analysts.',
    departments: [
      { code: 'ACC', name: 'Department of Accounting' },
      { code: 'BF', name: 'Department of Banking and Finance' },
    ],
    programmes: [
      'BSc Accounting',
      'BSc Banking and Finance',
      'BSc Actuarial Science',
      'BSc Accounting and Finance',
      'Diploma in Accounting',
    ],
  },
  {
    code: 'FMS',
    name: 'Faculty of Management Studies',
    shortName: 'Management Studies',
    description: 'Nurturing innovative managers, marketers, HR directors, and entrepreneurs.',
    departments: [
      { code: 'BA', name: 'Department of Business Administration' },
      { code: 'MKT', name: 'Department of Marketing' },
    ],
    programmes: [
      'Bachelor of Business Administration (BBA)',
      'BSc Marketing',
      'BSc Human Resource Management',
      'BSc Logistics and Supply Chain Management',
      'Diploma in Marketing',
      'Diploma in Management Studies',
    ],
  },
  {
    code: 'LAW',
    name: 'UPSA Law School',
    shortName: 'UPSA Law',
    description: 'Premier legal education focusing on commercial, constitutional, and international law.',
    departments: [
      { code: 'PCL', name: 'Department of Private and Commercial Law' },
      { code: 'PIL', name: 'Department of Public and International Law' },
    ],
    programmes: [
      'Bachelor of Laws (LLB - 4-Year Regular)',
      'Bachelor of Laws (LLB - 3-Year Post-First Degree)',
      'Master of Laws (LLM)',
    ],
  },
  {
    code: 'GRAD',
    name: 'School of Graduate Studies',
    shortName: 'Graduate Studies',
    description: 'Executive MBA, academic master degrees, and doctoral research in professional studies.',
    departments: [
      { code: 'PGB', name: 'Department of Postgraduate Business' },
      { code: 'PTL', name: 'Department of Postgraduate Technology & Leadership' },
    ],
    programmes: [
      'MBA Accounting and Finance',
      'MBA Corporate Governance',
      'MBA Marketing',
      'MBA Petroleum Accounting and Finance',
      'MSc Information Technology Management',
      'MSc Leadership',
      'MPhil Finance',
      'MPhil Accounting',
    ],
  },
];

export const ALL_UPSA_PROGRAMMES = UPSA_FACULTIES.flatMap((f) => f.programmes);

/**
 * Checks whether an email is a verified UPSA institutional email address
 */
export function isUPSAEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const lower = email.toLowerCase().trim();
  return UPSA_INSTITUTION.domains.some((d) => lower.endsWith(`@${d}`));
}

