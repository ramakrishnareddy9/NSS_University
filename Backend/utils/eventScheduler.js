const cron = require('node-cron');
const Event = require('../models/Event');

let io = null;

/**
 * Initialize the event scheduler for automatic status transitions
 * @param {Object} socketIo - Socket.IO instance
 */
function initializeEventScheduler(socketIo) {
  io = socketIo;
  
  // Run every 15 minutes to check for status transitions
  cron.schedule('*/15 * * * *', async () => {
    console.log('\n⏰ Running event auto-status transition check...');
    await checkAndTransitionEvents();
  });
  
  // Also run once on startup (after 2 minutes)
  setTimeout(async () => {
    console.log('\n🚀 Running initial event status transition check...');
    await checkAndTransitionEvents();
  }, 120000);
  
  console.log('✅ Event scheduler initialized (runs every 15 minutes)');
}

/**
 * Check for events that need status transitions and update them
 */
async function checkAndTransitionEvents() {
  try {
    const now = new Date();
    
    // TRANSITION 1: published → ongoing (startDate reached)
    const publishedToOngoing = await Event.find({
      status: 'published',
      startDate: { $lte: now },
      isDeleted: { $ne: true }
    });
    
    if (publishedToOngoing.length > 0) {
      console.log(`\n📋 Found ${publishedToOngoing.length} event(s) to transition from published → ongoing`);
      
      for (const event of publishedToOngoing) {
        try {
          event.status = 'ongoing';
          await event.save();
          
          console.log(`✅ Event "${event.title}" transitioned to ongoing`);
          
          // Emit admin-scoped socket event (avoid public broadcast)
          if (io) {
            io.to('admin-notifications').emit('event-status-changed', {
              type: 'event-status-changed',
              eventId: event._id,
              newStatus: 'ongoing',
              message: `Event "${event.title}" is now ongoing`,
              timestamp: new Date()
            });
          }
        } catch (error) {
          console.error(`❌ Error transitioning event ${event.title}:`, error.message);
        }
      }
    }
    
    // TRANSITION 2: ongoing → completed (endDate passed)
    const ongoingToCompleted = await Event.find({
      status: 'ongoing',
      endDate: { $lt: now },
      isDeleted: { $ne: true }
    });
    
    if (ongoingToCompleted.length > 0) {
      console.log(`\n📋 Found ${ongoingToCompleted.length} event(s) to transition from ongoing → completed`);
      
      for (const event of ongoingToCompleted) {
        try {
          event.status = 'completed';
          await event.save();
          
          console.log(`✅ Event "${event.title}" transitioned to completed`);
          
          // Emit admin-scoped socket event (avoid public broadcast)
          if (io) {
            io.to('admin-notifications').emit('event-status-changed', {
              type: 'event-status-changed',
              eventId: event._id,
              newStatus: 'completed',
              message: `Event "${event.title}" is now completed`,
              timestamp: new Date()
            });
          }
        } catch (error) {
          console.error(`❌ Error transitioning event ${event.title}:`, error.message);
        }
      }
    }
    
    // TRANSITION 3: published → completed (endDate passed, skipping ongoing)
    // This handles events that may have been set to published but already past their end date
    const publishedToCompleted = await Event.find({
      status: 'published',
      endDate: { $lt: now },
      isDeleted: { $ne: true }
    });
    
    if (publishedToCompleted.length > 0) {
      console.log(`\n📋 Found ${publishedToCompleted.length} event(s) to transition from published → completed (past end date)`);
      
      for (const event of publishedToCompleted) {
        try {
          event.status = 'completed';
          await event.save();
          
          console.log(`✅ Event "${event.title}" transitioned to completed (skipped ongoing)`);
          
          // Emit admin-scoped socket event (avoid public broadcast)
          if (io) {
            io.to('admin-notifications').emit('event-status-changed', {
              type: 'event-status-changed',
              eventId: event._id,
              newStatus: 'completed',
              message: `Event "${event.title}" is now completed`,
              timestamp: new Date()
            });
          }
        } catch (error) {
          console.error(`❌ Error transitioning event ${event.title}:`, error.message);
        }
      }
    }
    
    console.log('✅ Event auto-status transition check completed\n');
    
  } catch (error) {
    console.error('❌ Error in event scheduler:', error);
  }
}

/**
 * Manually trigger event transition check (for testing)
 */
async function triggerEventTransitionCheck() {
  console.log('\n🔧 Manual event transition check triggered...');
  await checkAndTransitionEvents();
}

module.exports = {
  initializeEventScheduler,
  triggerEventTransitionCheck
};
