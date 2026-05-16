// Test email configuration with Brevo
// Run with: node backend/utils/test-email.js

require('dotenv').config({ path: './backend/.env' });
const { sendEmail } = require('./notifications');

async function testEmail() {
  console.log('Testing Brevo email configuration...\n');
  
  if (!process.env.BREVO_API_KEY) {
    console.error('❌ Brevo API key not found in .env file');
    console.log('\nPlease add the following to backend/.env:');
    console.log('BREVO_API_KEY=your_brevo_api_key');
    console.log('BREVO_SENDER_EMAIL=your_verified_sender@example.com');
    console.log('BREVO_SENDER_NAME=NSS Portal');
    console.log('\n📝 To get your Brevo API key:');
    console.log('1. Sign up at https://www.brevo.com/');
    console.log('2. Go to https://app.brevo.com/settings/keys/api');
    console.log('3. Create a new API key and copy it');
    console.log('4. Verify your sender email at https://app.brevo.com/senders');
    return;
  }

  console.log('Brevo Configuration:');
  console.log(`  API Key: ${process.env.BREVO_API_KEY ? '✅ Set (***' + process.env.BREVO_API_KEY.slice(-4) + ')' : '❌ NOT SET'}`);
  console.log(`  Sender Email: ${process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER || 'noreply@nssportal.com'}`);
  console.log(`  Sender Name: ${process.env.BREVO_SENDER_NAME || 'NSS Portal'}\n`);

  // Prompt for test recipient email
  const testRecipient = process.env.TEST_EMAIL || process.env.EMAIL_USER || 'test@example.com';
  
  console.log(`Sending test email to: ${testRecipient}...`);
  console.log('(Set TEST_EMAIL in .env to change recipient)\n');
  
  const result = await sendEmail(
    testRecipient,
    'Test Email from NSS Portal (Brevo)',
    'This is a test email to verify Brevo email configuration.',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1 style="color: #0ea5e9;">Test Email</h1><p>This is a test email to verify Brevo email configuration.</p><p>If you received this, your Brevo integration is working correctly! 🎉</p></div>'
  );

  if (result.success) {
    console.log('\n✅ Email sent successfully via Brevo!');
    console.log(`Message ID: ${result.messageId}`);
    console.log('\n💡 Check your inbox (and spam folder) for the test email.');
  } else {
    console.log('\n❌ Email failed to send');
    console.log(`Error: ${result.error || result.message}`);
    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Verify your API key is correct');
    console.log('2. Ensure your sender email is verified in Brevo');
    console.log('3. Check your Brevo account status and limits');
    console.log('4. Visit https://app.brevo.com/settings/keys/api to manage API keys');
  }
}

testEmail().catch(console.error);

