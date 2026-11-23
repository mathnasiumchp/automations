const HOLIDAYS_AND_CLOSURES = [
  "2026-01-01", // New Year's Day
  "2026-05-10", // Mother's Day
  "2026-05-25", // Memorial Day
  "2026-06-19", // Juneteenth
  "2026-07-04", // 4th of July
  "2026-09-07", // Labor Day
  "2026-10-12", // Indigenous Peoples' Day
  "2026-11-11", // Veterans Day
  "2026-11-24", // Thanksgiving Break
  "2026-11-25", // Thanksgiving Break
  "2026-11-26", // Thanksgiving Break
  "2026-12-20", // Winter Break
  "2026-12-21", // Winter Break
  "2026-12-22", // Winter Break
  "2026-12-23", // Winter Break
  "2026-12-24", // Winter Break
  "2026-12-25", // Winter Break
  "2026-12-26", // Winter Break
  "2026-12-27", // Winter Break
  "2026-12-28", // Winter Break
  "2026-12-29", // Winter Break
  "2026-12-30", // Winter Break
  "2026-12-31", // Winter Break
  "2027-01-01", // Winter Break
  "2027-01-02", // Winter Break
];

export function isHolidayOrClosure(): boolean {
  // Get current date string in America/Chicago timezone
  const todayStr = new Date().toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  // Convert MM/DD/YYYY to YYYY-MM-DD
  const [month, day, year] = todayStr.split("/");
  const formattedDate = `${year}-${month}-${day}`;

  return HOLIDAYS_AND_CLOSURES.includes(formattedDate);
}

export function isBusinessHours(): boolean {
  if (isHolidayOrClosure()) {
    return false;
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((part) => part.type === type)?.value;

  const day = get("weekday");
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));

  const time = hour * 60 + minute;
  const buffer = 15; // Minutes after close that notifications should remain active for

  if (day === "Sun") {
    return time >= 780 && time < 1020 + buffer; // Between 1 and 5 PM
  }

  if (["Mon", "Tue", "Wed", "Thu"].includes(day!)) {
    return time >= 780 && time < 1170 + buffer; // Between 1 and 7:30 PM
  }

  return false;
}

export const dollarFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  trailingZeroDisplay: "stripIfInteger",
});

export function formatMessage(students: string[]) {
  const messageBuckets: string[] = [];
  let currentBucket = "";
  const delimiter = "\n";
  const maxCharLimit = 1700;

  for (const student of students) {
    // If a single month is somehow huge on its own, push it to its own bucket
    if (student.length >= maxCharLimit) {
      if (currentBucket) {
        messageBuckets.push(currentBucket);
        currentBucket = "";
      }
      messageBuckets.push(student);
      continue;
    }

    // Determine what the bucket would look like if we add this month
    const prospectiveText = currentBucket
      ? currentBucket + delimiter + student
      : student;

    if (prospectiveText.length > maxCharLimit) {
      // It exceeds the limit, so save the old bucket and start a new one with this month
      messageBuckets.push(currentBucket);
      currentBucket = student;
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
