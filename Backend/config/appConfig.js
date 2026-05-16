// Application-level configuration defaults
const CERTIFICATE_HOURS_REQUIRED = parseInt(process.env.CERTIFICATE_HOURS_REQUIRED, 10) || 240; // default: 240 hours
const ATTENDANCE_MARKING_GRACE_DAYS = parseInt(process.env.ATTENDANCE_MARKING_GRACE_DAYS, 10) || 7; // default: 7 days
const MIN_REGISTRATION_LEAD_HOURS = parseInt(process.env.MIN_REGISTRATION_LEAD_HOURS, 10) || 2; // default: 2 hours

module.exports = {
  CERTIFICATE_HOURS_REQUIRED,
  ATTENDANCE_MARKING_GRACE_DAYS,
  MIN_REGISTRATION_LEAD_HOURS
};
