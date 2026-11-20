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
  { level: 100, label: 'Level 100' },
  { level: 200, label: 'Level 200' },
  { level: 300, label: 'Level 300' },
  { level: 400, label: 'Level 400' },
  { level: 500, label: 'Level 500' },
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
      'BSc Computer Science',
      'BSc Data Science and Analytics',
      'BSc Business Information Systems',
      'BA Communication Studies',
      'BA Public Relations Management',
      'BA Applied French and Communication',
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
      'Department of Economics and Actuarial Science',
    ],
    programmes: [
      'BSc Accounting',
      'BSc Accounting and Finance',
      'BSc Banking and Finance',
      'BSc Business Economics',
      'BSc Actuarial Science',
      'BSc Agribusiness and Finance',
      'BSc Applied Statistics',
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
      'Bachelor of Business Administration (BBA)',
      'BSc Marketing',
      'BSc Applied Marketing',
      'BSc Human Resource Management',
      'BSc Logistics and Supply Chain Management',
      'BSc Logistics and Transport Management',
      'BSc Real Estate Management and Finance',
      'Diploma in Marketing',
      'Diploma in Management Studies',
    ],
  },
  {
    code: 'LAW',
    name: 'UPSA Law School',
    departments: [
      'Department of Private and Commercial Law',
      'Department of Public and International Law',
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
    departments: [
      'Department of Postgraduate Business',
      'Department of Postgraduate Technology & Leadership',
      'Office of Doctoral Programmes',
    ],
    programmes: [
      'MBA Accounting and Finance',
      'MBA Auditing',
      'MBA Corporate Governance',
      'MBA Marketing',
      'MBA Petroleum Accounting and Finance',
      'MBA Internal Auditing',
      'MSc Information Technology Management',
      'MSc Leadership',
      'MSc Procurement Management',
      'MSc Insurance and Risk Management',
      'MPhil Accounting',
      'MPhil Finance',
      'MPhil Leadership',
      'PhD in Marketing',
      'PhD in Accounting',
      'PhD in Management',
    ],
  },
  {
    code: 'IPS',
    name: 'Institute of Professional Studies',
    departments: [
      'Department of Professional Accounting & Finance',
      'Department of Professional Marketing & Logistics',
    ],
    programmes: [
      'Institute of Chartered Accountants, Ghana (ICAG)',
      'Association of Chartered Certified Accountants (ACCA)',
      'Chartered Institute of Management Accountants (CIMA)',
      'Chartered Institute of Marketing (CIM - UK / Ghana)',
      'Chartered Institute of Logistics and Transport (CILT)',
      'Chartered Institute of Bankers (CIB)',
      'Chartered Institute of Administrators and Management Consultants (CIAMC)',
    ],
  },
  {
    code: 'DLS',
    name: 'Distance Learning School',
    departments: [
      'Department of E-Learning & Virtual Studies',
    ],
    programmes: [
      'BSc Accounting (Distance)',
      'BSc Information Technology Management (Distance)',
      'Bachelor of Business Administration (Distance)',
      'BSc Marketing (Distance)',
      'Diploma in Accounting (Distance)',
      'Diploma in Management Studies (Distance)',
    ],
  },
];

