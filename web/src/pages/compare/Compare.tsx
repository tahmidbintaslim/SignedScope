// /compare: SignedScope next to the usual PDF quote by email, and when a full proposal suite fits
// better. English only. Claims are about SignedScope and the PDF workflow, not about named products.
import { ButtonLink, Card, Icon, PageHero } from '../../ui';
import '../templates/templates.css';
import './compare.css';

const ROWS: [string, string, string][] = [
  ['Client approves each line', 'One reply for the whole PDF, often "looks good"', 'Each line approved or questioned on its own'],
  ['Signing', 'Print, sign, scan, or a separate signing tool', 'Signs on any phone, no account'],
  ['"Can you also add…?"', 'A new email thread and a new PDF, or free work', 'A priced change the client approves in one tap'],
  ['Record of what was agreed', 'Whichever PDF version was last sent', 'A receipt with every line, the signer and the time, which anyone can verify'],
  ['Getting paid', 'Payment details in the email', 'Your own pay link or bank details shown after approval. SignedScope never touches the money'],
  ['Price', 'Free', 'Free during the beta'],
];

export default function Compare() {
  return (
    <div lang="en">
      <PageHero title="SignedScope vs a PDF quote" lede="Most freelancers send a PDF and hope the reply means yes. Here is what changes when your client approves line by line." />
      <div className="container cmp page-lift">
        <Card className="cmp-card">
          <table className="cmp-tbl">
            <thead><tr><th scope="col"><span className="visually-hidden">Topic</span></th><th scope="col">PDF quote by email</th><th scope="col">SignedScope</th></tr></thead>
            <tbody>
              {ROWS.map(([topic, pdf, ss]) => (
                <tr key={topic}><th scope="row">{topic}</th><td>{pdf}</td><td><Icon name="check" size={16} className="cmp-ok" />{ss}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>
        <div className="cmp-cols">
          <Card className="stack">
            <h2>When a proposal suite fits better</h2>
            <p className="muted">If you need a CRM, scheduling, invoicing, contract templates reviewed by lawyers, or a legally binding e-signature, use a full proposal or client-management suite. SignedScope is not a legal e-signature service.</p>
          </Card>
          <Card className="stack">
            <h2>When SignedScope fits</h2>
            <p className="muted">You already have clients and a way to get paid. You want a clear yes on every line, and a quick way to price the extras instead of doing them for free.</p>
          </Card>
        </div>
        <div className="row cmp-ctas">
          <ButtonLink to="/new" size="lg" iconEnd="arrow">Create a free scope</ButtonLink>
          <ButtonLink to="/templates" size="lg" variant="secondary">Browse templates</ButtonLink>
        </div>
      </div>
    </div>
  );
}
