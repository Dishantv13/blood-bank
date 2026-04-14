import twilio from 'twilio';
let client = null;

// Sends SMS via Twilio using lazy initialization for .env safety
export const sendSMS = async (to, message) => {
  // Initialize client only when first needed
  if (!client && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }

  if (!client) {
    console.warn('Twilio SMS service not configured. Skipping SMS delivery.');
    return null;
  }

  try {
    const fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    const response = await client.messages.create({
      body: message,
      from: fromPhoneNumber,
      to,
    });
    
    console.log(`[SMS] Sent successfully to ${to} (SID: ${response.sid})`);
    return response;
  } catch (error) {
    console.error(`[SMS] Failed to send to ${to}: ${error.message}`);
    throw error;
  }
};

export const sendEmergencySMS = async (to, donorName, bloodGroup, hospitalName) => {
  const message = `Hello ${donorName}, there is an EMERGENCY request for ${bloodGroup} blood at ${hospitalName}. Your help could save a life! - RaktSarthi`;
  return sendSMS(to, message);
};
