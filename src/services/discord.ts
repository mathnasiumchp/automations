import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  ComponentType,
  GatewayIntentBits,
  Message,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
  type TextBasedChannel,
} from "discord.js";
import { dollarFormatter, formatMessage } from "../utils.js";
import { getSpreadsheetData, getStudentList } from "./googleSheets.js";

const discordChannels = new Map([
  ["admin-team", "1476779118006763703"],
  ["automated-reminders", "1489433511470436403"],
  ["lead-team", "1457443742842753148"],
  ["test-channel", "1481388054148284569"],
  ["general-updates", "1457443333541597392"],
] as const);

type DiscordChannelName = Parameters<typeof discordChannels.get>[0];

export const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

async function fetchChannel(channelName: DiscordChannelName) {
  return await discordClient.channels.fetch(discordChannels.get(channelName)!);
}

export async function sendBirthdayReport(birthdays: string) {
  console.log("Running birthday report...");
  const channel = await fetchChannel("general-updates");

  // Check if the channel exists AND is a text-based channel
  if (!channel) {
    console.error("Channel not found.");
    return;
  }
  if (!channel.isTextBased() || !("send" in channel)) {
    console.error("Channel cannot send messages.");
    return;
  }

  const today = new Date();
  const timezone = "America/Chicago";

  await channel.send(
    `# 🎂 Birthday Report - ${formatInTimeZone(today, timezone, "eee, MMM d")}\n-# Below is an auto-generated birthday report for the week of ${formatInTimeZone(today, timezone, "MM/dd/yyyy")}. [Click here](https://radius.mathnasium.com/BirthdayReport) to navigate to the Radius Student Birthday Report. For any questions or concerns, please reach out to the admin team.\n\n` +
      birthdays,
  );
}

export async function sendCardExpirationReport(cardsExpiring: string) {
  console.log("Running card expiration report...");
  const channel = await fetchChannel("admin-team");

  // Check if the channel exists AND is a text-based channel
  if (!channel) {
    console.error("Channel not found.");
    return;
  }
  if (!channel.isTextBased() || !("send" in channel)) {
    console.error("Channel cannot send messages.");
    return;
  }

  const today = new Date();
  const timezone = "America/Chicago";

  await channel.send(
    `# 💳 Card Expiration Report - ${formatInTimeZone(today, timezone, "eee, MMM d")}\n-# Below is an auto-generated card expiration report for the week of ${formatInTimeZone(today, timezone, "MM/dd/yyyy")}. [Click here](https://radius.mathnasium.com/BillingExceptionsReport) to navigate to the Radius Billing Exceptions Report. For any questions or concerns, please reach out to the admin team.\n\n` +
      cardsExpiring,
  );
}

export async function sendPaymentAttemptsReport(
  successfulPaymentAttemptsList: string,
) {
  console.log("Running payment attempts report...");
  const channel = await fetchChannel("admin-team");

  // Check if the channel exists AND is a text-based channel
  if (!channel) {
    console.error("Channel not found.");
    return;
  }
  if (!channel.isTextBased() || !("send" in channel)) {
    console.error("Channel cannot send messages.");
    return;
  }

  const today = new Date();
  const timezone = "America/Chicago";

  await channel.send(
    `# 💳 Payment Attempts Report - ${formatInTimeZone(today, timezone, "eee, MMM d")}\n-# Below is an auto-generated payment attempts report for the week of ${formatInTimeZone(today, timezone, "MM/dd/yyyy")}. [Click here](https://radius.mathnasium.com/BillingExceptionsReport) to navigate to the Radius Billing Exceptions Report. For any questions or concerns, please reach out to the admin team.\n\n` +
      successfulPaymentAttemptsList,
  );
}

export async function sendEODStudentReport(checkedInStudents: string) {
  console.log("Running daily report...");
  const channel = await fetchChannel("automated-reminders");

  // Check if the channel exists AND is a text-based channel
  if (!channel) {
    console.error("Channel not found.");
    return;
  }
  if (!channel.isTextBased() || !("send" in channel)) {
    console.error("Channel cannot send messages.");
    return;
  }

  const today = new Date();
  const timezone = "America/Chicago";

  const lastMinuteStudents = await getStudentList("Last-Minute");
  const cancelledStudents = await getStudentList("Cancelled");
  const noShowStudents = await getStudentList("No Show");

  await channel.send(
    `# 📋 EOD Report - ${formatInTimeZone(today, timezone, "eee, MMM d")}\n-# Below is an auto-generated student sessions report for today (${formatInTimeZone(today, timezone, "MM/dd/yyyy")}). [Click here](https://docs.google.com/spreadsheets/d/1TKA8M9LQciU_NjYczRDpWzhBAYeVFEPPSvhs3UBY4tg/edit?gid=0#gid=0) to navigate to the Instruction Dashboard. For any questions or concerns, please reach out to the admin team.\n\n` +
      [
        lastMinuteStudents,
        cancelledStudents,
        noShowStudents,
        checkedInStudents,
      ].join("\n—————————————————————————\n"),
  );
}

export async function sendReconciliationReport(
  payments: (string | number | string[] | Date | undefined)[][],
  totalExpected: number,
) {
  const adminTeamChannel = await fetchChannel("admin-team");
  const leadTeamChannel = await fetchChannel("automated-reminders");

  // Check if the channels exists AND are text-based channels
  if (!adminTeamChannel) {
    console.error("Admin team channel not found.");
    return;
  }
  if (!adminTeamChannel.isTextBased() || !("send" in adminTeamChannel)) {
    console.error("Admin team channel cannot send messages.");
    return;
  }
  if (!leadTeamChannel) {
    console.error("Lead team channel not found.");
    return;
  }
  if (!leadTeamChannel.isTextBased() || !("send" in leadTeamChannel)) {
    console.error("Lead team channel cannot send messages.");
    return;
  }

  const today = new Date();
  const timezone = "America/Chicago";

  function formatPayments(): string[] {
    const months = new Map([
      [0, "January"],
      [1, "February"],
      [2, "March"],
      [3, "April"],
      [4, "May"],
      [5, "June"],
      [6, "July"],
      [7, "August"],
      [8, "September"],
      [9, "October"],
      [10, "November"],
      [11, "December"],
    ]);
    const result = [];

    const listify = (list: string[]) => {
      if (list.length === 0) return "";
      if (list.length === 1) return list[0];
      if (list.length === 2) return list.join(" and ");

      const result = [];
      for (let i = 0; i < list.length; i++) {
        const listItem = list[i];
        const isLastListItem = i === list.length - 1;

        if (isLastListItem) result.push(`and ${listItem}`);
        else result.push(listItem);
      }

      return result.join(", ");
    };

    for (const [monthIndex, month] of months) {
      const filteredPayments = payments.filter((payment) => {
        const billingDate = payment[4] as Date;
        const billingMonth = billingDate.getMonth();
        return billingMonth === monthIndex;
      });

      if (filteredPayments.length > 0) {
        const totalMonthlyExpected = filteredPayments.reduce((total, row) => {
          const amtExpected = row[5] as number; //
          return total + amtExpected;
        }, 0);
        const monthlyBlockText =
          `**${month}${totalMonthlyExpected === 0 ? "" : ` — ${dollarFormatter.format(totalMonthlyExpected)}`}**\n` +
          filteredPayments
            .map((payment, i) => {
              const accountStatus = payment[0] as string;
              const accountName = (payment[1] as string).trim();
              const students = payment[2] as string[];
              const paymentStatus = payment[3] as string;
              const billingDate = payment[4] as Date;
              const amtExpected = payment[5] as number;
              const amtPaid = payment[6] as number;

              const statusPrefix =
                accountStatus === "Inactive" ? " (Inactive)" : "";
              const formattedBillingDate = formatInTimeZone(
                billingDate,
                timezone,
                "M/d/yy",
              );

              const balance = amtExpected - amtPaid;
              const lateFee = 35;

              const formattedAmtExpected = dollarFormatter.format(amtExpected);
              const formattedAmtPaid = dollarFormatter.format(amtPaid);
              const formattedBalance = dollarFormatter.format(balance);
              const formattedLateFee = dollarFormatter.format(lateFee);
              const formattedTotalOwed = dollarFormatter.format(
                balance + lateFee,
              );

              const paymentDesc =
                amtExpected < 0
                  ? `: ${formattedAmtExpected} - Unreconciled Credit`
                  : amtExpected === amtPaid
                    ? `: ${formattedAmtPaid} - ${paymentStatus}`
                    : `\n  * ${students.length === 1 ? "Student" : "Students"}: ${listify(students)}\n  * Paid ${formattedAmtPaid} out of ${formattedAmtExpected} as of ${formattedBillingDate}\n  * Balance: ${formattedTotalOwed} (${formattedBalance} + ${formattedLateFee} fee)`;

              return `${i + 1}. ${accountName}${statusPrefix}${paymentDesc}`;
            })
            .join("\n");

        result.push(monthlyBlockText);
      }
    }

    const messageBuckets: string[] = [];
    let currentBucket = "";
    const delimiter = "\n—————————————————————————\n";
    const maxCharLimit = 1700;

    for (const monthText of result) {
      // If a single month is somehow huge on its own, push it to its own bucket
      if (monthText.length >= maxCharLimit) {
        if (currentBucket) {
          messageBuckets.push(currentBucket);
          currentBucket = "";
        }
        messageBuckets.push(monthText);
        continue;
      }

      // Determine what the bucket would look like if we add this month
      const prospectiveText = currentBucket
        ? currentBucket + delimiter + monthText
        : monthText;

      if (prospectiveText.length > maxCharLimit) {
        // It exceeds the limit, so save the old bucket and start a new one with this month
        messageBuckets.push(currentBucket);
        currentBucket = monthText;
      } else {
        // It fits, so keep building the current bucket
        currentBucket = prospectiveText;
      }
    }

    // Push the final leftover bucket if it has data
    if (currentBucket) {
      messageBuckets.push(currentBucket);
    }

    return messageBuckets; // Returns an array of grouped data.
  }

  function formatStudents(): string {
    const allStudents = new Set();

    for (const payment of payments) {
      const accountStatus = payment[0] as string;
      const students = payment[2] as string[];
      const amtExpected = payment[5] as number;

      if (accountStatus === "Active" && amtExpected >= 0) {
        students.forEach((student) => allStudents.add(student));
      }
    }

    const message =
      "Hello team! Please review this list before conducting any sessions today.\n * **Action Required:** If a student on this list arrives, do not start their session.\n * **Next Steps:** Immediately and __discreetly__ notify an admin team member to handle the check-in, and have the student wait at the front.\n * **Discretion:** Ensure a smooth, private experience for our families, and please avoid discussing any account details aloud in the instruction zones or near other students.\n\n";
    const studentsList = [...allStudents]
      .sort()
      .map((student, i) => `${i + 1}. ${student}`);

    return message + studentsList.join("\n");
  }

  if (payments.length > 0) {
    const formattedPaymentInfo = formatPayments();
    const formattedFlaggedStudentsInfo = formatStudents();

    console.log(formattedPaymentInfo);
    console.log(formattedFlaggedStudentsInfo);

    for (let i = 0; i < formattedPaymentInfo.length; i++) {
      const header = `# 💰 Payments Report - ${formatInTimeZone(today, timezone, "eee, MMM d")} | ${dollarFormatter.format(totalExpected)} in unreconciled revenue\n-# Below is an auto-generated payments report for today (${formatInTimeZone(today, timezone, "MM/dd/yyyy")}). [Click here](https://radius.mathnasium.com/Payment) to navigate to the Payment Reconciliation dashboard in Radius.\n\n`;
      const message = (
        i === 0 ? header + formattedPaymentInfo[i] : formattedPaymentInfo[i]
      ) as string;
      await adminTeamChannel.send(message);
    }

    await leadTeamChannel.send(
      `# 🚩 Flagged Students Report - ${formatInTimeZone(today, timezone, "eee, MMM d")}\n-# Below is an auto-generated students report for today (${formatInTimeZone(today, timezone, "MM/dd/yyyy")}). For any questions or concerns, please reach out to the admin team.\n\n` +
        formattedFlaggedStudentsInfo,
    );
  } else {
    console.log("All payments have been reconciled in Radius!");
  }
}

export async function sendAssessmentReport() {
  const headers = await getSpreadsheetData(
    "Instruction Dashboard",
    "'Radius Students - HELPER'!A1:F1",
  );

  const assessmentInfo = await getSpreadsheetData(
    "Instruction Dashboard",
    "'Radius Students - HELPER'!A2:F",
  );

  const studentNameCol = headers.flat().indexOf("Student Name");
  const radiusLinkCol = headers.flat().indexOf("Radius Link");
  const lastDateCol = headers.flat().indexOf("Last Date");
  const needsReassessmentCol = headers.flat().indexOf("Needs Reassessment");

  if (
    Math.min(
      studentNameCol,
      radiusLinkCol,
      lastDateCol,
      needsReassessmentCol,
    ) === -1
  ) {
    return;
  }

  const reassessingStudents = assessmentInfo
    .filter((row) => row[needsReassessmentCol] === "TRUE")
    .map(
      (row, i) =>
        `${i + 1}. [${row[studentNameCol]}](${row[radiusLinkCol]}) - ${row[lastDateCol]}`,
    );

  if (reassessingStudents.length === 0) return;

  const leadTeamChannel = await fetchChannel("automated-reminders");

  // Check if the channels exists AND are text-based channels
  if (!leadTeamChannel) {
    console.error("Lead team channel not found.");
    return;
  }
  if (!leadTeamChannel.isTextBased() || !("send" in leadTeamChannel)) {
    console.error("Lead team channel cannot send messages.");
    return;
  }

  const today = new Date();
  const timezone = "America/Chicago";

  const formattedAssessmentInfo = formatMessage(reassessingStudents);

  for (let i = 0; i < formattedAssessmentInfo.length; i++) {
    const header = `# 📚 Assessment Report - ${formatInTimeZone(today, timezone, "eee, MMM d")} | ${reassessingStudents.length} ${reassessingStudents.length === 1 ? "student" : "students"}\n-# Below is an auto-generated assessments report for today (${formatInTimeZone(today, timezone, "MM/dd/yyyy")}).\n\n`;
    const message = (
      i === 0 ? header + formattedAssessmentInfo[i] : formattedAssessmentInfo[i]
    ) as string;
    await leadTeamChannel.send(message);
  }

  console.log(reassessingStudents);
}

export async function sendAttendanceReport(students: string[]) {
  const leadTeamChannel = await fetchChannel("test-channel");

  // Check if the channels exists AND are text-based channels
  if (!leadTeamChannel) {
    console.error("Lead team channel not found.");
    return;
  }
  if (!leadTeamChannel.isTextBased() || !("send" in leadTeamChannel)) {
    console.error("Lead team channel cannot send messages.");
    return;
  }

  let message: string;

  if (students.length === 0) {
    message =
      "There are no students with attendance issues, so no report is generated for today!";
    await leadTeamChannel.send(message);
  }

  const today = new Date();
  const timezone = "America/Chicago";

  const formattedInfo = formatMessage(students);

  for (let i = 0; i < formattedInfo.length; i++) {
    const header = `# 📋 Attendance Report - ${formatInTimeZone(today, timezone, "eee, MMM d")} | ${students.length} ${students.length === 1 ? "student" : "students"}\n-# Below is an auto-generated attendance report for today (${formatInTimeZone(today, timezone, "MM/dd/yyyy")}). [Click here](https://radius.mathnasium.com/StudentAttendanceMonthlyReport) to navigate to the Student Attendance Report in Radius.\n\n`;
    const footer = `\n\nPlease note that this list may include newly enrolled students who haven't have the chance to attend yet, as well as students who have recently disenrolled. In either case, please disregard those students.`;
    message = (
      i === 0
        ? header + formattedInfo[i]
        : i === formattedInfo.length - 1
          ? formattedInfo[i] + footer
          : formattedInfo[i]
    ) as string;
    await leadTeamChannel.send(message);
  }

  console.log(students);
  await promptForParentMessages(leadTeamChannel, students);
}

export async function promptForParentMessages(
  channel: TextBasedChannel & { send: (...args: any[]) => Promise<any> },
  students: string[],
) {
  const millisecondsUntilEndOfDay = (): number => {
    const now = new Date();
    const timezone = "America/Chicago";
    const zonedNow = toZonedTime(now, timezone);

    const midnight = new Date(zonedNow);
    midnight.setHours(24, 0, 0, 0);

    return Math.max(
      0,
      fromZonedTime(midnight, timezone).getTime() - now.getTime(),
    );
  };

  // Step 1: Ask whether to proceed.
  const prompt = await channel.send({
    content:
      "**📱 Would you like me to send text messages to families about their child(ren)'s attendance?**\n",
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("attendance_yes")
          .setLabel("Yes, please")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("attendance_no")
          .setLabel("No, thank you")
          .setStyle(ButtonStyle.Secondary),
      ),
    ],
  });

  const decision = await prompt
    .awaitMessageComponent({
      componentType: ComponentType.Button,
      time: millisecondsUntilEndOfDay(),
    })
    .catch(() => null);

  // Disable the buttons after the decision or timeout.
  await prompt.edit({ components: [] }).catch(() => {});

  if (!decision) {
    await channel.send(
      "Update: I won't follow-up with families since nobody responded in time.",
    );
    return;
  }

  if (decision.customId === "attendance_no") {
    await decision.reply({
      content: "No worries! I'll skip attendance follow-up for today.",
      ephemeral: true,
    });
    return;
  }

  await decision.deferUpdate();

  // Step 2: Divide students into groups of 25.
  const groups: { student: string; index: number }[][] = [];

  for (let i = 0; i < students.length; i += 25) {
    groups.push(
      students.slice(i, i + 25).map((student, j) => ({
        student,
        index: i + j,
      })),
    );
  }

  // Keep track of excluded students across all groups.
  const excludedIndexes = new Set<number>();

  // Step 3: Ask for exclusions, one group at a time.
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];

    if (!group) continue;

    const exclusionMenu = new StringSelectMenuBuilder()
      .setCustomId(`attendance_exclusions_${i}`)
      .setPlaceholder("Select students to exclude...")
      .setMinValues(0)
      .setMaxValues(group.length)
      .addOptions(
        group.map(({ student, index }) => {
          // Extract the name inside brackets, if present.
          const label = student.match(/\[(.*?)\]/)?.[1] ?? student;

          return new StringSelectMenuOptionBuilder()
            .setLabel(label.trim().slice(0, 100))
            .setValue(String(index));
        }),
      );

    const exclusionRow =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        exclusionMenu,
      );

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`attendance_skip_${i}`)
        .setLabel("No exclusions")
        .setStyle(ButtonStyle.Secondary),
    );

    const exclusionPrompt = await channel.send({
      content:
        `**(${i + 1} of ${groups.length}) Which students should be excluded from attendance follow-up?**\n\n` +
        "Select all students that apply. If nobody needs to be excluded, submit without selecting anyone.",
      components: [exclusionRow, actionRow],
    });

    // Wait for this group's selection before sending the next group.
    const selection = await exclusionPrompt
      .awaitMessageComponent({
        time: millisecondsUntilEndOfDay(),
        filter: (interaction: StringSelectMenuInteraction) =>
          interaction.user.id === decision.user.id &&
          (interaction.customId === `attendance_exclusions_${i}` ||
            interaction.customId === `attendance_skip_${i}`),
      })
      .catch(() => null);

    await exclusionPrompt.edit({ components: [] }).catch(() => {});

    if (!selection) {
      await channel.send(
        "⌛ Exclusion selection timed out. No messages will be sent.",
      );
      return;
    }

    // If the team selected "No exclusions", skip this group.
    if (selection.customId === `attendance_skip_${i}`) {
      await selection.update({
        content: `✅ Group ${i + 1} of ${groups.length} completed. No students excluded.`,
        components: [],
      });
    } else {
      // Save the selected exclusions.
      const menuSelection = selection as StringSelectMenuInteraction;

      for (const value of menuSelection.values) {
        excludedIndexes.add(Number(value));
      }

      const remainingCount = students.length - excludedIndexes.size;

      await menuSelection.update({
        content:
          `✅ Group ${i + 1} of ${groups.length} completed!\n\n` +
          `* Total students excluded: **${excludedIndexes.size}**\n` +
          `* Students remaining for follow-up: **${remainingCount}**`,
        components: [],
      });
    }
  }

  // Step 4: Combine all remaining students. Re-number students after filtering.
  const studentsToContact = students
    .filter((_, index) => !excludedIndexes.has(index))
    .map((student) => student.replace(/^\d+\.\s*/, ""))
    .map((student, index) => `${index + 1}. ${student}`);

  // Step 5: Ask for final confirmation.
  const formattedInfo = formatMessage(studentsToContact);

  let confirmation: Message | null = null;

  for (let i = 0; i < formattedInfo.length; i++) {
    const header = "**📋 Final Attendance Follow-up List**\n";

    const footer =
      `\n\n**${studentsToContact.length} ${
        studentsToContact.length === 1 ? "student" : "students"
      }** will receive parent/guardian follow-up.\n\n` +
      "Would you like me to proceed?";

    const confirmationMessage =
      (i === 0 ? header : "") +
      formattedInfo[i] +
      (i === formattedInfo.length - 1 ? footer : "");

    confirmation = await channel.send({
      content: confirmationMessage,
      components:
        i === formattedInfo.length - 1
          ? [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setCustomId("attendance_confirm")
                  .setLabel("Yes, send")
                  .setStyle(ButtonStyle.Success)
                  .setDisabled(studentsToContact.length === 0),
                new ButtonBuilder()
                  .setCustomId("attendance_cancel")
                  .setLabel("No, cancel")
                  .setStyle(ButtonStyle.Danger),
              ),
            ]
          : [],
    });
  }

  if (!confirmation) {
    console.error("Could not create attendance confirmation message.");
    return;
  }

  // Wait for the team's final decision.
  const finalDecision = await confirmation
    .awaitMessageComponent({
      componentType: ComponentType.Button,
      time: millisecondsUntilEndOfDay(),
      filter: (interaction) => interaction.user.id === decision.user.id,
    })
    .catch(() => null);

  // Disable buttons after the decision or timeout.
  await confirmation.edit({ components: [] }).catch(() => {});

  if (!finalDecision) {
    await channel.send(
      "⌛ Final confirmation timed out. No text messages will be sent.",
    );
    return;
  }

  if (finalDecision.customId === "attendance_cancel") {
    await finalDecision.update({
      content: "❌ Follow-up cancelled. No text messages will be sent.",
      components: [],
    });
    return;
  }

  await finalDecision.update({
    content: "✅ Confirmed! Preparing parent/guardian follow-up messages...",
    components: [],
  });

  // Step 6: Send guardian messages.
  console.log(studentsToContact);
  // TODO: await sendParentAttendanceMessages(studentsToContact);
}

export async function sendErrorNotification(message: string) {
  const adminTeamChannel = await fetchChannel("admin-team");

  // Check if the channels exists AND are text-based channels
  if (!adminTeamChannel) {
    console.error("Admin team channel not found.");
    return;
  }
  if (!adminTeamChannel.isTextBased() || !("send" in adminTeamChannel)) {
    console.error("Admin team channel cannot send messages.");
    return;
  }

  const today = new Date();
  const timezone = "America/Chicago";

  await adminTeamChannel.send(
    `**⚠️ Automation Error Notification - ${formatInTimeZone(today, timezone, "eee, MMM d")}**\n\n` +
      message,
  );
}
