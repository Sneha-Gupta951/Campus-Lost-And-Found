// Checks whether a domain can actually RECEIVE email, by looking up its
// MX (Mail eXchange) DNS records. This catches typos in the domain itself
// (e.g. "mitsgwll.ac.in" instead of "mitsgwl.ac.in") before we waste an
// OTP send on an address that could never receive it.
//
// This does NOT prove the specific mailbox (e.g. "rahul@...") exists —
// only the OTP step proves that. This just proves the domain is real.
const dns = require('dns').promises;

async function domainCanReceiveEmail(email) {
  const domain = email.split('@')[1];
  if (!domain) return false;

  try {
    const records = await dns.resolveMx(domain);
    return records.length > 0;
  } catch (err) {
    // ENOTFOUND / ENODATA means the domain has no mail server
    return false;
  }
}

module.exports = { domainCanReceiveEmail };
