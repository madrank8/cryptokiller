import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const geoTargetsTable = pgTable("geo_targets", {
  id: serial("id").primaryKey(),
  reviewId: integer("review_id").notNull(),
  region: text("region").notNull(),
  countryCodes: text("country_codes").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGeoTargetSchema = createInsertSchema(geoTargetsTable).omit({ id: true, createdAt: true });
export type InsertGeoTarget = z.infer<typeof insertGeoTargetSchema>;
export type GeoTarget = typeof geoTargetsTable.$inferSelect;
