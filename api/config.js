'use strict';
// Public browser config: the Supabase project URL and its anon (public) key. Both are safe to
// expose; Row Level Security protects the data. Returns enabled:false until accounts are set up.
module.exports = (req, res) => {
  const enabled = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).json(enabled ? { enabled, supabaseUrl: process.env.SUPABASE_URL, supabaseAnonKey: process.env.SUPABASE_ANON_KEY } : { enabled });
};
