CREATE TABLE "change_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"order_number" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"value" numeric(12, 2) NOT NULL,
	"currency" varchar DEFAULT 'USD',
	"date_signed" date NOT NULL,
	"signed_by" varchar NOT NULL,
	"approved_by" varchar NOT NULL,
	"status" varchar DEFAULT 'pending',
	"week_effective" varchar NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar,
	"phone" varchar,
	"address" text,
	"contact_person" varchar,
	"organization_id" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "holiday_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"start_date" varchar NOT NULL,
	"end_date" varchar NOT NULL,
	"total_days" integer NOT NULL,
	"request_type" varchar DEFAULT 'vacation',
	"reason" text,
	"status" varchar DEFAULT 'pending',
	"requested_at" timestamp DEFAULT now(),
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"rejection_reason" text,
	"organization_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invoice_line_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"timesheet_id" integer,
	"description" text NOT NULL,
	"quantity" numeric(8, 2) NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"user_id" varchar,
	"role_type" varchar(100),
	"date" date,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_number" varchar(50) NOT NULL,
	"client_id" integer NOT NULL,
	"project_id" integer,
	"status" varchar DEFAULT 'draft',
	"issue_date" date NOT NULL,
	"due_date" date NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"currency" varchar DEFAULT 'USD',
	"subtotal" numeric(12, 2) NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '0.00',
	"tax_amount" numeric(12, 2) DEFAULT '0.00',
	"total" numeric(12, 2) NOT NULL,
	"notes" text,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"type" varchar NOT NULL,
	"title" varchar NOT NULL,
	"message" text NOT NULL,
	"timesheet_id" integer,
	"action_required" boolean DEFAULT false,
	"action_url" varchar,
	"action_text" varchar,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"domain" varchar(255),
	"settings" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "organizations_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "project_burn" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"week_starting" varchar NOT NULL,
	"actual_hours" numeric(8, 2) DEFAULT '0.00',
	"actual_cost" numeric(12, 2) DEFAULT '0.00',
	"forecast_hours" numeric(8, 2) DEFAULT '0.00',
	"forecast_cost" numeric(12, 2) DEFAULT '0.00',
	"cumulative_actual_hours" numeric(10, 2) DEFAULT '0.00',
	"cumulative_actual_cost" numeric(12, 2) DEFAULT '0.00',
	"cumulative_forecast_hours" numeric(10, 2) DEFAULT '0.00',
	"cumulative_forecast_cost" numeric(12, 2) DEFAULT '0.00',
	"budget_at_week" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_resources" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"role_type_id" integer NOT NULL,
	"start_date" date,
	"end_date" date,
	"allocated_hours" numeric(8, 2),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_role_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"role_type_name" varchar NOT NULL,
	"hourly_rate" numeric(10, 2) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"description" text,
	"default_hourly_rate" numeric(10, 2),
	"default_currency" varchar DEFAULT 'USD',
	"is_active" boolean DEFAULT true,
	"organization_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"client_id" integer,
	"project_manager_id" varchar,
	"budget" numeric(12, 2),
	"remaining_budget" numeric(12, 2),
	"currency" varchar DEFAULT 'USD',
	"hourly_rate" numeric(10, 2),
	"start_date" date,
	"end_date" date,
	"status" varchar DEFAULT 'active',
	"budget_locked" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "resource_forecasts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"project_id" integer NOT NULL,
	"week_starting" varchar NOT NULL,
	"forecast_hours" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"actual_hours" numeric(5, 2) DEFAULT '0.00',
	"notes" text,
	"organization_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "resource_planning" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_resource_id" integer NOT NULL,
	"week_start_date" date NOT NULL,
	"planned_hours" numeric(5, 2) NOT NULL,
	"actual_hours" numeric(5, 2) DEFAULT '0',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timesheets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"project_id" integer NOT NULL,
	"project_resource_id" integer,
	"date" date NOT NULL,
	"hours" numeric(4, 2) NOT NULL,
	"description" text NOT NULL,
	"type" varchar DEFAULT 'billable',
	"status" varchar DEFAULT 'draft',
	"approved_by" varchar,
	"approved_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"phone" varchar(50),
	"timezone" varchar(100),
	"hashed_password" varchar,
	"profile_image_url" varchar,
	"custom_profile_image" text,
	"role" varchar DEFAULT 'consultant',
	"organization_id" integer,
	"skills" text[] DEFAULT '{}',
	"hourly_rate" numeric(10, 2),
	"resource_cost" numeric(10, 2),
	"role_type" varchar,
	"is_active" boolean DEFAULT true,
	"deactivated_at" timestamp,
	"require_password_change" boolean DEFAULT true,
	"weekly_capacity_hours" integer DEFAULT 40,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holiday_requests" ADD CONSTRAINT "holiday_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holiday_requests" ADD CONSTRAINT "holiday_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holiday_requests" ADD CONSTRAINT "holiday_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_timesheet_id_timesheets_id_fk" FOREIGN KEY ("timesheet_id") REFERENCES "public"."timesheets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_timesheet_id_timesheets_id_fk" FOREIGN KEY ("timesheet_id") REFERENCES "public"."timesheets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_burn" ADD CONSTRAINT "project_burn_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_resources" ADD CONSTRAINT "project_resources_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_resources" ADD CONSTRAINT "project_resources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_resources" ADD CONSTRAINT "project_resources_role_type_id_project_role_types_id_fk" FOREIGN KEY ("role_type_id") REFERENCES "public"."project_role_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_role_types" ADD CONSTRAINT "project_role_types_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_roles" ADD CONSTRAINT "project_roles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_project_manager_id_users_id_fk" FOREIGN KEY ("project_manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_forecasts" ADD CONSTRAINT "resource_forecasts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_forecasts" ADD CONSTRAINT "resource_forecasts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_forecasts" ADD CONSTRAINT "resource_forecasts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_planning" ADD CONSTRAINT "resource_planning_project_resource_id_project_resources_id_fk" FOREIGN KEY ("project_resource_id") REFERENCES "public"."project_resources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_project_resource_id_project_resources_id_fk" FOREIGN KEY ("project_resource_id") REFERENCES "public"."project_resources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_week_burn_unique" ON "project_burn" USING btree ("project_id","week_starting");--> statement-breakpoint
CREATE UNIQUE INDEX "user_project_week_unique" ON "resource_forecasts" USING btree ("user_id","project_id","week_starting");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");