import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
// Organization storage table for multi-tenant support
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  domain: varchar("domain", { length: 255 }).unique(),
  settings: jsonb("settings"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Master roles table for flexible role management
export const projectRoles = pgTable("project_roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  defaultHourlyRate: decimal("default_hourly_rate", { precision: 10, scale: 2 }),
  defaultCurrency: varchar("default_currency", { enum: ["USD", "GBP"] }).default("USD"),
  isActive: boolean("is_active").default(true),
  organizationId: integer("organization_id").references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  phone: varchar("phone", { length: 50 }),
  timezone: varchar("timezone", { length: 100 }),
  hashedPassword: varchar("hashed_password"),
  profileImageUrl: varchar("profile_image_url"),
  customProfileImage: text("custom_profile_image"), // Base64 encoded custom uploaded image
  role: varchar("role", { enum: ["admin", "project_manager", "consultant", "user"] }).default("user"),
  organizationId: integer("organization_id").references(() => organizations.id),
  skills: text("skills").array().default([]),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  resourceCost: decimal("resource_cost", { precision: 10, scale: 2 }), // Internal cost per hour for margin calculations
  roleType: varchar("role_type"), // e.g., "Senior Consultant", "Junior Developer", "Technical Lead"
  isActive: boolean("is_active").default(true),
  deactivatedAt: timestamp("deactivated_at"),
  requirePasswordChange: boolean("require_password_change").default(true),
  weeklyCapacityHours: integer("weekly_capacity_hours").default(40), // Standard 40-hour work week
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Clients table
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  address: text("address"),
  contactPerson: varchar("contact_person"),
  organizationId: integer("organization_id").references(() => organizations.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  clientId: integer("client_id").references(() => clients.id),
  projectManagerId: varchar("project_manager_id").references(() => users.id),
  budget: decimal("budget", { precision: 12, scale: 2 }),
  remainingBudget: decimal("remaining_budget", { precision: 12, scale: 2 }),
  currency: varchar("currency", { enum: ["USD", "GBP"] }).default("USD"),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  startDate: date("start_date"),
  endDate: date("end_date"),
  status: varchar("status", { enum: ["active", "completed", "on_hold", "cancelled"] }).default("active"),
  budgetLocked: boolean("budget_locked").default(false), // Locked for project managers
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project Role Types (rate cards for different roles per project)
export const projectRoleTypes = pgTable("project_role_types", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  roleTypeName: varchar("role_type_name").notNull(), // e.g., "Senior Consultant", "Junior Developer"
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project Resource Assignments
export const projectResources = pgTable("project_resources", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  roleTypeId: integer("role_type_id").references(() => projectRoleTypes.id).notNull(),
  startDate: date("start_date"),
  endDate: date("end_date"),
  allocatedHours: decimal("allocated_hours", { precision: 8, scale: 2 }), // total hours allocated
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Resource Planning (weekly hour allocations)
export const resourcePlanning = pgTable("resource_planning", {
  id: serial("id").primaryKey(),
  projectResourceId: integer("project_resource_id").references(() => projectResources.id).notNull(),
  weekStartDate: date("week_start_date").notNull(),
  plannedHours: decimal("planned_hours", { precision: 5, scale: 2 }).notNull(),
  actualHours: decimal("actual_hours", { precision: 5, scale: 2 }).default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Timesheets table
export const timesheets = pgTable("timesheets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  projectResourceId: integer("project_resource_id").references(() => projectResources.id), // links to role/rate
  date: date("date").notNull(),
  hours: decimal("hours", { precision: 4, scale: 2 }).notNull(),
  description: text("description").notNull(),
  type: varchar("type", { enum: ["billable", "non_billable", "admin", "training"] }).default("billable"),
  status: varchar("status", { enum: ["draft", "submitted", "approved", "rejected"] }).default("draft"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Holiday requests table
export const holidayRequests = pgTable("holiday_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  startDate: varchar("start_date").notNull(), // YYYY-MM-DD format
  endDate: varchar("end_date").notNull(), // YYYY-MM-DD format
  totalDays: integer("total_days").notNull(),
  requestType: varchar("request_type", { enum: ["vacation", "sick", "personal", "other"] }).default("vacation"),
  reason: text("reason"),
  status: varchar("status", { enum: ["pending", "approved", "rejected"] }).default("pending"),
  requestedAt: timestamp("requested_at").defaultNow(),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  rejectionReason: text("rejection_reason"),
  organizationId: integer("organization_id").references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Resource forecasts table
export const resourceForecasts = pgTable("resource_forecasts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  weekStarting: varchar("week_starting").notNull(), // YYYY-MM-DD format (Monday of the week)
  forecastHours: decimal("forecast_hours", { precision: 5, scale: 2 }).notNull().default("0.00"),
  actualHours: decimal("actual_hours", { precision: 5, scale: 2 }).default("0.00"),
  notes: text("notes"),
  organizationId: integer("organization_id").references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userProjectWeekUnique: uniqueIndex("user_project_week_unique").on(table.userId, table.projectId, table.weekStarting),
}));

// Change orders table for tracking budget modifications
export const changeOrders = pgTable("change_orders", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  orderNumber: varchar("order_number", { length: 50 }).notNull(),
  description: text("description").notNull(),
  value: decimal("value", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { enum: ["USD", "GBP"] }).default("USD"),
  dateSigned: date("date_signed").notNull(),
  signedBy: varchar("signed_by").notNull(), // Name of person who signed
  approvedBy: varchar("approved_by").references(() => users.id).notNull(),
  status: varchar("status", { enum: ["pending", "approved", "rejected"] }).default("pending"),
  weekEffective: varchar("week_effective").notNull(), // YYYY-MM-DD format for budget line graph
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project burn tracking for dashboard charts
export const projectBurn = pgTable("project_burn", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  weekStarting: varchar("week_starting").notNull(), // YYYY-MM-DD format (Monday of the week)
  actualHours: decimal("actual_hours", { precision: 8, scale: 2 }).default("0.00"),
  actualCost: decimal("actual_cost", { precision: 12, scale: 2 }).default("0.00"),
  forecastHours: decimal("forecast_hours", { precision: 8, scale: 2 }).default("0.00"),
  forecastCost: decimal("forecast_cost", { precision: 12, scale: 2 }).default("0.00"),
  cumulativeActualHours: decimal("cumulative_actual_hours", { precision: 10, scale: 2 }).default("0.00"),
  cumulativeActualCost: decimal("cumulative_actual_cost", { precision: 12, scale: 2 }).default("0.00"),
  cumulativeForecastHours: decimal("cumulative_forecast_hours", { precision: 10, scale: 2 }).default("0.00"),
  cumulativeForecastCost: decimal("cumulative_forecast_cost", { precision: 12, scale: 2 }).default("0.00"),
  budgetAtWeek: decimal("budget_at_week", { precision: 12, scale: 2 }).notNull(), // Budget level during this week (includes change orders)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  projectWeekUnique: uniqueIndex("project_week_burn_unique").on(table.projectId, table.weekStarting),
}));

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type").notNull(), // 'timesheet_rejected', 'timesheet_approved', etc.
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  timesheetId: integer("timesheet_id").references(() => timesheets.id),
  actionRequired: boolean("action_required").default(false),
  actionUrl: varchar("action_url"),
  actionText: varchar("action_text"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Invoices table for automated billing
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  projectId: integer("project_id").references(() => projects.id),
  status: varchar("status", { enum: ["draft", "sent", "paid", "overdue", "cancelled"] }).default("draft"),
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date").notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  currency: varchar("currency", { enum: ["USD", "GBP"] }).default("USD"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0.00"),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0.00"),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Invoice line items for detailed billing
export const invoiceLineItems = pgTable("invoice_line_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id).notNull(),
  timesheetId: integer("timesheet_id").references(() => timesheets.id),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 8, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  userId: varchar("user_id").references(() => users.id),
  roleType: varchar("role_type", { length: 100 }),
  date: date("date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Password reset tokens (no email yet; we’ll return the token from API)
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  token: varchar("token", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  timesheets: many(timesheets),
  managedProjects: many(projects),
  holidayRequests: many(holidayRequests),
  notifications: many(notifications),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  projectManager: one(users, {
    fields: [projects.projectManagerId],
    references: [users.id],
  }),
  timesheets: many(timesheets),
  roleTypes: many(projectRoleTypes),
  resources: many(projectResources),
  changeOrders: many(changeOrders),
  burn: many(projectBurn),
}));

export const projectRoleTypesRelations = relations(projectRoleTypes, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectRoleTypes.projectId],
    references: [projects.id],
  }),
  resources: many(projectResources),
}));

export const projectResourcesRelations = relations(projectResources, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectResources.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectResources.userId],
    references: [users.id],
  }),
  roleType: one(projectRoleTypes, {
    fields: [projectResources.roleTypeId],
    references: [projectRoleTypes.id],
  }),
  timesheets: many(timesheets),
  planning: many(resourcePlanning),
}));

export const resourcePlanningRelations = relations(resourcePlanning, ({ one }) => ({
  projectResource: one(projectResources, {
    fields: [resourcePlanning.projectResourceId],
    references: [projectResources.id],
  }),
}));

export const timesheetsRelations = relations(timesheets, ({ one }) => ({
  user: one(users, {
    fields: [timesheets.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [timesheets.projectId],
    references: [projects.id],
  }),
  projectResource: one(projectResources, {
    fields: [timesheets.projectResourceId],
    references: [projectResources.id],
  }),
  approver: one(users, {
    fields: [timesheets.approvedBy],
    references: [users.id],
  }),
}));

export const holidayRequestsRelations = relations(holidayRequests, ({ one }) => ({
  user: one(users, {
    fields: [holidayRequests.userId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [holidayRequests.reviewedBy],
    references: [users.id],
  }),
}));

export const resourceForecastsRelations = relations(resourceForecasts, ({ one }) => ({
  user: one(users, {
    fields: [resourceForecasts.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [resourceForecasts.projectId],
    references: [projects.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  timesheet: one(timesheets, {
    fields: [notifications.timesheetId],
    references: [timesheets.id],
  }),
}));

export const changeOrdersRelations = relations(changeOrders, ({ one }) => ({
  project: one(projects, {
    fields: [changeOrders.projectId],
    references: [projects.id],
  }),
  approver: one(users, {
    fields: [changeOrders.approvedBy],
    references: [users.id],
  }),
}));

export const projectBurnRelations = relations(projectBurn, ({ one }) => ({
  project: one(projects, {
    fields: [projectBurn.projectId],
    references: [projects.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  project: one(projects, {
    fields: [invoices.projectId],
    references: [projects.id],
  }),
  createdByUser: one(users, {
    fields: [invoices.createdBy],
    references: [users.id],
  }),
  lineItems: many(invoiceLineItems),
}));

export const invoiceLineItemsRelations = relations(invoiceLineItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceLineItems.invoiceId],
    references: [invoices.id],
  }),
  timesheet: one(timesheets, {
    fields: [invoiceLineItems.timesheetId],
    references: [timesheets.id],
  }),
  user: one(users, {
    fields: [invoiceLineItems.userId],
    references: [users.id],
  }),
}));



// Insert schemas
export const insertUserSchema = createInsertSchema(users);
export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertTimesheetSchema = createInsertSchema(timesheets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedBy: true,
  approvedAt: true,
});

export const insertProjectRoleTypeSchema = createInsertSchema(projectRoleTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectResourceSchema = createInsertSchema(projectResources).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertResourcePlanningSchema = createInsertSchema(resourcePlanning).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectRoleSchema = createInsertSchema(projectRoles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertHolidayRequestSchema = createInsertSchema(holidayRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  requestedAt: true,
  reviewedAt: true,
});

export const insertResourceForecastSchema = createInsertSchema(resourceForecasts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvoiceLineItemSchema = createInsertSchema(invoiceLineItems).omit({
  id: true,
  createdAt: true,
});

export const insertChangeOrderSchema = createInsertSchema(changeOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectBurnSchema = createInsertSchema(projectBurn).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertTimesheet = z.infer<typeof insertTimesheetSchema>;
export type Timesheet = typeof timesheets.$inferSelect;
export type InsertProjectRole = z.infer<typeof insertProjectRoleSchema>;
export type ProjectRole = typeof projectRoles.$inferSelect;

export type InsertProjectRoleType = z.infer<typeof insertProjectRoleTypeSchema>;
export type ProjectRoleType = typeof projectRoleTypes.$inferSelect;
export type InsertProjectResource = z.infer<typeof insertProjectResourceSchema>;
export type ProjectResource = typeof projectResources.$inferSelect;
export type InsertResourcePlanning = z.infer<typeof insertResourcePlanningSchema>;
export type ResourcePlanning = typeof resourcePlanning.$inferSelect;

export type InsertHolidayRequest = z.infer<typeof insertHolidayRequestSchema>;
export type HolidayRequest = typeof holidayRequests.$inferSelect;

export type InsertResourceForecast = z.infer<typeof insertResourceForecastSchema>;
export type ResourceForecast = typeof resourceForecasts.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

export type InsertInvoiceLineItem = z.infer<typeof insertInvoiceLineItemSchema>;
export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;

export type InsertChangeOrder = z.infer<typeof insertChangeOrderSchema>;
export type ChangeOrder = typeof changeOrders.$inferSelect;

export type InsertProjectBurn = z.infer<typeof insertProjectBurnSchema>;
export type ProjectBurn = typeof projectBurn.$inferSelect;

// Extended types with relations
export type ProjectWithRelations = Project & {
  client?: Client | null;
  projectManager?: User | null;
  timesheets?: Timesheet[];
  roleTypes?: ProjectRoleType[];
  resources?: ProjectResourceWithRelations[];
  changeOrders?: ChangeOrder[];
  burn?: ProjectBurn[];
};

export type ProjectResourceWithRelations = ProjectResource & {
  user?: User;
  roleType?: ProjectRoleType;
  planning?: ResourcePlanning[];
};

export type TimesheetWithRelations = Timesheet & {
  user?: User | null;
  project?: ProjectWithRelations | null;
  projectResource?: ProjectResourceWithRelations | null;
  approver?: User | null;
};

export type HolidayRequestWithRelations = HolidayRequest & {
  user?: User | null;
  reviewer?: User | null;
};

export type InvoiceWithRelations = Invoice & {
  client?: Client | null;
  project?: ProjectWithRelations | null;
  createdByUser?: User | null;
  lineItems?: InvoiceLineItemWithRelations[];
};

export type InvoiceLineItemWithRelations = InvoiceLineItem & {
  invoice?: Invoice | null;
  timesheet?: TimesheetWithRelations | null;
  user?: User | null;
};

// User management schemas
export const createUserSchema = createInsertSchema(users).pick({
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  timezone: true,
  role: true,
  organizationId: true,
}).extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  timezone: z.string().optional(),
});

export const updateUserSchema = createInsertSchema(users).pick({
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  timezone: true,
  role: true,
  isActive: true,
}).partial();

export const resetPasswordSchema = z.object({
  userId: z.string(),
});

export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;
