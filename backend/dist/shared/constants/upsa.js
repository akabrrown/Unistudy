"use strict";
/**
 * Canonical Academic Structure & Constants for UPSA (University of Professional Studies, Accra)
 * UniStudy is strictly dedicated to UPSA students, faculties, and academic curriculum.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_UPSA_PROGRAMMES = exports.UPSA_FACULTIES = exports.UPSA_LEVELS = exports.UPSA_INSTITUTION = void 0;
exports.isUPSAEmail = isUPSAEmail;
exports.UPSA_INSTITUTION = {
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
};
exports.UPSA_LEVELS = [
    { value: 100, label: 'Level 100' },
    { value: 200, label: 'Level 200' },
    { value: 300, label: 'Level 300' },
    { value: 400, label: 'Level 400' },
    { value: 500, label: 'Level 500' },
];
exports.UPSA_FACULTIES = [
    {
        code: 'FITCS',
        name: 'Faculty of Information Technology and Communication Studies',
        shortName: 'IT & Communication',
        description: 'Leading digital transformation, computing, software engineering, and corporate communications.',
        departments: [
            { code: 'IT', name: 'Department of Information Technology' },
            { code: 'COMM', name: 'Department of Communication Studies' },
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
        shortName: 'Accounting & Finance',
        description: 'Premier training for chartered accountants, investment bankers, and actuarial analysts.',
        departments: [
            { code: 'ACC', name: 'Department of Accounting' },
            { code: 'BF', name: 'Department of Banking and Finance' },
            { code: 'EAS', name: 'Department of Economics and Actuarial Science' },
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
        shortName: 'Management Studies',
        description: 'Nurturing innovative managers, marketers, HR directors, and entrepreneurs.',
        departments: [
            { code: 'BA', name: 'Department of Business Administration' },
            { code: 'MKT', name: 'Department of Marketing' },
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
        shortName: 'Law School',
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
            { code: 'DOC', name: 'Office of Doctoral Programmes' },
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
        shortName: 'Professional Studies (IPS)',
        description: 'Professional body qualifications and executive leadership credentials.',
        departments: [
            { code: 'PROF_ACC', name: 'Department of Professional Accounting & Finance' },
            { code: 'PROF_MGT', name: 'Department of Professional Marketing & Logistics' },
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
        shortName: 'Distance Learning',
        description: 'Accredited undergraduate and diploma distance education programmes.',
        departments: [
            { code: 'ELEARN', name: 'Department of E-Learning & Virtual Studies' },
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
exports.ALL_UPSA_PROGRAMMES = exports.UPSA_FACULTIES.flatMap((f) => f.programmes);
/**
 * Checks whether an email is a verified UPSA institutional email address
 */
function isUPSAEmail(email) {
    if (!email || typeof email !== 'string')
        return false;
    const lower = email.toLowerCase().trim();
    return exports.UPSA_INSTITUTION.domains.some((d) => lower.endsWith(`@${d}`));
}
