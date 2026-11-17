// Scope templates shown at /templates/<slug>. English only (like /privacy): they are reference
// content for search, and "Use this template" copies the lines into /new, where the person edits
// them in their own language. Prices are examples in USD.
import type { ItemKind } from '../../lib/sealed';

export interface Template {
  slug: string;
  name: string;
  title: string;
  description: string;
  intro: string;
  items: { kind: ItemKind; text: string; price?: number }[];
}

export const TEMPLATES: Template[] = [
  {
    slug: 'website-design',
    name: 'Website design',
    title: 'Website design scope of work template',
    description: 'A free website design scope of work: pages, build, tests your client signs off on, and what is not included. Send it as one link your client approves line by line.',
    intro: 'For a small business site of about five pages. Each line is approved by your client on its own, so you both know exactly what the price covers.',
    items: [
      { kind: 'scope', text: 'Discovery call and a sitemap for approval', price: 300 },
      { kind: 'scope', text: 'Design of the home page and 4 inner pages, for desktop and mobile', price: 1800 },
      { kind: 'scope', text: 'Build on the platform we agree on', price: 2000 },
      { kind: 'scope', text: 'Contact form that sends to your email', price: 200 },
      { kind: 'scope', text: 'Basic on-page SEO: page titles, descriptions and a sitemap', price: 250 },
      { kind: 'scope', text: 'Two rounds of design changes' },
      { kind: 'uat', text: 'Every page loads in under 3 seconds on a phone' },
      { kind: 'uat', text: 'The contact form delivers to your inbox' },
      { kind: 'uat', text: 'Pages look right in current Chrome, Safari and Firefox' },
      { kind: 'out', text: 'Copywriting and photography' },
      { kind: 'out', text: 'Hosting and domain fees' },
      { kind: 'out', text: 'Online store or bookings' },
      { kind: 'out', text: 'More than two rounds of changes' },
      { kind: 'out', text: 'Maintenance after launch' },
    ],
  },
  {
    slug: 'logo-design',
    name: 'Logo and brand identity',
    title: 'Logo design scope of work template',
    description: 'A free logo and brand identity scope of work: concepts, rounds of changes, final files and what is not included. Send it as one link your client approves line by line.',
    intro: 'For a logo with a one-page brand guide. The number of concepts and rounds is written down, so extra rounds become a priced change instead of free work.',
    items: [
      { kind: 'scope', text: 'Brand questionnaire and one call', price: 150 },
      { kind: 'scope', text: 'Three logo concepts', price: 900 },
      { kind: 'scope', text: 'Two rounds of changes on the chosen concept' },
      { kind: 'scope', text: 'Final files: SVG, PNG and PDF, in color and in black and white', price: 200 },
      { kind: 'scope', text: 'One-page brand guide: colors, fonts and clear space', price: 300 },
      { kind: 'uat', text: 'The logo reads clearly at 32 pixels wide' },
      { kind: 'uat', text: 'Files open in Figma, Illustrator and Canva' },
      { kind: 'out', text: 'Trademark search or registration' },
      { kind: 'out', text: 'Business cards, signage and print' },
      { kind: 'out', text: 'Website or social media design' },
      { kind: 'out', text: 'Extra concepts after the first three' },
    ],
  },
  {
    slug: 'mobile-app',
    name: 'Mobile app',
    title: 'Mobile app development scope of work template',
    description: 'A free mobile app scope of work: prototype, build, sign in, store setup, tests your client signs off on, and what is not included.',
    intro: 'For a first version of an iOS and Android app. The tests to pass say when the work is done, which is where most app projects drift.',
    items: [
      { kind: 'scope', text: 'Clickable prototype of the main screens', price: 1500 },
      { kind: 'scope', text: 'iOS and Android app from one codebase', price: 9000 },
      { kind: 'scope', text: 'Sign up and sign in with email', price: 800 },
      { kind: 'scope', text: 'Push notifications', price: 600 },
      { kind: 'scope', text: 'App Store and Google Play listing setup', price: 300 },
      { kind: 'scope', text: '30 days of bug fixes after launch' },
      { kind: 'uat', text: 'The app runs on iOS 17 and Android 12 or newer' },
      { kind: 'uat', text: 'Sign in works on a slow connection' },
      { kind: 'uat', text: 'No crash in a 20-minute test session' },
      { kind: 'out', text: 'Backend server or admin panel' },
      { kind: 'out', text: 'App store developer account fees' },
      { kind: 'out', text: 'In-app payments' },
      { kind: 'out', text: 'New features after sign-off' },
    ],
  },
  {
    slug: 'social-media-management',
    name: 'Social media management',
    title: 'Social media management scope of work template',
    description: 'A free monthly social media management scope of work: posts, captions, calendar, replies, reporting and what is not included.',
    intro: 'For a monthly retainer. Writing down the platforms and the number of posts keeps "can you also do TikTok?" from becoming free work.',
    items: [
      { kind: 'scope', text: '12 posts a month for Instagram and Facebook', price: 600 },
      { kind: 'scope', text: 'Captions and hashtags for each post' },
      { kind: 'scope', text: 'Monthly content calendar for your approval', price: 100 },
      { kind: 'scope', text: 'Replies to comments on weekdays', price: 300 },
      { kind: 'scope', text: 'Monthly report: reach, followers and top posts', price: 100 },
      { kind: 'uat', text: 'The calendar arrives by the 25th of the month before' },
      { kind: 'uat', text: 'Posts go out on the approved dates' },
      { kind: 'out', text: 'Paid ads and ad spend' },
      { kind: 'out', text: 'Photo or video shoots' },
      { kind: 'out', text: 'TikTok, LinkedIn or X' },
      { kind: 'out', text: 'Replies to direct messages' },
    ],
  },
];

export const templateBySlug = (slug: string) => TEMPLATES.find((t) => t.slug === slug);
