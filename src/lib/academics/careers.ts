/**
 * Career Pathway knowledge base (blueprint "Academic-to-Career Bridge").
 * A curated map, not an ML model: the Kaggle career dataset was tested and
 * rejected (12.6% accuracy on 10 classes ≈ random), see ml/scripts/train_all.py.
 */

export type PathSkill = { name: string; target: number; why: string };
export type CareerPath = {
  id: string;
  title: string;
  summary: string;
  interests: string[];             // used to match a student's interests
  subjects: string[];              // university subjects that feed this path (keyword match)
  skills: PathSkill[];
  sequence: string[];
  projects: { level: "Beginner" | "Intermediate" | "Advanced"; title: string }[];
};

export const CAREER_PATHS: CareerPath[] = [
  {
    id: "ai-ml", title: "AI / Machine Learning Engineer",
    summary: "Build models that learn from data: prediction, NLP, computer vision.",
    interests: ["machine learning", "ai", "data", "python", "research", "deep learning", "nlp"],
    subjects: ["math", "statistic", "probability", "linear algebra", "programming", "python", "machine learning", "artificial intelligence", "data"],
    skills: [
      { name: "Python", target: 4, why: "Main language for ML" },
      { name: "Linear Algebra & Statistics", target: 3, why: "Maths behind every model" },
      { name: "Machine Learning (scikit-learn)", target: 4, why: "Classical models and evaluation" },
      { name: "Deep Learning (PyTorch/TensorFlow)", target: 3, why: "Neural networks" },
      { name: "SQL", target: 3, why: "Getting data out of databases" },
      { name: "Git", target: 3, why: "Version control for projects" },
    ],
    sequence: ["Python basics", "Statistics & linear algebra", "Pandas + data cleaning", "scikit-learn models", "Model evaluation", "Neural networks", "Deploy a model as an API"],
    projects: [
      { level: "Beginner", title: "Student marks predictor with linear regression" },
      { level: "Intermediate", title: "Dropout risk classifier with Random Forest (like this app!)" },
      { level: "Advanced", title: "Fine-tune a small language model for FAQ answering" },
    ],
  },
  {
    id: "full-stack", title: "Full-Stack Web Developer",
    summary: "Design and ship complete web apps: frontend, backend and database.",
    interests: ["web development", "javascript", "design", "startups", "apps", "frontend", "backend"],
    subjects: ["web", "programming", "database", "dbms", "software engineering", "java", "networks"],
    skills: [
      { name: "HTML/CSS", target: 4, why: "Every web page" },
      { name: "JavaScript/TypeScript", target: 4, why: "Interactive frontends and Node backends" },
      { name: "React / Next.js", target: 3, why: "Modern UI framework" },
      { name: "SQL", target: 3, why: "Relational databases" },
      { name: "REST APIs", target: 3, why: "Connecting frontend and backend" },
      { name: "Git", target: 3, why: "Team collaboration" },
    ],
    sequence: ["HTML & CSS", "JavaScript fundamentals", "React", "Node/Next.js API routes", "SQL + Postgres", "Auth & security basics", "Deploy to Vercel"],
    projects: [
      { level: "Beginner", title: "Personal portfolio website" },
      { level: "Intermediate", title: "Task manager with login and a database" },
      { level: "Advanced", title: "Full SaaS app with payments and role-based access" },
    ],
  },
  {
    id: "cybersecurity", title: "Cybersecurity Analyst",
    summary: "Protect systems and data: find vulnerabilities, monitor and respond to attacks.",
    interests: ["cyber security", "security", "hacking", "networks", "linux"],
    subjects: ["network", "operating system", "cryptography", "security", "linux", "programming"],
    skills: [
      { name: "Networking (TCP/IP)", target: 4, why: "How attacks travel" },
      { name: "Linux", target: 4, why: "Most servers and tools" },
      { name: "Python scripting", target: 3, why: "Automating security tasks" },
      { name: "Web security (OWASP Top 10)", target: 3, why: "Most common vulnerabilities" },
      { name: "Cryptography basics", target: 2, why: "Encryption and hashing" },
    ],
    sequence: ["Networking fundamentals", "Linux command line", "Security concepts", "OWASP Top 10", "Capture-the-flag practice", "Security+ style certification"],
    projects: [
      { level: "Beginner", title: "Password strength checker" },
      { level: "Intermediate", title: "Network port scanner with a report" },
      { level: "Advanced", title: "Security audit of a sample web app" },
    ],
  },
  {
    id: "data-analyst", title: "Data Analyst",
    summary: "Turn data into decisions with SQL, spreadsheets and dashboards.",
    interests: ["data", "business", "analytics", "excel", "finance", "statistics", "visualization"],
    subjects: ["statistic", "math", "database", "dbms", "economics", "business", "data"],
    skills: [
      { name: "Excel / Google Sheets", target: 4, why: "Everyday analysis" },
      { name: "SQL", target: 4, why: "Query business data" },
      { name: "Statistics", target: 3, why: "Interpreting results correctly" },
      { name: "Python (pandas)", target: 3, why: "Larger datasets" },
      { name: "Power BI / Tableau", target: 3, why: "Dashboards for managers" },
    ],
    sequence: ["Excel formulas & pivots", "SQL", "Descriptive statistics", "Python + pandas", "Dashboards", "Storytelling with data"],
    projects: [
      { level: "Beginner", title: "Personal expense dashboard" },
      { level: "Intermediate", title: "Sales analysis with SQL + Power BI" },
      { level: "Advanced", title: "A/B test analysis report" },
    ],
  },
  {
    id: "cloud-devops", title: "Cloud / DevOps Engineer",
    summary: "Run and automate the infrastructure that apps live on.",
    interests: ["cloud", "devops", "linux", "automation", "systems", "networks"],
    subjects: ["operating system", "network", "cloud", "linux", "programming", "software engineering"],
    skills: [
      { name: "Linux", target: 4, why: "Servers run Linux" },
      { name: "Cloud (AWS/Azure/GCP)", target: 3, why: "Where apps are hosted" },
      { name: "Docker", target: 3, why: "Packaging apps" },
      { name: "CI/CD", target: 3, why: "Automated testing and deploys" },
      { name: "Scripting (Bash/Python)", target: 3, why: "Automation" },
      { name: "Networking (TCP/IP)", target: 3, why: "Connecting services" },
    ],
    sequence: ["Linux", "Networking", "Scripting", "Docker", "One cloud provider", "CI/CD pipelines", "Kubernetes basics"],
    projects: [
      { level: "Beginner", title: "Host a static site on a cloud bucket" },
      { level: "Intermediate", title: "Dockerise an app with a CI pipeline" },
      { level: "Advanced", title: "Infrastructure-as-code deployment with monitoring" },
    ],
  },
  {
    id: "ui-ux", title: "UI/UX Designer",
    summary: "Design products people find easy and enjoyable to use.",
    interests: ["design", "creativity", "graphic design", "art", "ui", "ux", "psychology"],
    subjects: ["design", "communication", "psychology", "web", "multimedia"],
    skills: [
      { name: "Figma", target: 4, why: "Industry-standard design tool" },
      { name: "User research", target: 3, why: "Understanding real needs" },
      { name: "Visual design & typography", target: 3, why: "Clear, attractive interfaces" },
      { name: "Prototyping", target: 3, why: "Testing ideas quickly" },
      { name: "HTML/CSS", target: 2, why: "Talking to developers" },
    ],
    sequence: ["Design principles", "Figma", "Wireframes", "User research", "Prototyping & testing", "Portfolio case studies"],
    projects: [
      { level: "Beginner", title: "Redesign your college app's home screen" },
      { level: "Intermediate", title: "Full case study: research → prototype → test" },
      { level: "Advanced", title: "Design system for a multi-page product" },
    ],
  },
];

export function matchCareers(interests: string[], subjectNames: string[], goal?: string | null) {
  const ints = interests.map((i) => i.toLowerCase());
  const subs = subjectNames.map((s) => s.toLowerCase());
  return CAREER_PATHS.map((p) => {
    const interestHits = p.interests.filter((k) => ints.some((i) => i.includes(k) || k.includes(i)));
    const subjectHits = p.subjects.filter((k) => subs.some((s) => s.includes(k)));
    const goalHit = goal && p.title.toLowerCase().includes(goal.toLowerCase()) ? 1 : 0;
    const score = interestHits.length * 2 + subjectHits.length + goalHit * 5;
    return { id: p.id, title: p.title, score, interestHits, subjectHits };
  }).sort((a, b) => b.score - a.score);
}

export function skillGap(path: CareerPath, skills: { name: string; level: number }[]) {
  const have = new Map(skills.map((s) => [s.name.toLowerCase(), s.level]));
  return path.skills.map((s) => {
    const level = have.get(s.name.toLowerCase()) ?? 0;
    return { ...s, level, gap: Math.max(0, s.target - level) };
  });
}
