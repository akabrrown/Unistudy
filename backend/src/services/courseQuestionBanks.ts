import { supabaseAdmin } from '../lib/supabase';
import { normalizeCourseCode, syncRealMoodlePastPapers } from './moodleCrawler';
import { TTLCache } from '../../../shared/lib/cpuOptimization';

const seededUserCoursesCache = new TTLCache<boolean>(10 * 60 * 1000, 500);

export interface DefaultQuestion {
  question_number: string;
  text_content: string;
  extracted_topic: string; // "MCQ|Topic" or "THEORY|Topic"
  marks_available: number;
}

const COURSE_EXAM_TEMPLATES: Record<string, { title: string; questions: DefaultQuestion[] }> = {
  BSIT315: {
    title: 'Web Development 2',
    questions: [
      {
        question_number: '1',
        text_content: 'In modern Node.js and Express server architectures, what is the primary role of middleware functions in the request-response cycle?\nA. They compile server-side TypeScript code into WebAssembly\nB. They execute code, modify req/res objects, end request cycles, or call next()\nC. They directly establish WebSocket connections for client-side state\nD. They replace SQL query optimizers in the database tier',
        extracted_topic: 'MCQ|Express Architecture & Middleware',
        marks_available: 1,
      },
      {
        question_number: '2',
        text_content: 'Which HTTP status code is most appropriate when a client request lacks valid authentication credentials for a protected REST API resource?\nA. 400 Bad Request\nB. 401 Unauthorized\nC. 403 Forbidden\nD. 404 Not Found',
        extracted_topic: 'MCQ|REST API Protocols & HTTP Statuses',
        marks_available: 1,
      },
      {
        question_number: '3',
        text_content: 'Which mechanism is considered the gold standard for protecting web applications against Cross-Site Request Forgery (CSRF) in state-changing operations?\nA. Storing session tokens in browser localStorage\nB. Utilizing anti-CSRF tokens with SameSite=Lax/Strict cookie flags\nC. Enabling CORS with Access-Control-Allow-Origin: *\nD. Using MD5 hashing on form inputs',
        extracted_topic: 'MCQ|Web Application Security & CSRF',
        marks_available: 1,
      },
      {
        question_number: '4',
        text_content: 'What is the main advantage of Server-Side Rendering (SSR) in frameworks like Next.js over traditional Client-Side Rendered (CSR) Single Page Applications?\nA. Completely eliminates the need for client-side JavaScript execution\nB. Faster First Contentful Paint (FCP) and superior SEO indexability\nC. Prevents SQL injection vulnerabilities in database queries\nD. Reduces server CPU load compared to static file serving',
        extracted_topic: 'MCQ|Frontend Frameworks & SSR vs CSR',
        marks_available: 1,
      },
      {
        question_number: '5',
        text_content: 'Explain the difference between authentication and authorization in web systems. Describe how JSON Web Tokens (JWT) are structured and explain why sensitive secrets should never be placed in the JWT payload.',
        extracted_topic: 'THEORY|Authentication & JWT Architecture',
        marks_available: 10,
      },
      {
        question_number: '6',
        text_content: 'Write an Express.js route handler and corresponding database query to retrieve a paginated list of students enrolled in a specific course. Implement input validation, parameter sanitization, and structured error handling.',
        extracted_topic: 'THEORY|Backend API Implementation & Pagination',
        marks_available: 15,
      },
    ],
  },
  BSIT301: {
    title: 'Programming 2',
    questions: [
      {
        question_number: '1',
        text_content: 'Which Object-Oriented Programming principle allows a single interface to represent different underlying forms (data types)?\nA. Encapsulation\nB. Polymorphism\nC. Abstraction\nD. Composition',
        extracted_topic: 'MCQ|OOP Principles & Polymorphism',
        marks_available: 1,
      },
      {
        question_number: '2',
        text_content: 'What is the worst-case time complexity of searching for an element in an unbalanced Binary Search Tree (BST) with n nodes?\nA. O(1)\nB. O(log n)\nC. O(n)\nD. O(n log n)',
        extracted_topic: 'MCQ|Data Structures & Trees',
        marks_available: 1,
      },
      {
        question_number: '3',
        text_content: 'Which collection type enforces uniqueness of elements and provides average O(1) time complexity for insertions and lookups?\nA. LinkedList\nB. ArrayList\nC. HashSet\nD. PriorityQueue',
        extracted_topic: 'MCQ|Collections & Hash Tables',
        marks_available: 1,
      },
      {
        question_number: '4',
        text_content: 'Differentiate between method overloading and method overriding in Object-Oriented Programming. Provide concise code examples illustrating both concepts and specify when compile-time versus runtime binding occurs.',
        extracted_topic: 'THEORY|OOP Method Binding & Inheritance',
        marks_available: 10,
      },
      {
        question_number: '5',
        text_content: 'Design and implement a generic Stack data structure supporting push, pop, peek, and isEmpty operations. Include proper boundary checks and custom exception handling for stack underflow.',
        extracted_topic: 'THEORY|Data Structures Implementation & Generics',
        marks_available: 15,
      },
    ],
  },
  BSIT303: {
    title: 'Database Management 2',
    questions: [
      {
        question_number: '1',
        text_content: 'A relation is in Boyce-Codd Normal Form (BCNF) if and only if for every non-trivial functional dependency X -> Y:\nA. Y is a prime attribute\nB. X is a superkey\nC. X is in 2NF\nD. Y is non-transitive',
        extracted_topic: 'MCQ|Database Normalization & BCNF',
        marks_available: 1,
      },
      {
        question_number: '2',
        text_content: 'Which ACID property guarantees that once a transaction has committed, its changes survive system crashes and power failures?\nA. Atomicity\nB. Consistency\nC. Isolation\nD. Durability',
        extracted_topic: 'MCQ|Transaction Management & ACID',
        marks_available: 1,
      },
      {
        question_number: '3',
        text_content: 'What type of index is most effective for speeding up range queries (e.g., WHERE age BETWEEN 20 AND 30)?\nA. Hash Index\nB. B-Tree Index\nC. Bitmap Index\nD. Full-text Index',
        extracted_topic: 'MCQ|Indexing & Query Optimization',
        marks_available: 1,
      },
      {
        question_number: '4',
        text_content: 'Explain the Two-Phase Locking (2PL) protocol. Differentiate between Growing Phase and Shrinking Phase, and discuss how Strict 2PL prevents cascading rollbacks in concurrent transaction schedules.',
        extracted_topic: 'THEORY|Concurrency Control & 2PL',
        marks_available: 10,
      },
      {
        question_number: '5',
        text_content: 'Given an unnormalized university dataset containing StudentID, StudentName, CourseCode, CourseTitle, LecturerID, and LecturerRoom: deconstruct the relation step-by-step into 1NF, 2NF, and 3NF, clearly showing functional dependencies at each step.',
        extracted_topic: 'THEORY|Schema Normalization 1NF to 3NF',
        marks_available: 15,
      },
    ],
  },
  BSIT309: {
    title: 'Information System Security',
    questions: [
      {
        question_number: '1',
        text_content: 'In asymmetric public-key cryptography, if Alice wants to send a confidential encrypted message to Bob that only Bob can read, whose key does she use to encrypt?\nA. Alice\'s private key\nB. Alice\'s public key\nC. Bob\'s public key\nD. Bob\'s private key',
        extracted_topic: 'MCQ|Public Key Cryptography & PKI',
        marks_available: 1,
      },
      {
        question_number: '2',
        text_content: 'Which category of cyberattack involves intercepting and potentially altering communications between two parties without their knowledge?\nA. Denial of Service (DoS)\nB. Man-in-the-Middle (MitM)\nC. SQL Injection\nD. Cross-Site Scripting (XSS)',
        extracted_topic: 'MCQ|Network Attack Vectors & MitM',
        marks_available: 1,
      },
      {
        question_number: '3',
        text_content: 'Explain the three components of the CIA Triad (Confidentiality, Integrity, Availability). For each component, provide one practical technical control used in enterprise environments to enforce it.',
        extracted_topic: 'THEORY|CIA Triad & Enterprise Controls',
        marks_available: 10,
      },
      {
        question_number: '4',
        text_content: 'Analyze SQL Injection and Cross-Site Scripting (XSS) vulnerabilities. Explain how parameterized queries prevent SQLi and how Content Security Policy (CSP) together with context-aware output encoding prevents XSS.',
        extracted_topic: 'THEORY|Application Vulnerability Remediation',
        marks_available: 15,
      },
    ],
  },
  BCPC201: {
    title: 'Principles of Leadership',
    questions: [
      {
        question_number: '1',
        text_content: 'Which leadership style is characterized by inspiring and motivating followers to transcend personal interests for the good of the organization through vision, charisma, and intellectual stimulation?\nA. Laissez-faire\nB. Transactional\nC. Transformational\nD. Autocratic',
        extracted_topic: 'MCQ|Leadership Theories & Transformational Leadership',
        marks_available: 1,
      },
      {
        question_number: '2',
        text_content: 'According to the Situational Leadership model (Hersey & Blanchard), what should a leader adjust based on follower readiness and competence?\nA. Task behavior and relationship behavior\nB. Legal authority and institutional mandate\nC. Salary structure and disciplinary actions\nD. Organizational vision and corporate values',
        extracted_topic: 'MCQ|Situational Leadership Models',
        marks_available: 1,
      },
      {
        question_number: '3',
        text_content: 'Compare and contrast Transactional and Transformational leadership in modern corporate governance. Discuss the circumstances under which transactional leadership may still prove effective.',
        extracted_topic: 'THEORY|Leadership Models in Governance',
        marks_available: 10,
      },
      {
        question_number: '4',
        text_content: 'Discuss the role of emotional intelligence (EQ) in conflict resolution and strategic change management within Ghanaian tertiary institutions and enterprises.',
        extracted_topic: 'THEORY|Emotional Intelligence & Conflict Resolution',
        marks_available: 12,
      },
    ],
  },
  BITM309: {
    title: 'Research Method',
    questions: [
      {
        question_number: '1',
        text_content: 'Which sampling technique gives every member of the target population an equal and known chance of selection?\nA. Convenience Sampling\nB. Simple Random Sampling\nC. Purposive Sampling\nD. Snowball Sampling',
        extracted_topic: 'MCQ|Research Sampling Methodologies',
        marks_available: 1,
      },
      {
        question_number: '2',
        text_content: 'What type of research design is primarily concerned with establishing cause-and-effect relationships between independent and dependent variables?\nA. Exploratory Research\nB. Experimental Research\nC. Descriptive Research\nD. Historical Research',
        extracted_topic: 'MCQ|Research Designs & Causality',
        marks_available: 1,
      },
      {
        question_number: '3',
        text_content: 'Explain the key distinctions between Quantitative and Qualitative research methodologies in information systems research, covering data collection instruments, analysis techniques, and epistemological assumptions.',
        extracted_topic: 'THEORY|Quantitative vs Qualitative Paradigms',
        marks_available: 10,
      },
      {
        question_number: '4',
        text_content: 'Formulate a problem statement, research questions, and corresponding null and alternative hypotheses for an empirical study investigating the impact of AI-assisted learning on student academic performance at UPSA.',
        extracted_topic: 'THEORY|Research Formulation & Hypotheses',
        marks_available: 15,
      },
    ],
  },
  DIPT052: {
    title: 'Essentials of IT Project Management',
    questions: [
      {
        question_number: '1',
        text_content: 'In project management, the Triple Constraint (Project Iron Triangle) traditionally consists of which three interconnected variables?\nA. People, Process, Technology\nB. Scope, Time, Cost\nC. Quality, Ethics, Revenue\nD. Risk, Stakeholders, Procurement',
        extracted_topic: 'MCQ|Triple Constraint & Scope Management',
        marks_available: 1,
      },
      {
        question_number: '2',
        text_content: 'What is the primary purpose of constructing a Work Breakdown Structure (WBS)?\nA. To calculate tax obligations of team members\nB. To decompose project deliverables into smaller, manageable work packages\nC. To define marketing strategies for project deliverables\nD. To enforce disciplinary procedures for delayed milestones',
        extracted_topic: 'MCQ|Work Breakdown Structure (WBS)',
        marks_available: 1,
      },
      {
        question_number: '3',
        text_content: 'In Agile Scrum methodologies, who is responsible for maximizing the value of the product resulting from the work of the Development Team?\nA. Scrum Master\nB. Product Owner\nC. Project Sponsor\nD. Quality Assurance Lead',
        extracted_topic: 'MCQ|Agile & Scrum Roles',
        marks_available: 1,
      },
      {
        question_number: '4',
        text_content: 'Compare the Predictive (Waterfall) and Adaptive (Agile) project lifecycle methodologies. Under what project conditions and requirements certainty would an IT project manager choose Waterfall over Agile?',
        extracted_topic: 'THEORY|Waterfall vs Agile Methodologies',
        marks_available: 10,
      },
      {
        question_number: '5',
        text_content: 'Explain the Critical Path Method (CPM). Given a project network diagram with estimated task durations, explain how slack (float) is calculated and why delays on the critical path directly impact the final project delivery date.',
        extracted_topic: 'THEORY|Critical Path Method & Schedule Risk',
        marks_available: 15,
      },
    ],
  },
  DIPT056: {
    title: 'IT Service Management',
    questions: [
      {
        question_number: '1',
        text_content: 'According to ITIL 4, what is an unplanned interruption to a service or reduction in the quality of a service called?\nA. Problem\nB. Incident\nC. Change\nD. Event',
        extracted_topic: 'MCQ|ITIL 4 Terminology & Incidents',
        marks_available: 1,
      },
      {
        question_number: '2',
        text_content: 'What is the primary objective of Problem Management in IT Service Management?\nA. To restore normal service operation as quickly as possible\nB. To prevent incidents and resulting problems, and minimize the impact of incidents that cannot be prevented\nC. To bill users for monthly infrastructure consumption\nD. To test new software features in user acceptance environments',
        extracted_topic: 'MCQ|Incident vs Problem Management',
        marks_available: 1,
      },
      {
        question_number: '3',
        text_content: 'A legally binding or formal agreement between an IT service provider and a customer specifying expected service levels and metrics is known as:\nA. OLA (Operational Level Agreement)\nB. SLA (Service Level Agreement)\nC. Underpinning Contract (UC)\nD. Non-Disclosure Agreement (NDA)',
        extracted_topic: 'MCQ|Service Level Agreements (SLAs)',
        marks_available: 1,
      },
      {
        question_number: '4',
        text_content: 'Detail the ITIL Service Value System (SVS). Explain the purpose of Guiding Principles such as "Focus on Value", "Start Where You Are", and "Collaborate and Promote Visibility".',
        extracted_topic: 'THEORY|ITIL 4 Service Value System',
        marks_available: 10,
      },
      {
        question_number: '5',
        text_content: 'Describe the complete lifecycle of Change Enablement (Change Management). How does an enterprise balance the need for rapid digital deployment with the risk of service degradation?',
        extracted_topic: 'THEORY|Change Enablement & Risk Governance',
        marks_available: 12,
      },
    ],
  },
  DIPT050: {
    title: 'Project Work',
    questions: [
      {
        question_number: '1',
        text_content: 'Which phase of the Systems Development Life Cycle (SDLC) is primarily concerned with gathering, clarifying, and documenting stakeholder needs?\nA. Design Phase\nB. Requirements Analysis Phase\nC. Implementation Phase\nD. Maintenance Phase',
        extracted_topic: 'MCQ|SDLC & Requirements Engineering',
        marks_available: 1,
      },
      {
        question_number: '2',
        text_content: 'Which UML diagram is best suited for modeling dynamic interactions between objects across a chronological timeline?\nA. Class Diagram\nB. Sequence Diagram\nC. Use Case Diagram\nD. Component Diagram',
        extracted_topic: 'MCQ|UML Modeling & Sequence Diagrams',
        marks_available: 1,
      },
      {
        question_number: '3',
        text_content: 'Explain the purpose and structure of a Software Requirements Specification (SRS) document according to IEEE 830 standards. Differentiate between functional and non-functional requirements.',
        extracted_topic: 'THEORY|SRS Documentation & Requirements Types',
        marks_available: 10,
      },
      {
        question_number: '4',
        text_content: 'Present the architecture and database schema for an automated student examination portal. Detail how you would implement unit testing, integration testing, and deployment automation.',
        extracted_topic: 'THEORY|System Architecture & Quality Assurance',
        marks_available: 15,
      },
    ],
  },
  DIPT058: {
    title: 'Introduction to Management Information Systems',
    questions: [
      {
        question_number: '1',
        text_content: 'Which type of information system is designed to support middle managers with monitoring, controlling, and decision-making by providing routine summary reports?\nA. Transaction Processing Systems (TPS)\nB. Management Information Systems (MIS)\nC. Executive Support Systems (ESS)\nD. Expert Systems',
        extracted_topic: 'MCQ|Information Systems Hierarchy',
        marks_available: 1,
      },
      {
        question_number: '2',
        text_content: 'Enterprise Resource Planning (ERP) systems primarily provide value to organizations by:\nA. Providing free social media advertising to consumers\nB. Integrating all functional business areas into a single, cohesive database system\nC. Eliminating the need for internet security software\nD. Replacing human customer support representatives completely',
        extracted_topic: 'MCQ|Enterprise Systems & ERP',
        marks_available: 1,
      },
      {
        question_number: '3',
        text_content: 'Explain Porter\'s Five Forces Model and describe how modern information technology can be utilized strategically to counter competitive forces in the Ghanaian retail or telecommunications sector.',
        extracted_topic: 'THEORY|Competitive Advantage & Porter\'s Model',
        marks_available: 10,
      },
      {
        question_number: '4',
        text_content: 'Discuss the security, privacy, and ethical issues associated with big data analytics and cloud storage in enterprise information management.',
        extracted_topic: 'THEORY|Data Ethics, Cloud & Information Privacy',
        marks_available: 12,
      },
    ],
  },
  DIPT062: {
    title: 'Computer and Information Security',
    questions: [
      {
        question_number: '1',
        text_content: 'What cryptographic hash function attribute ensures that it is computationally infeasible to find any two distinct inputs that produce the same hash output?\nA. Pre-image resistance\nB. Collision resistance\nC. Non-repudiation\nD. Entropy distribution',
        extracted_topic: 'MCQ|Cryptographic Hashes & Collision Resistance',
        marks_available: 1,
      },
      {
        question_number: '2',
        text_content: 'Which security principle states that users and applications should only be granted the minimum necessary permissions required to execute their job functions?\nA. Defense in Depth\nB. Principle of Least Privilege\nC. Security through Obscurity\nD. Open Design Principle',
        extracted_topic: 'MCQ|Access Control & Least Privilege',
        marks_available: 1,
      },
      {
        question_number: '3',
        text_content: 'Differentiate between symmetric encryption (e.g., AES-256) and asymmetric encryption (e.g., RSA/ECC) in terms of computational speed, key distribution challenges, and primary use cases.',
        extracted_topic: 'THEORY|Symmetric vs Asymmetric Cryptography',
        marks_available: 10,
      },
      {
        question_number: '4',
        text_content: 'Explain how Multi-Factor Authentication (MFA) protects organizations against credential stuffing and phishing attacks. Detail the three standard factors of authentication: something you know, something you have, and something you are.',
        extracted_topic: 'THEORY|MFA & Authentication Engineering',
        marks_available: 12,
      },
    ],
  },
  DIPT054: {
    title: 'Network Development and Management',
    questions: [
      {
        question_number: '1',
        text_content: 'Which layer of the OSI model is responsible for reliable process-to-process communication, flow control, and end-to-end error recovery?\nA. Network Layer (Layer 3)\nB. Transport Layer (Layer 4)\nC. Data Link Layer (Layer 2)\nD. Session Layer (Layer 5)',
        extracted_topic: 'MCQ|OSI Model & Transport Protocols',
        marks_available: 1,
      },
      {
        question_number: '2',
        text_content: 'Given the IPv4 address 192.168.10.0/26, how many valid, usable host addresses can be assigned on this subnet?\nA. 30\nB. 62\nC. 64\nD. 126',
        extracted_topic: 'MCQ|IPv4 Subnetting & CIDR',
        marks_available: 1,
      },
      {
        question_number: '3',
        text_content: 'Compare the TCP and UDP protocols. Explain why real-time multimedia streaming and DNS queries typically leverage UDP, while web browsing (HTTPS) and file transfer (FTP) necessitate TCP.',
        extracted_topic: 'THEORY|TCP vs UDP Transport Characteristics',
        marks_available: 10,
      },
      {
        question_number: '4',
        text_content: 'Explain how Virtual Local Area Networks (VLANs) segment broadcast domains at Layer 2. Describe the IEEE 802.1Q tagging mechanism and explain how Inter-VLAN routing is accomplished using a Router-on-a-Stick configuration.',
        extracted_topic: 'THEORY|VLAN Segmentation & 802.1Q Trunking',
        marks_available: 15,
      },
    ],
  },
};

/**
 * Ensures that for every course in the user's courses list, at least one rich past paper
 * with questions exists in the database.
 */
export async function ensurePastPapersForUserCourses(
  userId: string,
  userCourses: { id: string; course_code: string | null; title: string }[],
  institutionId?: string | null
): Promise<void> {
  if (!userCourses || userCourses.length === 0) return;

  const courseIds = userCourses.map((c) => c.id);
  const cacheKey = `${userId}:${[...courseIds].sort().join(',')}`;
  if (seededUserCoursesCache.get(cacheKey)) {
    return;
  }

  // Trigger Moodle sync once per 10m TTL window for this user+courses set
  try {
    await syncRealMoodlePastPapers(userId, userCourses);
  } catch (moodleErr: any) {
    console.warn('[ensurePastPapersForUserCourses] Notice syncing Moodle portal:', moodleErr?.message);
  }

  // Single batch lookup instead of one SELECT per course (eliminates N+1 query)
  const { data: existingPapers } = await supabaseAdmin
    .from('past_papers')
    .select('course_id')
    .eq('user_id', userId)
    .in('course_id', courseIds);

  const existingCourseIds = new Set(
    (existingPapers || []).map((p: any) => p.course_id).filter(Boolean)
  );

  for (const course of userCourses) {
    const rawCode = (course.course_code || course.title || '').trim();
    const normalizedCode = normalizeCourseCode(rawCode);
    if (!normalizedCode || existingCourseIds.has(course.id)) continue;

    // Resolve template if available for specific department course
    const template = COURSE_EXAM_TEMPLATES[normalizedCode];
    if (!template) {
      continue;
    }

    // Insert Final Examination Paper (strictly private to user)
    const paperTitle = `${rawCode} - 2024 End of Semester Examination`;
    const { data: insertedPaper, error: pErr } = await supabaseAdmin
      .from('past_papers')
      .insert({
        user_id: userId,
        course_id: course.id,
        course_code: rawCode,
        normalized_course_code: normalizedCode,
        title: paperTitle,
        year: 2024,
        exam_type: 'end-semester',
        status: 'ready',
        shared_to_community: false,
        institution_id: institutionId || null,
      })
      .select('id')
      .single();

    if (!pErr && insertedPaper) {
      const qRows = template.questions.map((q) => ({
        past_paper_id: insertedPaper.id,
        question_number: q.question_number,
        text_content: q.text_content,
        extracted_topic: q.extracted_topic,
        marks_available: q.marks_available,
      }));
      await supabaseAdmin.from('past_paper_questions').insert(qRows);
    }
  }

  seededUserCoursesCache.set(cacheKey, true);
}

