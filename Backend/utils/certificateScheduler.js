const cron = require('node-cron');
const Event = require('../models/Event');
const { generateAndSendCertificates } = require('./certificateGenerator');

let io = null;

/**
 * Initialize the certificate scheduler
 * @param {Object} socketIo - Socket.IO instance
 */
function initializeCertificateScheduler(socketIo) {
  io = socketIo;
  
  // Run every hour to check for completed events
  cron.schedule('0 * * * *', async () => {
    console.log('\n⏰ Running certificate auto-send check...');
    await checkAndSendCertificates();
  });
  
  // Also run once on startup (after 1 minute)
  setTimeout(async () => {
    console.log('\n🚀 Running initial certificate check...');
    await checkAndSendCertificates();
  }, 60000);
  
  console.log('✅ Certificate scheduler initialized');
}

/**
 * Check for completed events and send certificates
 */
async function checkAndSendCertificates() {
  try {
    const now = new Date();
    
    // Find events that:
    // 1. Have ended (endDate is in the past)
    // 2. Have certificate template configured
    // 3. Have auto-send enabled
    // 4. Haven't sent certificates yet
    const completedEvents = await Event.find({
      endDate: { $lt: now },
      'certificate.templateUrl': { $exists: true, $ne: null },
      'certificate.autoSend': true,
      certificatesSent: false
    });
    
    if (completedEvents.length === 0) {
      console.log('ℹ️ No events ready for certificate auto-send');
      return;
    }
    
    console.log(`\n📋 Found ${completedEvents.length} event(s) ready for certificate auto-send:`);
    
    for (const event of completedEvents) {
      try {
        console.log(`\n📜 Processing event: ${event.title} (ID: ${event._id})`);
        console.log(`   End date: ${event.endDate}`);
        console.log(`   Auto-send: ${event.certificate.autoSend}`);
        
        // Generate and send certificates
        const result = await generateAndSendCertificates(event._id.toString(), io);
        
        if (result.success) {
          console.log(`✅ Successfully sent certificates for event: ${event.title}`);
          console.log(`   Successful: ${result.successful}, Failed: ${result.failed}`);
        } else {
          console.log(`⚠️ Certificate generation skipped for event: ${event.title}`);
          console.log(`   Reason: ${result.message}`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing event ${event.title}:`, error.message);
        // Continue with next event even if this one fails
      }
      
      // Small delay between events to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n✅ Certificate auto-send check completed\n');
    
  } catch (error) {
    console.error('❌ Error in certificate scheduler:', error);
  }
}

/**
 * Manually trigger certificate check (for testing)
 */
async function triggerCertificateCheck() {
  console.log('\n🔧 Manual certificate check triggered...');
  await checkAndSendCertificates();
}

module.exports = {
  initializeCertificateScheduler,
  triggerCertificateCheck
};
