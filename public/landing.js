'use strict';
const PLAN_NAMES = { free: 'Free', pro: 'Pro', agency: 'Agency' };
if (/^#waitlist/.test(location.hash)) setTimeout(() => { const h = document.getElementById('wl-h'); if (h) h.focus(); }, 300);
$('#wl').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#wl-err').textContent = '';
  try {
    await api('waitlist', { email: $('#wl-email').value, plan: $('#wl-plan').value, note: $('#wl-note').value, company: $('#wl-hp').value });
    const plan = $('#wl-plan').value;
    $('#wl-ok').textContent = plan === 'free'
      ? 'You are on the list. I will email you about SignedScope updates.'
      : `You are on the list. I will email you when ${PLAN_NAMES[plan]} opens.`;
    $('#wl-ok').classList.remove('hidden');
    e.target.querySelector('button').disabled = true;
  } catch (err) { $('#wl-err').textContent = err.message; }
});
const plan = new URLSearchParams(location.search).get('plan');
if (Object.hasOwn(PLAN_NAMES, plan)) $('#wl-plan').value = plan;
