import { Contact, LegalPage } from "@/components/LegalPage";
import { SITE } from "@/lib/site/config";

export const metadata = { title: "Privacy policy" };

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy">
      <p>{SITE.name} is a student project built by {SITE.owner} for the AIML Essentials course at Ajeenkya D Y Patil University. This page explains what the app stores, why, who processes it and how you control it.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account:</strong> your email address, a securely hashed password (handled by Supabase Auth) and the name you enter.</li>
        <li><strong>Academic records you enter:</strong> semesters, subjects, credits, marks, assessments, attendance counts, assignments, exam dates, study sessions, goals and skills.</li>
        <li><strong>Optional profile details:</strong> degree, branch, admission score, date of birth, scholarship and fee status, interests, learning style and study hours. These improve the risk estimate and recommendations, and every one of them can be left blank.</li>
        <li><strong>Advisor chat:</strong> the messages you send and the replies you receive.</li>
        <li><strong>Security logs:</strong> short-lived counters of requests per IP address or account, used only for rate limiting and deleted within a day.</li>
      </ul>
      <p>We don&apos;t collect your location, contacts, camera, microphone or any advertising identifiers, and we don&apos;t use analytics or advertising trackers.</p>

      <h2>Why we use it</h2>
      <ul>
        <li>To calculate your CGPA, attendance margins, risk estimate, study plan and recommendations.</li>
        <li>To answer your questions in the AI advisor, if you turn AI features on.</li>
        <li>To keep the service secure (sign-in, rate limiting, abuse prevention).</li>
      </ul>

      <h2>Automated estimates and AI</h2>
      <p>The risk estimate comes from a machine-learning model trained on a public, anonymised dataset of university students. It is an estimate to help you plan, not a decision about you, and no one at a university receives it. AI-generated text is always labelled. It can be wrong, so check important details with your faculty.</p>

      <h2>Who processes your data</h2>
      <ul>
        <li><strong>Supabase</strong> stores the database, sign-in and files (South Asia, Mumbai region).</li>
        <li><strong>Vercel</strong> hosts the website and runs the server code.</li>
        <li><strong>Google (Gemini API)</strong> generates AI answers, <strong>only after you turn on AI features</strong> in Settings. We send a summary of your academic records (marks, attendance, subjects, deadlines and the risk estimate) together with your question and your last few chat messages. We never send your name, email address or date of birth.</li>
      </ul>
      <p>We don&apos;t sell or share your data with anyone else.</p>

      <h2>Cookies</h2>
      <p>We only use essential cookies that keep you signed in. There are no tracking or advertising cookies, so no cookie banner is needed.</p>

      <h2>How long we keep it</h2>
      <p>Your records are kept until you delete them or delete your account. Deleting your account removes every record, chat message and uploaded file immediately.</p>

      <h2>Your rights and controls</h2>
      <ul>
        <li><strong>See and correct:</strong> every record can be edited in the app.</li>
        <li><strong>Export:</strong> Settings, then Privacy, then Download my data gives you a full JSON copy.</li>
        <li><strong>Delete:</strong> clear all records, or delete your account entirely, from Settings.</li>
        <li><strong>Withdraw AI consent</strong> at any time in Settings. AI features stop immediately.</li>
      </ul>

      <h2>Security</h2>
      <p>Data is encrypted in transit (HTTPS) and at rest by our hosting providers. Database rules make sure each account can only read its own rows. If we ever discover a breach affecting your data, we will tell you without undue delay.</p>

      <h2>Age</h2>
      <p>The app is meant for university students aged 18 or older.</p>

      <h2>Contact</h2>
      <p>For questions or requests about your data, write to <Contact />.</p>
    </LegalPage>
  );
}
