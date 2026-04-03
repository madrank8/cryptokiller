import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const scamReportsTable = pgTable("scam_reports", {
  id: serial("id").primaryKey(),
  platformName: text("platform_name").notNull(),
  platformUrl: text("platform_url").notNull().default(""),
  scamType: text("scam_type").notNull().default("crypto_investment"),
  description: text("description").notNull(),
  amountLost: text("amount_lost").notNull().default(""),
  currency: text("currency").notNull().default("USD"),
  contactMethod: text("contact_method").notNull().default(""),
  country: text("country").notNull().default(""),
  evidenceUrls: text("evidence_urls").notNull().default(""),
  reporterEmail: text("reporter_email").notNull().default(""),
  status: text("status").notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertScamReportSchema = createInsertSchema(scamReportsTable).omit({ id: true, createdAt: true, status: true });
export type InsertScamReport = z.infer<typeof insertScamReportSchema>;
export type ScamReport = typeof scamReportsTable.$inferSelect;
