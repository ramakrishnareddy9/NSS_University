const DEFAULT_ALLOWED_DOMAINS = ['.edu', '.ac.in', '.edu.in'];

function getAllowedEmailDomains() {
  const configured = process.env.INSTITUTION_EMAIL_DOMAINS;
  if (configured && configured.trim()) {
    return configured
      .split(',')
      .map(domain => domain.trim().toLowerCase())
      .filter(Boolean);
  }

  return DEFAULT_ALLOWED_DOMAINS;
}

function isInstitutionalEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail.includes('@')) {
    return false;
  }

  const allowedDomains = getAllowedEmailDomains();
  return allowedDomains.some(domain => normalizedEmail.endsWith(domain));
}

module.exports = {
  getAllowedEmailDomains,
  isInstitutionalEmail
};
