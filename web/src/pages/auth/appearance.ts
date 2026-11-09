// Clerk's components styled with the site's tokens, so sign-in and account settings look native
// in light and dark themes. Clerk reads CSS variables, so the theme switch needs no remount.
export function clerkAppearance() {
  return {
    variables: {
      colorPrimary: '#6D28D9',
      colorText: 'var(--ss-text)',
      colorTextSecondary: 'var(--ss-text-muted)',
      colorBackground: 'var(--ss-surface-raised)',
      colorInputBackground: 'var(--ss-bg)',
      colorInputText: 'var(--ss-text)',
      colorNeutral: 'var(--ss-text)',
      colorDanger: 'var(--ss-danger)',
      colorSuccess: 'var(--ss-success)',
      fontFamily: 'var(--ss-font-sans)',
      fontSize: '15px',
      borderRadius: '12px',
    },
    elements: {
      rootBox: { width: '100%' },
      cardBox: { width: '100%', boxShadow: 'none', border: '0' },
      card: { boxShadow: 'none', padding: '0', background: 'transparent' },
      header: { display: 'none' },
      footer: { background: 'transparent' },
      socialButtonsBlockButton: { minHeight: '48px' },
      formButtonPrimary: { minHeight: '48px', fontSize: '15px', textTransform: 'none' },
      formFieldInput: { minHeight: '48px' },
    },
  };
}
