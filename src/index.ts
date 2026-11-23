import { formatInTimeZone } from "date-fns-tz";
import { config } from "dotenv";
import cron from "node-cron";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  createScheduleExceptions,
  getStudentAppointments,
} from "./services/daysmart.js";
import {
  discordClient,
  sendAssessmentReport,
  sendAttendanceReport,
  sendBirthdayReport,
  sendCardExpirationReport,
  sendEODStudentReport,
  sendReconciliationReport,
} from "./services/discord.js";
import {
  clearSpreadsheetData,
  writeSpreadsheetData,
} from "./services/googleSheets.js";
import {
  handleBODRadiusOps,
  handleEODRadiusOps,
  handleOvernightRadiusOps,
  handleWeeklyRadiusOps,
} from "./services/radius.js";
import { isHolidayOrClosure } from "./utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, "../.env.local") });

discordClient.login(process.env.DISCORD_TOKEN);
discordClient.once("clientReady", async () => {
  if (!discordClient.user) {
    console.error("No user found in client.");
    return;
  }
  console.log(`Logged into Discord as ${discordClient.user.tag}`);

  // Sun-Thu at 3:00 AM
  // Delayed Operations - Get assessment info and retry failed payments
  cron.schedule(
    "0 3 * * 0-4",
    async () => {
      if (isHolidayOrClosure()) {
        console.log("Skipping automation due to center closure.");
        return;
      }
      await handleOvernightRadiusOps();
    },
    { timezone: "America/Chicago" },
  );

  // Sun at 9:00 AM
  // Weekly Operations - Get student birthday info, expiring card info, and attendance data.
  cron.schedule(
    "0 9 * * 0",
    async () => {
      if (isHolidayOrClosure()) {
        console.log("Skipping automation due to center closure.");
        return;
      }
      const { birthdays, cardsExpiringList, nonAttendingStudents } =
        await handleWeeklyRadiusOps();
      await sendBirthdayReport(birthdays);
      await sendCardExpirationReport(cardsExpiringList);
      await sendAttendanceReport(nonAttendingStudents);
    },
    { timezone: "America/Chicago" },
  );

  // Sun-Thu at 9:00 AM
  // BOD Operations - Get student appointments, enrolled students, and payment issues.
  cron.schedule(
    "0 9 * * 0-4",
    async () => {
      if (isHolidayOrClosure()) {
        console.log("Skipping automation due to center closure.");
        return;
      }
      const allAppointments = await getStudentAppointments();
      const dailyAppointments = allAppointments
        .filter(
          (appointment, i) =>
            i === 0 ||
            appointment[1] ===
              formatInTimeZone(new Date(), "America/Chicago", "MM/dd/yyyy"),
        )
        .map((appointment) => {
          const childName = appointment[0] as string;
          const duration = appointment[2] as string;
          const time = appointment[3] as string;
          const service = appointment[4] as string;
          const calendar = appointment[5] as string;
          const status = appointment[6] as string;

          const result: string[] = [
            childName,
            duration,
            time,
            service,
            calendar,
            status,
          ];

          return result;
        });

      await clearSpreadsheetData(
        "Instruction Dashboard",
        "'DaySmart (All Data)'!B2:H",
      );
      await writeSpreadsheetData(
        "Instruction Dashboard",
        "'DaySmart (All Data)'!B2:H",
        allAppointments,
      );

      await clearSpreadsheetData("Instruction Dashboard", "DaySmart!B2:G");
      await writeSpreadsheetData(
        "Instruction Dashboard",
        "DaySmart!B2:G",
        dailyAppointments,
      );

      await createScheduleExceptions();

      const { payments, /* successfulPaymentAttemptsList, */ totalExpected } =
        await handleBODRadiusOps();

      const students = payments
        .map((payment) => {
          const students: string[] = payment[2] as string[];
          return students;
        })
        .flat(Infinity);
      const flaggedStudents: string[][] = [...new Set(students)]
        .sort()
        .map((student) => [student]) as string[][];

      await clearSpreadsheetData(
        "Instruction Dashboard",
        "'Flagged Students - HELPER'!A:A",
      );

      await writeSpreadsheetData(
        "Instruction Dashboard",
        "'Flagged Students - HELPER'!A:A",
        flaggedStudents,
      );

      // await sendPaymentAttemptsReport(successfulPaymentAttemptsList);
      await sendReconciliationReport(payments, totalExpected);
      await sendAssessmentReport();
    },
    { timezone: "America/Chicago" },
  );

  // Mon–Thu at 7:45 PM
  // EOD Operations - Run BOD report.
  cron.schedule(
    "45 19 * * 1-4",
    async () => {
      if (isHolidayOrClosure()) {
        console.log("Skipping automation due to center closure.");
        return;
      }
      const { checkedInStudents } = await handleEODRadiusOps();
      await sendEODStudentReport(checkedInStudents);
    },
    { timezone: "America/Chicago" },
  );

  // Sun at 5:15 PM
  // EOD Operations - Run EOD report.
  cron.schedule(
    "15 17 * * 0",
    async () => {
      if (isHolidayOrClosure()) {
        console.log("Skipping automation due to center closure.");
        return;
      }
      const { checkedInStudents } = await handleEODRadiusOps();
      await sendEODStudentReport(checkedInStudents);
    },
    { timezone: "America/Chicago" },
  );

  // Sat at 9:00 AM
  // DaySmart automation - Update spots ahead of Sunday.
  cron.schedule(
    "0 9 * * 6",
    async () => {
      if (isHolidayOrClosure()) {
        console.log("Skipping automation due to center closure.");
        return;
      }
      await createScheduleExceptions();
    },
    { timezone: "America/Chicago" },
  );

  // Testing only
  // (async () => {
  //   // Insert code here.
  // })();
});
