export const BRAND_COLOR = "#690957";
export const MONTHLY_FEE = 55;
export const GROUP_START_DATE = new Date(2026, 5, 1);
export const ADMIN_PIN = "1596";
export const ADMIN_EMAIL = "Ghaalabh10@gmail.com";
export const ADMIN_PASSWORD = "Hooyo114";
export const GROUP_NAME = "AC7 Group";
export const GROUP_NAME_SOMALI = "Aragti Cad";
export const MAX_PIN_ATTEMPTS = 5;
export const RECOVERY_CODE_EXPIRY_MS = 15 * 60 * 1000;
export const DEFAULT_MEMBER_PASSWORD = "ac7@2026";
export const WARNING_MISS_THRESHOLD = 3;
export const REMOVAL_MISS_THRESHOLD = 4;

export const DEFAULT_MEMBER_PROFILES = [
  { name: "Abdullahi A2", annualTarget: 1000, monthlyFee: 55, email: "abdullahi@ac7.group" },
  { name: "Hassan Kaafi", annualTarget: 2000, monthlyFee: 55, email: "hassan@ac7.group" },
  { name: "Abduweli Enjoy", annualTarget: 660, monthlyFee: 55, email: "abduweli@ac7.group" },
  { name: "Ahmed Rash", annualTarget: 660, monthlyFee: 55, email: "ahmed@ac7.group" },
];

export const DEFAULT_SETTINGS = {
  monthlyFee: 55,
  groupGoal: 10000,
  groupStartDate: "2026-06-01",
  adminPin: "1596",
  adminEmail: ADMIN_EMAIL,
  reminderDay: 15,
  lateFeeEscalation: true,
};

export const COLLECTIONS = {
  MEMBERS: "members",
  PAYMENTS: "payments",
  SETTINGS: "settings",
  ANNOUNCEMENTS: "announcements",
  CHATS: "chats",
  BIN: "bin",
} as const;

export const SOMALI_MONTHS = [
  "Janaayo", "Febraayo", "Maarso", "Abriil", "Maajo", "Juun",
  "Luulyo", "Agoosto", "Sebtembar", "Oktoobar", "Nofembar", "Diseembar",
] as const;
