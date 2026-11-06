'use strict';
// Clause library for proposals and agreements. Plain-language TEMPLATES, not legal advice.
// {{placeholders}} are filled from the composer form. Governing-law clauses are per country;
// none of them has been reviewed by a lawyer, and the composer says so.
const CLAUSE_VARS = { days: 14, deposit: 50, revisions: 2, notice: 14, warranty: 30, rate: '' };
const CLAUSES = [
  { id: 'payment', group: 'Payment', title: 'Payment terms', on: true,
    text: 'Payments follow the schedule above. Each payment is due within {{days}} days of its request. Work on the next milestone starts once the previous payment has been received.' },
  { id: 'deposit', group: 'Payment', title: 'Deposit', on: true,
    text: 'A deposit of {{deposit}}% of the total is due before work starts. Once work has begun, the deposit covers work already done and is not refundable.' },
  { id: 'late', group: 'Payment', title: 'Late payment',
    text: 'If a payment is more than {{days}} days late, {{freelancer}} may pause work until it is received. Timelines move by the length of the pause.' },
  { id: 'expenses', group: 'Payment', title: 'Third-party costs',
    text: 'Hosting, domains, paid plugins, fonts, stock media and other third-party services are paid by {{client}} directly or reimbursed at cost, unless they are listed as included above.' },
  { id: 'revisions', group: 'Scope', title: 'Revisions', on: true,
    text: 'The price includes {{revisions}} rounds of revisions for each deliverable. Further revisions are quoted as a change request{{rateText}}.' },
  { id: 'changes', group: 'Scope', title: 'Change requests', on: true,
    text: 'Work that is not in the approved scope is a change request. {{freelancer}} will quote it separately, and it starts only after {{client}} approves it in writing, for example by signing a change request link.' },
  { id: 'client', group: 'Scope', title: 'Client responsibilities', on: true,
    text: '{{client}} provides content, feedback, approvals and access within {{days}} days of a request. Delays in these move the timeline by the same amount of time.' },
  { id: 'acceptance', group: 'Scope', title: 'Acceptance',
    text: 'Each deliverable counts as accepted when {{client}} approves it, or {{days}} days after delivery if no specific issues have been reported by then.' },
  { id: 'ip', group: 'Ownership', title: 'Ownership of the work', on: true,
    text: 'When all payments are made, {{client}} owns the final deliverables made for this project. {{freelancer}} keeps ownership of tools, code libraries, templates and know-how that existed before the project or are not specific to it, and gives {{client}} a permanent licence to use them as part of the deliverables.' },
  { id: 'portfolio', group: 'Ownership', title: 'Portfolio use',
    text: '{{freelancer}} may show the finished work in a portfolio after launch, unless {{client}} asks in writing not to.' },
  { id: 'confidential', group: 'Ownership', title: 'Confidentiality',
    text: 'Both sides keep the other side\'s non-public business information confidential and use it only for this project. This continues after the project ends.' },
  { id: 'warranty', group: 'After launch', title: 'Bug fixes after launch',
    text: '{{freelancer}} fixes defects in the delivered work that are reported within {{warranty}} days after launch, at no extra cost. New features and changes are change requests.' },
  { id: 'cancel', group: 'Ending', title: 'Ending the agreement', on: true,
    text: 'Either side may end this agreement with {{notice}} days\' written notice. {{client}} pays for work done up to the end date, and receives the work paid for.' },
  { id: 'liability', group: 'Ending', title: 'Limit of liability',
    text: 'Each side\'s total liability under this agreement is limited to the total fees paid under it. This limit does not apply to unpaid fees or to a breach of confidentiality.' },
  { id: 'esign', group: 'Signing', title: 'Electronic signature', on: true,
    text: 'Both sides agree that approving and signing this document electronically, including through SignedScope, shows their agreement to it, in the same way as a signature on paper.' },
];
const LAW = {
  TH: 'This agreement is governed by the laws of Thailand.',
  BD: 'This agreement is governed by the laws of Bangladesh.',
  MY: 'This agreement is governed by the laws of Malaysia.',
  SG: 'This agreement is governed by the laws of Singapore.',
  '': 'This agreement is governed by the laws of the country where {{freelancer}} is based, unless both sides agree otherwise in writing.',
};
const LAW_DISPUTES = ' Both sides will first try to resolve any dispute by talking in good faith for at least {{days}} days.';
function fillClause(text, v) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => (v[k] != null && v[k] !== '' ? String(v[k]) : `[${k}]`));
}
