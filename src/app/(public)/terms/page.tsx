import { Contact, LegalPage } from "@/components/LegalPage";
import { SITE } from "@/lib/site/config";

export const metadata = { title: "Terms of use" };

export default function Terms() {
  return (
    <LegalPage title="Terms of use">
      <p>These terms apply to your use of {SITE.name}, a free student project. By creating an account you agree to them.</p>

      <h2>What the service is</h2>
      <p>A study and planning tool that organises your academic records, estimates academic risk, simulates grades and offers AI-generated guidance. It is not an official university system. It does not replace your faculty, academic regulations or professional counselling.</p>

      <h2>Your account</h2>
      <ul>
        <li>You must be 18 or older and give a valid email address.</li>
        <li>Keep your password private. You are responsible for activity on your account.</li>
        <li>Only enter your own academic information.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>Don&apos;t try to access other people&apos;s data, overload or attack the service, bypass rate limits, or use the AI advisor to produce harmful, illegal or academically dishonest content (for example, submitting AI output as your own graded work where that isn&apos;t allowed).</p>

      <h2>AI output and estimates</h2>
      <p>Risk estimates, recommendations and AI answers can be inaccurate or incomplete. Always confirm important information such as exam rules, attendance requirements and grading with your university. Decisions you make based on the service are your own.</p>

      <h2>Your content</h2>
      <p>You own the records and messages you add. You give us permission to store and process them only to run the service for you, as described in the privacy policy.</p>

      <h2>Availability and liability</h2>
      <p>The service is provided &quot;as is&quot; as an educational project, without guarantees of availability or accuracy. To the extent the law allows, we are not liable for losses arising from its use, outages or data loss. Export your data if you need a backup.</p>

      <h2>Suspension</h2>
      <p>We may suspend accounts that break these terms or put the service or other users at risk.</p>

      <h2>Changes</h2>
      <p>We may update these terms. The date at the top shows the latest version. Continuing to use the service after a change means you accept it.</p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of India. Disputes fall under the courts of Pune, Maharashtra.</p>

      <h2>Contact</h2>
      <p>Questions: <Contact />.</p>
    </LegalPage>
  );
}
