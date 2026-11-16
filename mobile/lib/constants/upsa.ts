export const UPSA_INSTITUTION = {
  id: '00000000-0000-0000-0000-000000007054',
  name: 'University of Professional Studies, Accra',
  short_name: 'UPSA',
  abbreviation: 'UPSA',
  country: 'Ghana',
  domain: 'upsamail.edu.gh',
  moodle_url: 'https://upsavirtual.site',
  moodle_login_url: 'https://upsavirtual.site/login/index.php',
  moodle_api_endpoint: 'https://upsavirtual.site/webservice/rest/server.php',
  verified: true,
} as const;

export const UPSA_LEVELS = [
  { level: 100, label: 'Level 100 (Freshman / First Year)' },
  { level: 200, label: 'Level 200 (Sophomore / Second Year)' },
  { level: 300, label: 'Level 300 (Junior / Third Year)' },
  { level: 400, label: 'Level 400 (Senior / Final Year)' },
  { level: 500, label: 'Level 500 / Postgrad / Law' },
] as const;

export interface UPSAFaculty {
  code: string;
  name: string;
  departments: string[];
  programmes: string[];
}

export const UPSA_FACULTIES: UPSAFaculty[] = [
  {
    code: 'FITCS',
    name: 'Faculty of Information Technology and Communication Studies',
    departments: [
      'Department of Information Technology',
      'Department of Communication Studies',
    ],
    programmes: [
      'BSc Information Technology Management',
      'BSc Business Information Systems',
      'BA Communication Studies',
      'BA Public Relations Management',
      'Diploma in Information Technology Management',
      'Diploma in Public Relations',
    ],
  },
  {
    code: 'FAF',
    name: 'Faculty of Accounting and Finance',
    departments: [
      'Department of Accounting',
      'Department of Banking and Finance',
    ],
    programmes: [
      'BSc Accounting',
      'BSc Accounting and Finance',
      'BSc Actuarial Science',
      'BSc Banking and Finance',
      'Diploma in Accounting',
    ],
  },
  {
    code: 'FMS',
    name: 'Faculty of Management Studies',
    departments: [
      'Department of Business Administration',
      'Department of Marketing',
    ],
    programmes: [
      'BBA Bachelor of Business Administration',
      'BSc Marketing',
    ],
  },
  {
    code: 'LAW',
    name: 'UPSA Law School',
    departments: [
      'Department of Public Law',
      'Department of Private and Commercial Law',
    ],
    programmes: [
      'Bachelor of Laws (LL.B.) - 4 Year Programme',
      'Bachelor of Laws (LL.B.) - 3 Year Post-First Degree',
    ],
  },
  {
    code: 'GRAD',
    name: 'School of Graduate Studies',
    departments: [
      'Department of Postgraduate Studies',
    ],
    programmes: [
      'MBA Accounting and Finance',
      'MBA Corporate Governance',
      'MBA Marketing',
      'MSc Information Technology and Management',
      'MA Brand and Communications Management',
      'MSc Procurement Management',
    ],
  },
];
