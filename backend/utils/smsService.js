import twilio from "twilio";

let client = null;

const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, "");

  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return `+${cleaned}`;
  }

  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }

  return phone.startsWith("+") ? phone : `+${cleaned}`;
};

export const sendSMS = async (to, message) => {
  if (
    !client &&
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  ) {
    client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
  }

  if (!client) {
    console.warn("[SMS] Twilio not fully configured. Skipping delivery.");
    return null;
  }

  try {
    const formattedTo = formatPhoneNumber(to);
    if (!formattedTo) return null;

    const fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    const response = await client.messages.create({
      body: message,
      from: fromPhoneNumber,
      to: formattedTo,
    });

    console.log(
      `[SMS] Sent successfully to ${formattedTo} (SID: ${response.sid})`,
    );
    return response;
  } catch (error) {
    console.error(`[SMS] Failed to send to ${to}: ${error.message}`);
    return null;
  }
};

export const sendEmergencySMS = async (
  to,
  donorName,
  bloodGroup,
  hospitalName,
) => {
  const name = donorName || "Donor";
  const hospital = hospitalName || "a nearby hospital";

  const message = `Hello ${name}, there is an EMERGENCY request for ${bloodGroup} blood at ${hospital}. Your help could save a life! - RaktSarthi`;

  return sendSMS(to, message);
};
