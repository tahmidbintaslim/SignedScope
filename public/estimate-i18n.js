'use strict';
// UI strings for the estimator in English, Bangla and Thai.
// Bangla and Thai are first drafts: have a native speaker review before a wide launch.
const T = {
  en: {
    navApp: 'Workspace', saveH: 'Save to your workspace', saveProject: 'Project', saveNew: 'New project name', save: 'Save estimate', openProject: 'Open project', signInToSave: 'Sign in to save estimates and track clients', saved: 'Saved', newProjectOpt: '+ New project', loadedSaved: 'Saved estimate loaded. Edit it and save again as a new version.',
    navEstimate: 'AI estimate', navScope: 'New scope', navPricing: 'Pricing', beta: 'Free beta',
    h1: 'Paste a brief. Get a quote you can defend.',
    lede: 'Features, user stories, milestones, timeline and a price range from your own rate. You edit everything before your client sees it.',
    briefLabel: 'Client brief, email or chat',
    briefPh: 'Paste what the client sent you. For example: "We need a website for our café with a menu, online booking and Instagram feed…"',
    sample: 'Use a sample brief', privacy: 'Not stored. Sent to Claude (Anthropic) to estimate.',
    rate: 'Your hourly rate', currency: 'Currency', buffer: 'Buffer for surprises (%)',
    go: 'Estimate my project', wait: 'Reading the brief and breaking it down… about 20–40 seconds.',
    sampleNote: 'Sample estimate for the sample brief. The AI estimator isn\'t switched on yet.',
    priceRange: 'Price range', hours: 'Hours', timeline: 'Timeline',
    features: 'Features and user stories', editHint: 'Change any hours or remove a line. Totals update as you go.',
    milestones: 'Milestones', questions: 'Ask your client', assumptions: 'Assumptions', risks: 'Risks', outOfScope: 'Not included',
    nextH: 'Send it for approval', nextP: 'Turn this into a scope your client approves line by line and signs. Each feature becomes a priced line.',
    toScope: 'Turn into a scope link', copy: 'Copy as text', copied: 'Copied',
    fbH: 'Would you send this estimate to a real client?', fbYes: 'Yes, as it is', fbEdits: 'Yes, after edits', fbNo: 'No',
    fbNote: 'What\'s wrong or missing? (optional)', fbSend: 'Send feedback', fbThanks: 'Thank you! This helps us improve.', fbPick: 'Pick an answer first.',
    disclaimer: 'Estimates are AI-generated starting points, not guarantees. Check them against your own experience before quoting.',
    functional: 'Feature', nonfunctional: 'Quality & delivery', story: 'Story', low: 'Min h', high: 'Max h', remove: 'Remove',
    weeks: (n) => `${n} ${n === 1 ? 'week' : 'weeks'}`, hrs: (a, b) => `${a}–${b} h`,
    formula: (rate, buf) => `Hours × ${rate}/h, plus ${buf}% buffer. Quote per feature uses the middle of each range.`,
    delivers: 'Delivers', notesAssumptions: 'Assumptions',
  },
  bn: {
    navApp: 'ওয়ার্কস্পেস', saveH: 'ওয়ার্কস্পেসে সংরক্ষণ করুন', saveProject: 'প্রজেক্ট', saveNew: 'নতুন প্রজেক্টের নাম', save: 'এস্টিমেট সংরক্ষণ', openProject: 'প্রজেক্ট খুলুন', signInToSave: 'এস্টিমেট সংরক্ষণ ও ক্লায়েন্ট ট্র্যাক করতে সাইন ইন করুন', saved: 'সংরক্ষিত', newProjectOpt: '+ নতুন প্রজেক্ট', loadedSaved: 'সংরক্ষিত এস্টিমেট খোলা হয়েছে। এডিট করে নতুন ভার্সন হিসেবে সংরক্ষণ করুন।',
    navEstimate: 'AI এস্টিমেট', navScope: 'নতুন স্কোপ', navPricing: 'মূল্য', beta: 'ফ্রি বেটা',
    h1: 'ব্রিফ পেস্ট করুন। যুক্তিসঙ্গত কোট পান।',
    lede: 'আপনার নিজের রেট থেকে ফিচার, ইউজার স্টোরি, মাইলস্টোন, টাইমলাইন এবং মূল্যের পরিসর। ক্লায়েন্ট দেখার আগে আপনি সব এডিট করতে পারবেন।',
    briefLabel: 'ক্লায়েন্টের ব্রিফ, ইমেইল বা চ্যাট',
    briefPh: 'ক্লায়েন্ট যা পাঠিয়েছে তা পেস্ট করুন। যেমন: "আমাদের ক্যাফের জন্য মেনু, অনলাইন বুকিং আর ইনস্টাগ্রাম ফিডসহ একটি ওয়েবসাইট চাই…"',
    sample: 'নমুনা ব্রিফ ব্যবহার করুন', privacy: 'সংরক্ষণ করা হয় না। এস্টিমেটের জন্য Claude (Anthropic)-এ পাঠানো হয়।',
    rate: 'আপনার ঘণ্টাপ্রতি রেট', currency: 'মুদ্রা', buffer: 'অপ্রত্যাশিত কাজের জন্য বাফার (%)',
    go: 'প্রজেক্ট এস্টিমেট করুন', wait: 'ব্রিফ পড়ে ভাগ করা হচ্ছে… প্রায় ২০–৪০ সেকেন্ড।',
    sampleNote: 'নমুনা ব্রিফের জন্য নমুনা এস্টিমেট। AI এস্টিমেটর এখনও চালু হয়নি।',
    priceRange: 'মূল্যের পরিসর', hours: 'ঘণ্টা', timeline: 'টাইমলাইন',
    features: 'ফিচার ও ইউজার স্টোরি', editHint: 'যেকোনো ঘণ্টা বদলান বা লাইন মুছে দিন। মোট সাথে সাথে আপডেট হবে।',
    milestones: 'মাইলস্টোন', questions: 'ক্লায়েন্টকে জিজ্ঞেস করুন', assumptions: 'অনুমান', risks: 'ঝুঁকি', outOfScope: 'অন্তর্ভুক্ত নয়',
    nextH: 'অনুমোদনের জন্য পাঠান', nextP: 'এটিকে একটি স্কোপে রূপ দিন, যা ক্লায়েন্ট লাইন ধরে অনুমোদন করে সই করবেন। প্রতিটি ফিচার একটি মূল্যসহ লাইন হবে।',
    toScope: 'স্কোপ লিংক তৈরি করুন', copy: 'টেক্সট হিসেবে কপি', copied: 'কপি হয়েছে',
    fbH: 'আপনি কি এই এস্টিমেট কোনো আসল ক্লায়েন্টকে পাঠাবেন?', fbYes: 'হ্যাঁ, যেমন আছে', fbEdits: 'হ্যাঁ, এডিটের পরে', fbNo: 'না',
    fbNote: 'কী ভুল বা কী বাদ পড়েছে? (ঐচ্ছিক)', fbSend: 'মতামত পাঠান', fbThanks: 'ধন্যবাদ! এটি আমাদের উন্নত করতে সাহায্য করবে।', fbPick: 'আগে একটি উত্তর বেছে নিন।',
    disclaimer: 'এস্টিমেটগুলো AI-তৈরি শুরুর ধারণা, নিশ্চয়তা নয়। কোট দেওয়ার আগে নিজের অভিজ্ঞতার সাথে মিলিয়ে নিন।',
    functional: 'ফিচার', nonfunctional: 'মান ও ডেলিভারি', story: 'স্টোরি', low: 'সর্বনিম্ন ঘ.', high: 'সর্বোচ্চ ঘ.', remove: 'মুছুন',
    weeks: (n) => `${n} সপ্তাহ`, hrs: (a, b) => `${a}–${b} ঘ.`,
    formula: (rate, buf) => `ঘণ্টা × ${rate}/ঘণ্টা, সাথে ${buf}% বাফার। প্রতিটি ফিচারের কোট পরিসরের মাঝামাঝি ধরে।`,
    delivers: 'ডেলিভার করে', notesAssumptions: 'অনুমান',
  },
  th: {
    navApp: 'เวิร์กสเปซ', saveH: 'บันทึกลงเวิร์กสเปซ', saveProject: 'โปรเจกต์', saveNew: 'ชื่อโปรเจกต์ใหม่', save: 'บันทึกผลประเมิน', openProject: 'เปิดโปรเจกต์', signInToSave: 'เข้าสู่ระบบเพื่อบันทึกผลประเมินและติดตามลูกค้า', saved: 'บันทึกแล้ว', newProjectOpt: '+ โปรเจกต์ใหม่', loadedSaved: 'เปิดผลประเมินที่บันทึกไว้แล้ว แก้ไขแล้วบันทึกเป็นเวอร์ชันใหม่ได้',
    navEstimate: 'ประเมินด้วย AI', navScope: 'สร้างขอบเขตงาน', navPricing: 'ราคา', beta: 'เบต้าฟรี',
    h1: 'วางบรีฟ แล้วได้ใบเสนอราคาที่อธิบายได้',
    lede: 'ฟีเจอร์ ยูสเซอร์สตอรี่ ไมล์สโตน ไทม์ไลน์ และช่วงราคาจากเรตของคุณเอง แก้ไขได้ทุกอย่างก่อนลูกค้าเห็น',
    briefLabel: 'บรีฟ อีเมล หรือแชทจากลูกค้า',
    briefPh: 'วางข้อความที่ลูกค้าส่งมา เช่น "อยากได้เว็บไซต์ร้านกาแฟ มีเมนู จองโต๊ะออนไลน์ และฟีด Instagram…"',
    sample: 'ใช้บรีฟตัวอย่าง', privacy: 'ไม่มีการเก็บข้อมูล ส่งไปยัง Claude (Anthropic) เพื่อประเมิน',
    rate: 'เรตรายชั่วโมงของคุณ', currency: 'สกุลเงิน', buffer: 'เผื่อสำหรับงานที่ไม่คาดคิด (%)',
    go: 'ประเมินโปรเจกต์', wait: 'กำลังอ่านบรีฟและแยกงาน… ประมาณ 20–40 วินาที',
    sampleNote: 'ผลประเมินตัวอย่างสำหรับบรีฟตัวอย่าง ตัวประเมิน AI ยังไม่เปิดใช้งาน',
    priceRange: 'ช่วงราคา', hours: 'ชั่วโมง', timeline: 'ไทม์ไลน์',
    features: 'ฟีเจอร์และยูสเซอร์สตอรี่', editHint: 'แก้ชั่วโมงหรือลบบรรทัดได้ ยอดรวมอัปเดตทันที',
    milestones: 'ไมล์สโตน', questions: 'คำถามสำหรับลูกค้า', assumptions: 'สมมติฐาน', risks: 'ความเสี่ยง', outOfScope: 'ไม่รวมในงาน',
    nextH: 'ส่งให้ลูกค้าอนุมัติ', nextP: 'เปลี่ยนเป็นขอบเขตงานที่ลูกค้าอนุมัติทีละรายการและเซ็นรับรอง แต่ละฟีเจอร์จะเป็นหนึ่งรายการพร้อมราคา',
    toScope: 'สร้างลิงก์ขอบเขตงาน', copy: 'คัดลอกเป็นข้อความ', copied: 'คัดลอกแล้ว',
    fbH: 'คุณจะส่งผลประเมินนี้ให้ลูกค้าจริงไหม?', fbYes: 'ส่ง ใช้ได้เลย', fbEdits: 'ส่ง หลังแก้ไข', fbNo: 'ไม่ส่ง',
    fbNote: 'มีอะไรผิดหรือขาดไป? (ไม่บังคับ)', fbSend: 'ส่งความคิดเห็น', fbThanks: 'ขอบคุณ! ช่วยให้เราพัฒนาได้มาก', fbPick: 'เลือกคำตอบก่อน',
    disclaimer: 'ผลประเมินจาก AI เป็นจุดเริ่มต้น ไม่ใช่การรับประกัน ตรวจสอบกับประสบการณ์ของคุณก่อนเสนอราคา',
    functional: 'ฟีเจอร์', nonfunctional: 'คุณภาพและการส่งมอบ', story: 'สตอรี่', low: 'ต่ำสุด ชม.', high: 'สูงสุด ชม.', remove: 'ลบ',
    weeks: (n) => `${n} สัปดาห์`, hrs: (a, b) => `${a}–${b} ชม.`,
    formula: (rate, buf) => `ชั่วโมง × ${rate}/ชม. บวกเผื่อ ${buf}% ราคาต่อฟีเจอร์ใช้ค่ากลางของแต่ละช่วง`,
    delivers: 'ส่งมอบ', notesAssumptions: 'สมมติฐาน',
  },
};

// Sample used for the "Use a sample brief" button and, when AI is off, a labelled sample result.
const SAMPLE_BRIEF = `Hi! We run a small café in Bangkok (two branches). We need a new website:
- menu with photos, Thai and English
- table booking online with a confirmation email or LINE message
- show our Instagram posts
- a simple page for catering orders where people fill a form
It must look good on phones. We'd like it live before New Year. Our budget is not big.`;

const SAMPLE_ESTIMATE = {
  summary: 'A bilingual (Thai/English) mobile-first café website for two branches with a photo menu, online table booking with confirmations, an Instagram feed and a catering enquiry form.',
  projectType: 'Small business website',
  features: [
    { name: 'Bilingual site structure and design', kind: 'functional', stories: [
      { title: 'Design home, menu, booking and catering pages for mobile first', hoursLow: 10, hoursHigh: 16 },
      { title: 'Language switcher with Thai and English content', hoursLow: 3, hoursHigh: 6 },
      { title: 'Branch pages with map, hours and contact', hoursLow: 2, hoursHigh: 4 } ] },
    { name: 'Photo menu', kind: 'functional', stories: [
      { title: 'Menu categories and items with photos and prices', hoursLow: 4, hoursHigh: 8 },
      { title: 'Owner can update the menu without a developer', hoursLow: 4, hoursHigh: 8 } ] },
    { name: 'Online table booking', kind: 'functional', stories: [
      { title: 'Guest picks branch, date, time and party size', hoursLow: 6, hoursHigh: 10 },
      { title: 'Confirmation email to guest and café', hoursLow: 3, hoursHigh: 5 },
      { title: 'LINE notification to the café', hoursLow: 3, hoursHigh: 8 },
      { title: 'Staff view of upcoming bookings', hoursLow: 4, hoursHigh: 8 } ] },
    { name: 'Instagram feed', kind: 'functional', stories: [
      { title: 'Show latest Instagram posts on the home page', hoursLow: 2, hoursHigh: 4 } ] },
    { name: 'Catering enquiry form', kind: 'functional', stories: [
      { title: 'Form with date, guests and menu wishes; emails the café', hoursLow: 3, hoursHigh: 5 } ] },
    { name: 'Quality, launch and handover', kind: 'nonfunctional', stories: [
      { title: 'Speed and mobile testing on common phones', hoursLow: 3, hoursHigh: 5 },
      { title: 'Basic SEO and Google Business links', hoursLow: 2, hoursHigh: 4 },
      { title: 'Domain, hosting setup and launch', hoursLow: 2, hoursHigh: 4 },
      { title: 'Project calls and owner training', hoursLow: 4, hoursHigh: 6 } ] },
  ],
  milestones: [
    { name: 'Design approved', featureIndexes: [0], weeks: 1.5 },
    { name: 'Menu, Instagram and catering live on staging', featureIndexes: [1, 3, 4], weeks: 1.5 },
    { name: 'Booking with confirmations', featureIndexes: [2], weeks: 1.5 },
    { name: 'Testing and launch', featureIndexes: [5], weeks: 1 },
  ],
  assumptions: ['The café provides menu text in both languages and photos', 'Bookings do not need deposits or payment', 'Up to two rounds of design changes'],
  openQuestions: ['Should bookings be limited by table count per time slot?', 'Do you already have a LINE Official Account?', 'Who will translate the menu?', 'Is there a deadline date for New Year?'],
  risks: ['LINE messaging needs a LINE Official Account and may add cost', 'Late menu content or photos will delay launch'],
  outOfScope: ['Online ordering or delivery', 'Payments or deposits', 'Professional food photography', 'Ongoing content updates after launch'],
};
