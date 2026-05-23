const Participation = require('../models/Participation');
const Event = require('../models/Event');
const AuditLog = require('../models/AuditLog');

async function reconcileEventParticipants(eventId, options = {}) {
  const { autoFix = false, performedBy = null } = options;

  const event = await Event.findById(eventId);
  if (!event) {
    return { success: false, message: 'Event not found', eventId };
  }

  const realCount = await Participation.countDocuments({
    event: event._id,
    status: 'approved',
    waitlistStatus: { $ne: 'waitlisted' }
  }).catch(() => 0);

  const previous = Number(event.currentParticipants) || 0;

  if (previous === realCount) {
    return { success: true, eventId, previous, current: realCount, changed: false };
  }

  // Record an audit entry of the mismatch
  await AuditLog.create({
    action: 'reconcile_event_participants',
    details: { event: event._id, previous, actual: realCount, autoFix },
    performedBy: performedBy || null,
    timestamp: new Date()
  }).catch(() => null);

  if (autoFix) {
    event.currentParticipants = realCount;
    await event.save();
    return { success: true, eventId, previous, current: realCount, changed: true, autoFixed: true };
  }

  return { success: true, eventId, previous, current: realCount, changed: true, autoFixed: false };
}

async function scanEventsReconciliation(autoFix = false) {
  // Find events where counters may be present
  const events = await Event.find({}).select('_id currentParticipants').lean();
  const results = [];
  for (const e of events) {
    try {
      // Reuse reconcile logic per event
      // Note: performedBy left null for scheduled runs
      // eslint-disable-next-line no-await-in-loop
      const res = await reconcileEventParticipants(e._id, { autoFix, performedBy: null });
      if (res.changed) results.push(res);
    } catch (err) {
      // continue on errors per-event
      results.push({ success: false, eventId: e._id, error: err.message });
    }
  }
  return results;
}

module.exports = { reconcileEventParticipants, scanEventsReconciliation };
