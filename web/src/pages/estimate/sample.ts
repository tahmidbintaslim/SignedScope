// Sample brief and estimate shown when the AI estimator is not switched on (from the old page).
import type { Estimate } from './types';

export const SAMPLE_BRIEF = "Hi! We run a small café in Bangkok (two branches). We need a new website:\n- menu with photos, Thai and English\n- table booking online with a confirmation email or LINE message\n- show our Instagram posts\n- a simple page for catering orders where people fill a form\nIt must look good on phones. We'd like it live before New Year. Our budget is not big.";

export const SAMPLE_ESTIMATE: Estimate = {
  "summary": "A bilingual (Thai/English) mobile-first café website for two branches with a photo menu, online table booking with confirmations, an Instagram feed and a catering enquiry form.",
  "projectType": "Small business website",
  "features": [
    {
      "name": "Bilingual site structure and design",
      "kind": "functional",
      "stories": [
        {
          "title": "Design home, menu, booking and catering pages for mobile first",
          "hoursLow": 10,
          "hoursHigh": 16
        },
        {
          "title": "Language switcher with Thai and English content",
          "hoursLow": 3,
          "hoursHigh": 6
        },
        {
          "title": "Branch pages with map, hours and contact",
          "hoursLow": 2,
          "hoursHigh": 4
        }
      ]
    },
    {
      "name": "Photo menu",
      "kind": "functional",
      "stories": [
        {
          "title": "Menu categories and items with photos and prices",
          "hoursLow": 4,
          "hoursHigh": 8
        },
        {
          "title": "Owner can update the menu without a developer",
          "hoursLow": 4,
          "hoursHigh": 8
        }
      ]
    },
    {
      "name": "Online table booking",
      "kind": "functional",
      "stories": [
        {
          "title": "Guest picks branch, date, time and party size",
          "hoursLow": 6,
          "hoursHigh": 10
        },
        {
          "title": "Confirmation email to guest and café",
          "hoursLow": 3,
          "hoursHigh": 5
        },
        {
          "title": "LINE notification to the café",
          "hoursLow": 3,
          "hoursHigh": 8
        },
        {
          "title": "Staff view of upcoming bookings",
          "hoursLow": 4,
          "hoursHigh": 8
        }
      ]
    },
    {
      "name": "Instagram feed",
      "kind": "functional",
      "stories": [
        {
          "title": "Show latest Instagram posts on the home page",
          "hoursLow": 2,
          "hoursHigh": 4
        }
      ]
    },
    {
      "name": "Catering enquiry form",
      "kind": "functional",
      "stories": [
        {
          "title": "Form with date, guests and menu wishes; emails the café",
          "hoursLow": 3,
          "hoursHigh": 5
        }
      ]
    },
    {
      "name": "Quality, launch and handover",
      "kind": "nonfunctional",
      "stories": [
        {
          "title": "Speed and mobile testing on common phones",
          "hoursLow": 3,
          "hoursHigh": 5
        },
        {
          "title": "Basic SEO and Google Business links",
          "hoursLow": 2,
          "hoursHigh": 4
        },
        {
          "title": "Domain, hosting setup and launch",
          "hoursLow": 2,
          "hoursHigh": 4
        },
        {
          "title": "Project calls and owner training",
          "hoursLow": 4,
          "hoursHigh": 6
        }
      ]
    }
  ],
  "milestones": [
    {
      "name": "Design approved",
      "featureIndexes": [
        0
      ],
      "weeks": 1.5
    },
    {
      "name": "Menu, Instagram and catering live on staging",
      "featureIndexes": [
        1,
        3,
        4
      ],
      "weeks": 1.5
    },
    {
      "name": "Booking with confirmations",
      "featureIndexes": [
        2
      ],
      "weeks": 1.5
    },
    {
      "name": "Testing and launch",
      "featureIndexes": [
        5
      ],
      "weeks": 1
    }
  ],
  "assumptions": [
    "The café provides menu text in both languages and photos",
    "Bookings do not need deposits or payment",
    "Up to two rounds of design changes"
  ],
  "openQuestions": [
    "Should bookings be limited by table count per time slot?",
    "Do you already have a LINE Official Account?",
    "Who will translate the menu?",
    "Is there a deadline date for New Year?"
  ],
  "risks": [
    "LINE messaging needs a LINE Official Account and may add cost",
    "Late menu content or photos will delay launch"
  ],
  "outOfScope": [
    "Online ordering or delivery",
    "Payments or deposits",
    "Professional food photography",
    "Ongoing content updates after launch"
  ]
};
