/* eslint-disable */
/** auto generated, do not edit */
import { sql } from 'drizzle-orm';
import { boolean, date, foreignKey, index, integer, jsonb, pgTable, text, uniqueIndex, uuid, varchar, customType } from "drizzle-orm/pg-core"

export const customTimestamptz = customType<{
  data: Date;
  driverData: string;
  config: { precision?: number };
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined'
      ? ` (${config.precision})`
      : '';
    return `timestamptz${precision}`;
  },
  toDriver(value: Date | string | number) {
    if (value == null) return value as any;
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    throw new Error('Invalid timestamp value');
  },
  fromDriver(value: string | Date): Date {
    if (value instanceof Date) return value;
    return new Date(value);
  },
});

export const userProfile = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return 'user_profile';
  },
  toDriver(value: string) {
    return sql`ROW(${value})::user_profile`;
  },
  fromDriver(value: string) {
    const [userId] = value.slice(1, -1).split(',');
    return userId.trim();
  },
});

export type FileAttachment = {
  bucket_id: string;
  file_path: string;
};

export const fileAttachment = customType<{
  data: FileAttachment;
  driverData: string;
}>({
  dataType() {
    return 'file_attachment';
  },
  toDriver(value: FileAttachment) {
    return sql`ROW(${value.bucket_id},${value.file_path})::file_attachment`;
  },
  fromDriver(value: string): FileAttachment {
    const [bucketId, filePath] = value.slice(1, -1).split(',');
    return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
  },
});

export function escapeLiteral(str: string): string {
  return "'" + str.replace(/'/g, "''") + "'";
}

export const userProfileArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() {
    return 'user_profile[]';
  },
  toDriver(value: string[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::user_profile[]`;
    }
    const elements = value.map(id => `ROW(${escapeLiteral(id)})::user_profile`).join(',');
    return sql.raw(`ARRAY[${elements}]::user_profile[]`);
  },
  fromDriver(value: string): string[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => m.slice(1, -1).split(',')[0].trim());
  },
});

export const fileAttachmentArray = customType<{
  data: FileAttachment[];
  driverData: string;
}>({
  dataType() {
    return 'file_attachment[]';
  },
  toDriver(value: FileAttachment[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::file_attachment[]`;
    }
    const elements = value.map(f =>
      `ROW(${escapeLiteral(f.bucket_id)},${escapeLiteral(f.file_path)})::file_attachment`
    ).join(',');
    return sql.raw(`ARRAY[${elements}]::file_attachment[]`);
  },
  fromDriver(value: string): FileAttachment[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => {
      const [bucketId, filePath] = m.slice(1, -1).split(',');
      return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
    });
  },
});

export const smsCode = pgTable("sms_code", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: varchar("phone", { length: 20 }).notNull(),
  code: varchar("code", { length: 10 }).notNull(),
  expiresAt: customTimestamptz("expires_at", { precision: 3 }).notNull(),
  used: boolean("used").notNull().default(false),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_sms_code_phone").on(table.phone),
  index("idx_sms_code_expires").on(table.expiresAt),
]);

export const appUser = pgTable("app_user", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("app_user_phone_key").on(table.phone),
  uniqueIndex("idx_app_user_phone").on(table.phone),
]);

export const conversationLog = pgTable("conversation_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  childId: uuid("child_id").notNull(),
  scriptId: uuid("script_id"),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  stepNumber: integer("step_number"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_conversation_child_id").on(table.childId),
  index("idx_conversation_script_id").on(table.scriptId),
  foreignKey({
    columns: [table.childId],
    foreignColumns: [childProfile.id],
    name: "conversation_log_child_id_fkey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.scriptId],
    foreignColumns: [scriptWork.id],
    name: "conversation_log_script_id_fkey",
  }).onDelete("set null"),
]);

export const parentDaily = pgTable("parent_daily", {
  id: uuid("id").primaryKey().defaultRandom(),
  childId: uuid("child_id").notNull(),
  reportDate: date("report_date").notNull().default('CURRENT_DATE'),
  highlight: text("highlight").notNull(),
  goldenQuote: text("golden_quote"),
  /**
   * @type { imagination?: number, expression?: number, logic?: number, curiosity?: number }
   */
  abilityGrowth: jsonb("ability_growth"),
  scriptId: uuid("script_id"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_parent_daily_child_id").on(table.childId),
  index("idx_parent_daily_date").on(table.reportDate),
  foreignKey({
    columns: [table.childId],
    foreignColumns: [childProfile.id],
    name: "parent_daily_child_id_fkey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.scriptId],
    foreignColumns: [scriptWork.id],
    name: "parent_daily_script_id_fkey",
  }).onDelete("set null"),
]);

export const abilityRadar = pgTable("ability_radar", {
  id: uuid("id").primaryKey().defaultRandom(),
  childId: uuid("child_id").notNull(),
  imagination: integer("imagination").notNull().default(0),
  expression: integer("expression").notNull().default(0),
  logic: integer("logic").notNull().default(0),
  curiosity: integer("curiosity").notNull().default(0),
  recordedAt: date("recorded_at").notNull().default('CURRENT_DATE'),
  scriptId: uuid("script_id"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_ability_radar_child_id").on(table.childId),
  foreignKey({
    columns: [table.childId],
    foreignColumns: [childProfile.id],
    name: "ability_radar_child_id_fkey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.scriptId],
    foreignColumns: [scriptWork.id],
    name: "ability_radar_script_id_fkey",
  }).onDelete("set null"),
]);

export const achievementBadge = pgTable("achievement_badge", {
  id: uuid("id").primaryKey().defaultRandom(),
  childId: uuid("child_id").notNull(),
  badgeType: varchar("badge_type", { length: 50 }).notNull(),
  badgeName: varchar("badge_name", { length: 50 }).notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 50 }),
  unlockedAt: customTimestamptz("unlocked_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  scriptId: uuid("script_id"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_achievement_child_id").on(table.childId),
  foreignKey({
    columns: [table.childId],
    foreignColumns: [childProfile.id],
    name: "achievement_badge_child_id_fkey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.scriptId],
    foreignColumns: [scriptWork.id],
    name: "achievement_badge_script_id_fkey",
  }).onDelete("set null"),
]);

export const scriptPage = pgTable("script_page", {
  id: uuid("id").primaryKey().defaultRandom(),
  scriptId: uuid("script_id").notNull(),
  pageNumber: integer("page_number").notNull(),
  content: text("content").notNull(),
  imageUrl: varchar("image_url", { length: 500 }),
  narration: text("narration"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_script_page_script_id").on(table.scriptId),
  foreignKey({
    columns: [table.scriptId],
    foreignColumns: [scriptWork.id],
    name: "script_page_script_id_fkey",
  }).onDelete("cascade"),
]);

export const scriptWork = pgTable("script_work", {
  id: uuid("id").primaryKey().defaultRandom(),
  childId: uuid("child_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  protagonist: text("protagonist").notNull(),
  wish: text("wish").notNull(),
  difficulty: text("difficulty").notNull(),
  solution: text("solution").notNull(),
  ending: text("ending").notNull(),
  goldenQuote: text("golden_quote"),
  status: varchar("status", { length: 20 }).notNull().default('draft'),
  totalPages: integer("total_pages").notNull().default(0),
  coverImage: varchar("cover_image", { length: 500 }),
  audioUrl: varchar("audio_url", { length: 500 }),
  /**
   * @type { imagination: number, expression: number, logic: number, curiosity: number }
   */
  abilityScores: jsonb("ability_scores"),
  isPublic: boolean("is_public").notNull().default(false),
  reviewStatus: varchar("review_status", { length: 20 }).notNull().default('pending'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_script_work_child_id").on(table.childId),
  index("idx_script_work_status").on(table.status),
  index("idx_script_work_public").on(table.isPublic),
  index("idx_script_work_review").on(table.reviewStatus),
  foreignKey({
    columns: [table.childId],
    foreignColumns: [childProfile.id],
    name: "script_work_child_id_fkey",
  }).onDelete("cascade"),
]);

export const childProfile = pgTable("child_profile", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 50 }).notNull(),
  age: integer("age").notNull().default(6),
  avatar: varchar("avatar", { length: 255 }),
  interests: text("interests").array().notNull().default([]),
  languageStyle: varchar("language_style", { length: 50 }).default('normal'),
  lastExcitement: text("last_excitement"),
  personalityNotes: text("personality_notes"),
  visitorId: varchar("visitor_id", { length: 100 }),
  userId: uuid("user_id"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_child_profile_visitor_id").on(table.visitorId),
  index("idx_child_profile_user_id").on(table.userId),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [appUser.id],
    name: "child_profile_user_id_fkey",
  }),
]);

// table aliases
export const abilityRadarTable = abilityRadar;
export const achievementBadgeTable = achievementBadge;
export const appUserTable = appUser;
export const childProfileTable = childProfile;
export const conversationLogTable = conversationLog;
export const parentDailyTable = parentDaily;
export const scriptPageTable = scriptPage;
export const scriptWorkTable = scriptWork;
export const smsCodeTable = smsCode;
