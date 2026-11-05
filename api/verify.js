'use strict';
const { open, handler } = require('./_lib');

// Anyone holding a link can check it was issued by SignedScope and not modified.
module.exports = handler(async (body) => {
  const { obj, hash } = open(body.token);
  return { valid: true, hash, data: obj };
});
