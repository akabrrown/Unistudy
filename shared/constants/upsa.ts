/**
 * Canonical Academic Structure & Constants for UPSA (University of Professional Studies, Accra)
 * UniStudy is strictly dedicated to UPSA students, faculties, departments, and academic curriculum.
 */

export type UPSAStudyLevelTier = 'diploma' | 'undergraduate' | 'postgraduate' | 'professional';

export interface UPSAProgrammeItem {
  name: string;
  level: UPSAStudyLevelTier;
  subCategory?: 'PhD' | 'MPhil' | 'MBA' | 'MSc' | 'MA' | 'LLM' | 'Undergraduate' | 'Diploma' | 'Professional';
  facultyCode: string;
  department: string;
  admissionsUrl?: string;
  isProfessional?: boolean;
}

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
  { value: 100, label: 'Level 100' },
  { value: 200, label: 'Level 200' },
  { value: 300, label: 'Level 300' },
  { value: 400, label: 'Level 400' },
  { value: 500, label: 'Level 500' },
] as const;

export const UPSA_PROGRAMMES_CATALOG: UPSAProgrammeItem[] = [
  // ── DIPLOMA PROGRAMMES ──
  {
    name: 'Diploma in Accounting',
    level: 'diploma',
    subCategory: 'Diploma',
    facultyCode: 'FAF',
    department: 'Department of Accounting',
  },
  {
    name: 'Diploma in Marketing',
    level: 'diploma',
    subCategory: 'Diploma',
    facultyCode: 'FMS',
    department: 'Department of Marketing',
  },
  {
    name: 'Diploma in Management',
    level: 'diploma',
    subCategory: 'Diploma',
    facultyCode: 'FMS',
    department: 'Department of Business Administration',
  },
  {
    name: 'Diploma in Public Relations',
    level: 'diploma',
    subCategory: 'Diploma',
    facultyCode: 'FITCS',
    department: 'Department of Communication Studies',
  },
  {
    name: 'Diploma in Information Technology Management',
    level: 'diploma',
    subCategory: 'Diploma',
    facultyCode: 'FITCS',
    department: 'Department of Information Technology Studies',
  },

  // ── UNDERGRADUATE PROGRAMMES ──
  {
    name: 'Bachelor of Science in Agribusiness and Finance',
    level: 'undergraduate',
    subCategory: 'Undergraduate',
    facultyCode: 'FAF',
    department: 'Department of Banking and Finance',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/bsc-agribusines-and-finance/',
  },
  {
    name: 'Bachelor of Arts in Applied French and Communications',
    level: 'undergraduate',
    subCategory: 'Undergraduate',
    facultyCode: 'FITCS',
    department: 'Department of Communication Studies',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/ba-applied-french-and-communication/',
  },
  {
    name: 'Bachelor of Science in Data Science and Analytics',
    level: 'undergraduate',
    subCategory: 'Undergraduate',
    facultyCode: 'FITCS',
    department: 'Department of Information Technology Studies',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/bsc-data-science-and-analytics/',
  },
  {
    name: 'Bachelor of Science in Applied Statistics',
    level: 'undergraduate',
    subCategory: 'Undergraduate',
    facultyCode: 'FAF',
    department: 'Department of Economics and Actuarial Science',
  },
  {
    name: 'Bachelor of Laws (LLB)',
    level: 'undergraduate',
    subCategory: 'Undergraduate',
    facultyCode: 'LAW',
    department: 'UPSA Law School',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/bachelor-of-laws/',
  },
  {
    name: 'Bachelor of Arts in Communication Studies',
    level: 'undergraduate',
    subCategory: 'Undergraduate',
    facultyCode: 'FITCS',
    department: 'Department of Communication Studies',
  },
  {
    name: 'Bachelor of Science in Logistics and Transport Management',
    level: 'undergraduate',
    subCategory: 'Undergraduate',
    facultyCode: 'FMS',
    department: 'Department of Business Administration',
  },
  {
    name: 'Bachelor of Arts in Public Relations Management',
    level: 'undergraduate',
    subCategory: 'Undergraduate',
    facultyCode: 'FITCS',
    department: 'Department of Communication Studies',
  },
  {
    name: 'Bachelor of Science in Accounting',
    level: 'undergraduate',
    subCategory: 'Undergraduate',
    facultyCode: 'FAF',
    department: 'Department of Accounting',
  },
  {
    name: 'Bachelor of Science in Accounting and Finance',
    level: 'undergraduate',
    subCategory: 'Undergraduate',
    facultyCode: 'FAF',
    department: 'Department of Accounting',
  },
  {
    name: 'Bachelor of Science in Business Economics',
    level: 'undergraduate',
    subCategory: 'Undergraduate',
    facultyCode: 'FAF',
    department: 'Department of Economics and Actuarial Science',
  },
  {
    name: 'Bachelor of Science in Actuarial Science',
    level: 'undergraduate',
    subCategory: 'Undergraduate',
    facultyCode: 'FAF',
    department: 'Department of Economics and Actuarial Science',
  },
  {
    name: 'Bachelor of Science in Banking and Finance',
    level: 'undergraduate',
    subCategory: 'Undergraduate',
    facultyCode: 'FAF',
    department: 'Department of Banking and Finance',
  },
  {
    name: 'Bachelor of Business Administration',
    level: 'undergraduate',
    subCategory: 'Undergraduate',
    facultyCode: 'FMS',
    department: 'Department of Business Administration',
  },
  {
    name: 'Bachelor of Science in Information Technology',
    level: 'undergraduate',
    subCategory: 'Undergraduate',
    facultyCode: 'FITCS',
    department: 'Department of Information Technology Studies',
  },
  {
    name: 'Bachelor of Science in Applied Marketing',
    level: 'undergraduate',
    subCategory: 'Undergraduate',
    facultyCode: 'FMS',
    department: 'Department of Marketing',
  },
  {
    name: 'Bachelor of Science in Real Estate Management and Finance',
    level: 'undergraduate',
    subCategory: 'Undergraduate',
    facultyCode: 'FMS',
    department: 'Department of Business Administration',
  },

  // ── POSTGRADUATE: PhD PROGRAMMES ──
  {
    name: 'Doctor of Philosophy in Management',
    level: 'postgraduate',
    subCategory: 'PhD',
    facultyCode: 'GRAD',
    department: 'Department of Business Administration',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/phd-management/',
  },
  {
    name: 'Doctor of Philosophy in Marketing',
    level: 'postgraduate',
    subCategory: 'PhD',
    facultyCode: 'GRAD',
    department: 'Department of Marketing',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/graduate/phd-marketing/',
  },
  {
    name: 'Doctor of Philosophy in Accounting',
    level: 'postgraduate',
    subCategory: 'PhD',
    facultyCode: 'GRAD',
    department: 'Department of Accounting',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/phd-accounting/',
  },
  {
    name: 'Doctor of Philosophy in International Security and Intelligence',
    level: 'postgraduate',
    subCategory: 'PhD',
    facultyCode: 'GRAD',
    department: 'School of Graduate Studies',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/phd-international-security-and-intelligence/',
  },
  {
    name: 'Doctor of Philosophy in Interdisciplinary Studies',
    level: 'postgraduate',
    subCategory: 'PhD',
    facultyCode: 'GRAD',
    department: 'School of Graduate Studies',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/phd-interdisciplinary-studies/',
  },
  {
    name: 'Doctor of Philosophy in Finance',
    level: 'postgraduate',
    subCategory: 'PhD',
    facultyCode: 'GRAD',
    department: 'Department of Banking and Finance',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/phd-finance/',
  },
  {
    name: 'Doctor of Philosophy in Information Systems',
    level: 'postgraduate',
    subCategory: 'PhD',
    facultyCode: 'GRAD',
    department: 'Department of Information Technology Studies',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/pdh-information-systems/',
  },
  {
    name: 'Doctor of Philosophy in Public Policy and Leadership (PhD. PPL)',
    level: 'postgraduate',
    subCategory: 'PhD',
    facultyCode: 'GRAD',
    department: 'School of Graduate Studies',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/phd-public-policy-and-leadership/',
  },

  // ── POSTGRADUATE: MPhil PROGRAMMES ──
  {
    name: 'Master of Philosophy in Applied Statistics',
    level: 'postgraduate',
    subCategory: 'MPhil',
    facultyCode: 'GRAD',
    department: 'Department of Economics and Actuarial Science',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/mphil-applied-statistics',
  },
  {
    name: 'Master of Philosophy in Accounting',
    level: 'postgraduate',
    subCategory: 'MPhil',
    facultyCode: 'GRAD',
    department: 'Department of Accounting',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/mphil-accounting/',
  },
  {
    name: 'Master of Philosophy in Leadership',
    level: 'postgraduate',
    subCategory: 'MPhil',
    facultyCode: 'GRAD',
    department: 'School of Graduate Studies',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/mphil-leadership/',
  },
  {
    name: 'Master of Philosophy in Finance',
    level: 'postgraduate',
    subCategory: 'MPhil',
    facultyCode: 'GRAD',
    department: 'Department of Banking and Finance',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/mphil-finance/',
  },
  {
    name: 'Master of Philosophy in Media & Digital Communication Management',
    level: 'postgraduate',
    subCategory: 'MPhil',
    facultyCode: 'GRAD',
    department: 'Department of Communication Studies',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/mphil-media-and-digital-communication-management/',
  },
  {
    name: 'Master of Philosophy in Information Systems',
    level: 'postgraduate',
    subCategory: 'MPhil',
    facultyCode: 'GRAD',
    department: 'Department of Information Technology Studies',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/mphil-information-systems/',
  },
  {
    name: 'Master of Philosophy in Management',
    level: 'postgraduate',
    subCategory: 'MPhil',
    facultyCode: 'GRAD',
    department: 'Department of Business Administration',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/mphil-management',
  },
  {
    name: 'Master of Philosophy in Marketing',
    level: 'postgraduate',
    subCategory: 'MPhil',
    facultyCode: 'GRAD',
    department: 'Department of Marketing',
  },

  // ── POSTGRADUATE: MBA PROGRAMMES ──
  {
    name: 'Master of Business Administration in Assets and Wealth Management',
    level: 'postgraduate',
    subCategory: 'MBA',
    facultyCode: 'GRAD',
    department: 'Department of Banking and Finance',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/mba-assets-and-wealth-management/',
  },
  {
    name: 'Master of Business Administration in Human Resources Management',
    level: 'postgraduate',
    subCategory: 'MBA',
    facultyCode: 'GRAD',
    department: 'Department of Business Administration',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/mba-human-resources-management/',
  },
  {
    name: 'Master of Business Administration in Accounting and Finance',
    level: 'postgraduate',
    subCategory: 'MBA',
    facultyCode: 'GRAD',
    department: 'Department of Accounting',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/mba-accounting-and-finance/',
  },
  {
    name: 'Master of Business Administration in Auditing',
    level: 'postgraduate',
    subCategory: 'MBA',
    facultyCode: 'GRAD',
    department: 'Department of Accounting',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/mba-auditing/',
  },
  {
    name: 'Master of Business Administration in Corporate Governance',
    level: 'postgraduate',
    subCategory: 'MBA',
    facultyCode: 'GRAD',
    department: 'Department of Business Administration',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/mba-corporate-governance/',
  },
  {
    name: 'Master of Business Administration in Corporate Communications',
    level: 'postgraduate',
    subCategory: 'MBA',
    facultyCode: 'GRAD',
    department: 'Department of Communication Studies',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/mba-corporate-communications/',
  },
  {
    name: 'Master of Business Administration in Marketing',
    level: 'postgraduate',
    subCategory: 'MBA',
    facultyCode: 'GRAD',
    department: 'Department of Marketing',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/mba-marketing/',
  },
  {
    name: 'Master of Business Administration in Internal Auditing',
    level: 'postgraduate',
    subCategory: 'MBA',
    facultyCode: 'GRAD',
    department: 'Department of Accounting',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/mba-internal-auditing/',
  },
  {
    name: 'Master of Business Administration in Petroleum Accounting & Finance',
    level: 'postgraduate',
    subCategory: 'MBA',
    facultyCode: 'GRAD',
    department: 'Department of Accounting',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/mba-petroleum-accounting-finance/',
  },
  {
    name: 'Master of Business Administration in Total Quality Management (TQM)',
    level: 'postgraduate',
    subCategory: 'MBA',
    facultyCode: 'GRAD',
    department: 'Department of Business Administration',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/mba-total-quality-management-tqm/',
  },
  {
    name: 'Master of Business Administration in Impact Entrepreneurship and Innovation',
    level: 'postgraduate',
    subCategory: 'MBA',
    facultyCode: 'GRAD',
    department: 'Department of Business Administration',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/mba-impact-entrepreneurship-and-innovation/',
  },
  {
    name: 'Master of Business Administration in Business Management',
    level: 'postgraduate',
    subCategory: 'MBA',
    facultyCode: 'GRAD',
    department: 'Department of Business Administration',
  },
  {
    name: 'Master of Business Administration in Management Information Systems',
    level: 'postgraduate',
    subCategory: 'MBA',
    facultyCode: 'GRAD',
    department: 'Department of Information Technology Studies',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/mba-management-information-systems/',
  },
  {
    name: 'Master of Business Administration in Leadership and Strategy',
    level: 'postgraduate',
    subCategory: 'MBA',
    facultyCode: 'GRAD',
    department: 'School of Graduate Studies',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/mba-leadership-and-strategy/',
  },

  // ── POSTGRADUATE: MSc PROGRAMMES ──
  {
    name: 'Master of Science in Applied Statistics',
    level: 'postgraduate',
    subCategory: 'MSc',
    facultyCode: 'GRAD',
    department: 'Department of Economics and Actuarial Science',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/msc-applied-statistics',
  },
  {
    name: 'Master of Science in Risk Management and Insurance',
    level: 'postgraduate',
    subCategory: 'MSc',
    facultyCode: 'GRAD',
    department: 'Department of Banking and Finance',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/msc-risk-management-insurance',
  },
  {
    name: 'Master of Science in Energy Economics and Finance',
    level: 'postgraduate',
    subCategory: 'MSc',
    facultyCode: 'GRAD',
    department: 'Department of Economics and Actuarial Science',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/msc-energy-economics-and-finance/',
  },
  {
    name: 'Master of Science in Leadership and Organisational Development',
    level: 'postgraduate',
    subCategory: 'MSc',
    facultyCode: 'GRAD',
    department: 'School of Graduate Studies',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/msc-leadership-and-organisational-development/',
  },
  {
    name: 'Master of Science in Procurement Management',
    level: 'postgraduate',
    subCategory: 'MSc',
    facultyCode: 'GRAD',
    department: 'Department of Business Administration',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/msc-procurement-management/',
  },
  {
    name: 'Master of Science in Pensions Management',
    level: 'postgraduate',
    subCategory: 'MSc',
    facultyCode: 'GRAD',
    department: 'Department of Banking and Finance',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/msc-pensions-management',
  },
  {
    name: 'Master of Science in Information Systems',
    level: 'postgraduate',
    subCategory: 'MSc',
    facultyCode: 'GRAD',
    department: 'Department of Information Technology Studies',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/msc-information-systems/',
  },
  {
    name: 'Master of Science in Information Security Management',
    level: 'postgraduate',
    subCategory: 'MSc',
    facultyCode: 'GRAD',
    department: 'Department of Information Technology Studies',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/msc-information-security-management/',
  },

  // ── POSTGRADUATE: MA PROGRAMMES ──
  {
    name: 'Master of Arts in Natural Resources and Climate Change Law',
    level: 'postgraduate',
    subCategory: 'MA',
    facultyCode: 'LAW',
    department: 'UPSA Law School',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/ma-natural-resources-and-climate-change-law/',
  },
  {
    name: 'Master of Arts in Peace, Security and Intelligence Management',
    level: 'postgraduate',
    subCategory: 'MA',
    facultyCode: 'GRAD',
    department: 'School of Graduate Studies',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/ma-peace-security-and-intelligence-management/',
  },
  {
    name: 'Master of Arts in Brands and Communications Management',
    level: 'postgraduate',
    subCategory: 'MA',
    facultyCode: 'FITCS',
    department: 'Department of Communication Studies',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/ma-brands-and-communications-management/',
  },
  {
    name: 'Master of Arts in Media & Digital Communication Management',
    level: 'postgraduate',
    subCategory: 'MA',
    facultyCode: 'FITCS',
    department: 'Department of Communication Studies',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/ma-media-and-digital-communication-management/',
  },
  {
    name: 'Master of Arts in Digital and Strategic Marketing Management',
    level: 'postgraduate',
    subCategory: 'MA',
    facultyCode: 'FMS',
    department: 'Department of Marketing',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/ma-digital-and-strategic-marketing-management/',
  },

  // ── POSTGRADUATE: LLM PROGRAMMES ──
  {
    name: 'Master of Laws (LLM) in Competition and Consumer Protection Law',
    level: 'postgraduate',
    subCategory: 'LLM',
    facultyCode: 'LAW',
    department: 'UPSA Law School',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/llm-competition-and-consumer-protection-law/',
  },
  {
    name: 'Master of Laws (LLM) in International Business And Commercial Law',
    level: 'postgraduate',
    subCategory: 'LLM',
    facultyCode: 'LAW',
    department: 'UPSA Law School',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/llm-international-business-and-commercial-law/',
  },
  {
    name: 'Master of Laws (LLM) in Natural Resources and Climate Change Law',
    level: 'postgraduate',
    subCategory: 'LLM',
    facultyCode: 'LAW',
    department: 'UPSA Law School',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/postgraduate/llm-natural-resources-and-climate-change-law/',
  },

  // ── PROFESSIONAL PROGRAMMES ──
  {
    name: 'Chartered Institute of Marketing Ghana (CIMG)',
    level: 'professional',
    subCategory: 'Professional',
    facultyCode: 'IPS',
    department: 'Institute of Professional Studies',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/professional/cimg/',
    isProfessional: true,
  },
  {
    name: 'Chartered Institute of Human Resource Management (CIHRM)',
    level: 'professional',
    subCategory: 'Professional',
    facultyCode: 'IPS',
    department: 'Institute of Professional Studies',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/professional/cihrmg',
    isProfessional: true,
  },
  {
    name: 'Institute Of Project Management Professional, Ghana (IPMPG)',
    level: 'professional',
    subCategory: 'Professional',
    facultyCode: 'IPS',
    department: 'Institute of Professional Studies',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/professional/ipmpg/',
    isProfessional: true,
  },
  {
    name: 'Institute of Chartered Accountants, Ghana (ICAG)',
    level: 'professional',
    subCategory: 'Professional',
    facultyCode: 'IPS',
    department: 'Institute of Professional Studies',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/professional/icag/',
    isProfessional: true,
  },
  {
    name: 'Association of Certified Chartered Accountants (ACCA-UK)',
    level: 'professional',
    subCategory: 'Professional',
    facultyCode: 'IPS',
    department: 'Institute of Professional Studies',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/professional/acca-uk/',
    isProfessional: true,
  },
  {
    name: 'Chartered Institute of Management Accountant (CIMA-UK)',
    level: 'professional',
    subCategory: 'Professional',
    facultyCode: 'IPS',
    department: 'Institute of Professional Studies',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/professional/cima-uk/',
    isProfessional: true,
  },
  {
    name: 'Chartered Institute of Marketing (CIM), UK',
    level: 'professional',
    subCategory: 'Professional',
    facultyCode: 'IPS',
    department: 'Institute of Professional Studies',
    admissionsUrl: 'https://admissions.upsa.edu.gh/admissions/professional/cim/',
    isProfessional: true,
  },
];

export const UPSA_FACULTIES: UPSAFaculty[] = [
  {
    code: 'FAF',
    name: 'Faculty of Accounting and Finance',
    shortName: 'Accounting & Finance',
    description: 'Premier training for chartered accountants, bankers, financial analysts, and economists.',
    departments: [
      { code: 'ACC', name: 'Department of Accounting' },
      { code: 'BF', name: 'Department of Banking and Finance' },
      { code: 'EAS', name: 'Department of Economics and Actuarial Science' },
    ],
    programmes: UPSA_PROGRAMMES_CATALOG.filter((p) => p.facultyCode === 'FAF').map((p) => p.name),
  },
  {
    code: 'FMS',
    name: 'Faculty of Management Studies',
    shortName: 'Management Studies',
    description: 'Nurturing innovative managers, marketers, HR directors, logistics leaders, and entrepreneurs.',
    departments: [
      { code: 'BA', name: 'Department of Business Administration' },
      { code: 'MKT', name: 'Department of Marketing' },
    ],
    programmes: UPSA_PROGRAMMES_CATALOG.filter((p) => p.facultyCode === 'FMS').map((p) => p.name),
  },
  {
    code: 'FITCS',
    name: 'Faculty of Information Technology and Communication Studies',
    shortName: 'IT & Communication',
    description: 'Leading digital transformation, computing, software engineering, and corporate communications. Also houses the Language Centre.',
    departments: [
      { code: 'IT', name: 'Department of Information Technology Studies' },
      { code: 'COMM', name: 'Department of Communication Studies' },
      { code: 'LANG', name: 'Language Centre' },
    ],
    programmes: UPSA_PROGRAMMES_CATALOG.filter((p) => p.facultyCode === 'FITCS').map((p) => p.name),
  },
  {
    code: 'LAW',
    name: 'UPSA Law School',
    shortName: 'Law School',
    description: 'Premier legal education focusing on commercial, constitutional, energy, and international law.',
    departments: [
      { code: 'LAW_MAIN', name: 'UPSA Law School' },
    ],
    programmes: UPSA_PROGRAMMES_CATALOG.filter((p) => p.facultyCode === 'LAW').map((p) => p.name),
  },
  {
    code: 'GRAD',
    name: 'School of Graduate Studies',
    shortName: 'Graduate Studies',
    description: 'Executive MBA, academic master degrees (MPhil, MSc, MA), and doctoral research (PhD) in professional studies.',
    departments: [
      { code: 'GRAD_MAIN', name: 'School of Graduate Studies' },
    ],
    programmes: UPSA_PROGRAMMES_CATALOG.filter((p) => p.facultyCode === 'GRAD').map((p) => p.name),
  },
  {
    code: 'IPS',
    name: 'Institute of Professional Studies (IPS)',
    shortName: 'Professional Studies',
    description: 'Professional body qualifications (ICAG, ACCA, CIMA, CIMG, CIHRM, IPMPG, CIM-UK) and executive leadership credentials.',
    departments: [
      { code: 'IPS_MAIN', name: 'Institute of Professional Studies' },
    ],
    programmes: UPSA_PROGRAMMES_CATALOG.filter((p) => p.facultyCode === 'IPS').map((p) => p.name),
  },
];

export const ALL_UPSA_PROGRAMMES = UPSA_PROGRAMMES_CATALOG.map((p) => p.name);

export interface AcademicProgressionLevel {
  value: number;
  label: string;
}

/**
 * Returns dynamic progression levels tailored to the chosen UPSA programme / qualification tier.
 */
export function getProgressionLevelsForProgramme(
  programmeName?: string | null
): AcademicProgressionLevel[] {
  if (!programmeName) {
    return [
      { value: 100, label: 'Level 100' },
      { value: 200, label: 'Level 200' },
      { value: 300, label: 'Level 300' },
      { value: 400, label: 'Level 400' },
    ];
  }

  const pLower = programmeName.toLowerCase().trim();

  // 1. Diploma Programmes (Level 100 – 200)
  if (pLower.startsWith('diploma') || pLower.includes('diploma in')) {
    return [
      { value: 100, label: 'Level 100' },
      { value: 200, label: 'Level 200' },
    ];
  }

  // 2. Post-First Degree 3-Year LLB (Year 1 – 3)
  if (pLower.includes('post-first degree') || pLower.includes('3-year llb')) {
    return [
      { value: 1, label: 'Year 1' },
      { value: 2, label: 'Year 2' },
      { value: 3, label: 'Year 3' },
    ];
  }

  // 3. 1-Year Master's (MA, MSc, LLM) (Year 1)
  if (
    pLower.startsWith('master of arts') ||
    pLower.startsWith('ma ') ||
    pLower.startsWith('master of science') ||
    pLower.startsWith('msc ') ||
    pLower.startsWith('master of laws') ||
    pLower.startsWith('llm')
  ) {
    return [
      { value: 1, label: 'Year 1' },
    ];
  }

  // 4. 2-Year Master's (MBA, MPhil) (Year 1 – 2)
  if (
    pLower.startsWith('master of business administration') ||
    pLower.startsWith('mba') ||
    pLower.startsWith('master of philosophy') ||
    pLower.startsWith('mphil')
  ) {
    return [
      { value: 1, label: 'Year 1' },
      { value: 2, label: 'Year 2' },
    ];
  }

  // 5. Doctoral Programmes (PhD) (Year 1 – 4)
  if (pLower.startsWith('doctor of philosophy') || pLower.includes('phd')) {
    return [
      { value: 1, label: 'Year 1' },
      { value: 2, label: 'Year 2' },
      { value: 3, label: 'Year 3' },
      { value: 4, label: 'Year 4' },
    ];
  }

  // 6. Professional Programmes (ICAG, ACCA, CIMA, CIM, CIB, CIHRM, IPMPG)
  if (pLower.includes('cima') || pLower.includes('management accountant')) {
    return [
      { value: 1, label: 'Level 1 (Certificate)' },
      { value: 2, label: 'Level 2 (Management)' },
      { value: 3, label: 'Level 3 (Strategic)' },
      { value: 4, label: 'Level 4 (Professional)' },
    ];
  }

  if (
    pLower.includes('icag') ||
    pLower.includes('acca') ||
    pLower.includes('cimg') ||
    pLower.includes('chartered') ||
    pLower.includes('cihrm') ||
    pLower.includes('ipmpg') ||
    pLower.includes('institute')
  ) {
    return [
      { value: 1, label: 'Level 1 (Part 1)' },
      { value: 2, label: 'Level 2 (Part 2)' },
      { value: 3, label: 'Level 3 (Part 3)' },
    ];
  }

  // 7. Standard Undergraduate degrees (BSc, BA, BBA, 4-Year LLB) (Level 100 – 400)
  return [
    { value: 100, label: 'Level 100' },
    { value: 200, label: 'Level 200' },
    { value: 300, label: 'Level 300' },
    { value: 400, label: 'Level 400' },
  ];
}

/**
 * Smart collegiate academic level formatter conditioned on programme qualification tier
 */
export function formatAcademicLevel(
  year: string | number | null | undefined,
  programmeName?: string | null
): string {
  if (!year && year !== 0) return 'Scholar';
  const num = typeof year === 'string' ? parseInt(year, 10) : Number(year);
  if (isNaN(num) || num <= 0) return 'Scholar';

  const pLower = (programmeName || '').toLowerCase().trim();

  // 1. Professional Body Programmes
  if (
    pLower.includes('icag') ||
    pLower.includes('acca') ||
    pLower.includes('cima') ||
    pLower.includes('cimg') ||
    pLower.includes('chartered') ||
    pLower.includes('cihrm') ||
    pLower.includes('ipmpg')
  ) {
    const partNum = num > 10 ? Math.floor(num / 100) : num;
    return `Part ${partNum} / Level ${partNum}`;
  }

  // 2. Postgraduate (PhD, MBA, MPhil, MSc, MA, LLM) or 3-Year LLB
  if (
    pLower.includes('doctor') ||
    pLower.includes('phd') ||
    pLower.includes('master') ||
    pLower.includes('mba') ||
    pLower.includes('mphil') ||
    pLower.includes('msc') ||
    pLower.includes('post-first degree') ||
    pLower.includes('llm')
  ) {
    const yearNum = num > 10 ? Math.floor(num / 100) : num;
    return `Year ${yearNum}`;
  }

  // 3. Undergraduate & Diploma: Level 100 - 400
  if (num <= 6) return `Level ${num * 100}`;
  return `Level ${num}`;
}

/**
 * Checks whether an email is a verified UPSA institutional email address
 */
export function isUPSAEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const lower = email.toLowerCase().trim();
  return UPSA_INSTITUTION.domains.some((d) => lower.endsWith(`@${d}`));
}
