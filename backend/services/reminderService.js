import User from "../models/User.model.js";
import { sendDonationReminderEmail } from "../utils/emailService.js";
import { createNotification } from "./notificationService.js";

const ELIGIBILITY_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const processDonationReminders = async () => {
  console.log("Running donation reminder job...");

  const ninetyDaysAgo = new Date(Date.now() - ELIGIBILITY_DAYS * MS_PER_DAY);

  const ninetyOneDaysAgo = new Date(
    Date.now() - (ELIGIBILITY_DAYS + 1) * MS_PER_DAY,
  );

  const eligibleUsers = await User.find({
    isDonor: true,
    "donorInfo.lastDonationDate": {
      $lte: ninetyDaysAgo,
      $gt: ninetyOneDaysAgo,
    },
    "emailPreferences.reminders": true,
  }).select("name email donorInfo");

  console.log(`Found ${eligibleUsers.length} users eligible for reminders.`);

  for (const user of eligibleUsers) {
    try {
      // Send Email
      await sendDonationReminderEmail(user);

      // Create In-App Notification
      await createNotification({
        recipient: user._id,
        recipientModel: "User",
        title: "You are eligible to donate again! ❤️",
        message: `It has been 90 days since your last donation. Your contribution can save up to 3 lives. Check local blood banks today!`,
        type: "reminder",
        actionUrl: "/donors",
      });

      console.log(`Reminder sent to ${user.email}`);
    } catch (error) {
      console.error(`Failed to send reminder to ${user.email}:`, error);
    }
  }
};
export const checkAndSendSingleReminder = async (userId) => {
  const user = await User.findById(userId);
  if (!user || !user.isDonor || !user.emailPreferences?.reminders) return;

  const lastDonationDate =
    user.donorInfo?.lastDonationDate || user.lastDonationDate;
  if (!lastDonationDate) return;

  const ninetyDaysAgo = new Date(Date.now() - ELIGIBILITY_DAYS * MS_PER_DAY);

  // Is user eligible?
  const isEligibleTime = new Date(lastDonationDate) <= ninetyDaysAgo;

  // Avoid spamming: Check if we already sent a reminder for this eligibility cycle
  const lastReminderSentAt = user.donorInfo?.lastReminderSentAt;
  const alreadyRemindedThisCycle =
    lastReminderSentAt &&
    new Date(lastReminderSentAt) > new Date(lastDonationDate);

  if (isEligibleTime && !alreadyRemindedThisCycle) {
    try {
      await sendDonationReminderEmail(user);

      await createNotification({
        recipient: user._id,
        recipientModel: "User",
        title: "You are eligible to donate again! ❤️",
        message: `It has been over 90 days since your last donation. Your blood can save lives!`,
        type: "reminder",
        actionUrl: "/donors",
      });

      // Track that we sent it
      await User.findByIdAndUpdate(userId, {
        $set: { "donorInfo.lastReminderSentAt": new Date() },
      });

      console.log(`On-demand reminder sent to ${user.email}`);
    } catch (error) {
      console.error(
        `Failed to send on-demand reminder to ${user.email}:`,
        error,
      );
    }
  }
};
