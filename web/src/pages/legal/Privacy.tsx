// Privacy notice. Kept in English only until a lawyer has reviewed it (docs/PLAN.md phase G);
// translations of legal text must not drift from the reviewed original.
import { AppLink } from '../../app/AppLink';
import './legal.css';

export default function Privacy() {
  return (
    <article className="container legal" lang="en">
      <h1>Privacy</h1>
      <p className="muted">This notice is in English only.</p>
      <p>On the free tier, SignedScope stores no documents, signatures or receipts. Each one is encoded in the link and signed by the server, which keeps no copy. The data sits in the URL fragment (after the <code>#</code>), so it is not sent when the page loads. When you open a link, the page sends the full document to the server so it can check the signature. The server handles it in memory and does not store it.</p>
      <p>I store waitlist emails, plus the plan and note you give me, so I can contact you about SignedScope. To rate-limit sign-ups, the waitlist form also keeps a keyed hash of your IP address, not the address itself. If paid plans open, Stripe will process the payments.</p>
      <p>If you arrive from a link with a <code>?ref=</code> tag (for example from a launch post), the server stores one anonymous marker with that tag and the date, so I can see which channels work. It stores no IP address, cookie or browser details. The tag is also saved with a waitlist sign-up.</p>
      <p>If you paste a client message and press “Turn into items”, the text is sent to Anthropic’s Claude API to draft the items, when AI drafting is switched on. Anthropic processes it under its <a href="https://www.anthropic.com/legal/commercial-terms" rel="noopener">commercial terms</a>; SignedScope does not store it. Without AI, a simple rule-based splitter runs on the server instead.</p>
      <p>The AI estimator (<AppLink to="/estimate">/estimate</AppLink>) sends the brief you paste to Anthropic’s Claude API to produce the estimate. SignedScope does not store the brief or the estimate. If you answer “Would you send this estimate?”, I store your answer, any note you type, the page language, a <code>?ref=</code> tag if you came from one, and a few numbers about the estimate (number of features, hour totals, how many edits). No brief text, IP address or email is stored with it.</p>
      <p>If you create a workspace, your account (email, and name if you add it), clients, projects, saved estimates, filed documents, payment records and activity are stored in a database run by Supabase. Each account can only read its own data. You can export everything from Settings at any time; to delete your account and data, use the contact form below. If you sign in with Google or GitHub, SignedScope receives your email and name from them, nothing else. Clients who sign a link never need an account.</p>
      <p>In the workspace, “Write with AI” sends the project title, client and business names, the estimate summary, feature and milestone names and assumptions to Anthropic to draft proposal text. Prices, payment terms and legal terms are never sent for writing, and nothing is stored by the AI step.</p>
      <p>Files you upload to a project are stored privately in Supabase Storage, and only you can open them. A share link you create works for 7 days for anyone who has it. If email notifications are on, SignedScope emails you (never your client) through Resend when a client signs or opens a link, or a payment is overdue. You can turn each one off in Settings.</p>
      <p>Services that process data for SignedScope: Vercel (hosting and Blob storage for the waitlist and anonymous counters), Supabase (accounts, workspace data and files), Resend (notification emails to you) and Anthropic (AI drafting, estimates and proposal text, only for text you send it).</p>
      <p>When a client signs, the receipt records the name and email they enter, the time, their country (from the IP address) and a truncated hash of their browser’s user agent. The IP address is not stored.</p>
      <p>To stop abuse, the server keeps rate-limit counters keyed by a one-way hash of your IP address (or of your account id) for up to 48 hours. The address itself is not stored.</p>
      <h2>Who is responsible</h2>
      <p>The data controller is Tahmid Bin Taslim Rafi, who runs SignedScope. Contact: the <a href="https://tahmid.space/#contact">contact form</a>. Please write “SignedScope privacy” in your message.</p>
      <h2>Why the data is used</h2>
      <p>Account, workspace and signing data: to provide the service you asked for (contract). Waitlist and feedback: your consent, which you can withdraw at any time. Rate limits and security logs: legitimate interest in keeping the service safe.</p>
      <h2>How long it is kept</h2>
      <p>Workspace data and files: until you delete them or your account. Waitlist entries: until paid plans open or you ask for removal. Feedback answers: up to 12 months. Rate-limit counters: up to 48 hours. Sign-off links and receipts that are not filed in a workspace are not stored at all.</p>
      <h2>Where it is processed</h2>
      <p>The services above (Vercel, Supabase, Resend, Anthropic) run outside Thailand and Bangladesh, mainly in the United States and Singapore. Data sent to them is protected by their contractual data-processing terms.</p>
      <h2>Your rights</h2>
      <p>You can ask to see, correct, export or delete your data, object to its use, or withdraw consent. Use the contact form; requests are answered within 30 days. In Thailand you can also complain to the Personal Data Protection Committee (PDPC).</p>
      <p>If you sign a link someone sent you, the sender is the one who decides how your receipt is used; contact them first. To remove your waitlist entry, use the contact form and ask me to delete it.</p>
      <p className="muted">Last updated 8 November 2026.</p>
    </article>
  );
}
