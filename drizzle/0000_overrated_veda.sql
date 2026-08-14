-- Recovery for the verified-empty partial schema left by the initial failed application.
DROP TABLE IF EXISTS "goal_progress_history" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "inbox_items" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "tasks" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "milestones" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "projects" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "goals" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "life_areas" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "app_users" CASCADE;--> statement-breakpoint
CREATE TABLE "app_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"timezone" text DEFAULT 'Africa/Casablanca' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_users_email_not_blank" CHECK (length(btrim("app_users"."email")) > 0),
	CONSTRAINT "app_users_display_name_not_blank" CHECK (length(btrim("app_users"."display_name")) > 0),
	CONSTRAINT "app_users_timezone_not_blank" CHECK (length(btrim("app_users"."timezone")) > 0)
);
--> statement-breakpoint
CREATE TABLE "goal_progress_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	"progress" numeric(5, 2) NOT NULL,
	"current_value" numeric(18, 4),
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goal_progress_history_progress_range" CHECK ("goal_progress_history"."progress" between 0 and 100),
	CONSTRAINT "goal_progress_history_value_nonnegative" CHECK ("goal_progress_history"."current_value" is null or "goal_progress_history"."current_value" >= 0)
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"life_area_id" uuid,
	"parent_goal_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"level" text DEFAULT 'general' NOT NULL,
	"measurement_type" text DEFAULT 'manual' NOT NULL,
	"target_value" numeric(18, 4),
	"current_value" numeric(18, 4),
	"unit" text,
	"start_date" date,
	"deadline" date,
	"status" text DEFAULT 'draft' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"progress" numeric(5, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "goals_title_not_blank" CHECK (length(btrim("goals"."title")) > 0),
	CONSTRAINT "goals_not_own_parent" CHECK ("goals"."parent_goal_id" is null or "goals"."parent_goal_id" <> "goals"."id"),
	CONSTRAINT "goals_level_valid" CHECK ("goals"."level" in ('long_term', 'yearly', 'quarterly', 'general')),
	CONSTRAINT "goals_measurement_type_valid" CHECK ("goals"."measurement_type" in ('binary', 'numeric', 'percentage', 'milestone', 'habit_based', 'manual')),
	CONSTRAINT "goals_status_valid" CHECK ("goals"."status" in ('draft', 'active', 'paused', 'completed', 'abandoned', 'archived')),
	CONSTRAINT "goals_priority_valid" CHECK ("goals"."priority" in ('low', 'medium', 'high', 'critical')),
	CONSTRAINT "goals_values_nonnegative" CHECK (("goals"."target_value" is null or "goals"."target_value" >= 0) and ("goals"."current_value" is null or "goals"."current_value" >= 0)),
	CONSTRAINT "goals_progress_range" CHECK ("goals"."progress" between 0 and 100),
	CONSTRAINT "goals_date_order" CHECK ("goals"."start_date" is null or "goals"."deadline" is null or "goals"."start_date" <= "goals"."deadline"),
	CONSTRAINT "goals_completed_timestamp" CHECK ("goals"."status" <> 'completed' or "goals"."completed_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "inbox_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"status" text DEFAULT 'unprocessed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "inbox_items_content_not_blank" CHECK (length(btrim("inbox_items"."content")) > 0),
	CONSTRAINT "inbox_items_status_valid" CHECK ("inbox_items"."status" in ('unprocessed', 'processed', 'archived', 'discarded')),
	CONSTRAINT "inbox_items_processed_timestamp" CHECK ("inbox_items"."status" <> 'processed' or "inbox_items"."processed_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "life_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"position" integer DEFAULT 0 NOT NULL,
	"importance" integer,
	"satisfaction" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "life_areas_name_not_blank" CHECK (length(btrim("life_areas"."name")) > 0),
	CONSTRAINT "life_areas_position_nonnegative" CHECK ("life_areas"."position" >= 0),
	CONSTRAINT "life_areas_importance_range" CHECK ("life_areas"."importance" is null or "life_areas"."importance" between 1 and 10),
	CONSTRAINT "life_areas_satisfaction_range" CHECK ("life_areas"."satisfaction" is null or "life_areas"."satisfaction" between 1 and 10),
	CONSTRAINT "life_areas_status_valid" CHECK ("life_areas"."status" in ('active', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"deadline" date,
	"status" text DEFAULT 'pending' NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "milestones_title_not_blank" CHECK (length(btrim("milestones"."title")) > 0),
	CONSTRAINT "milestones_position_nonnegative" CHECK ("milestones"."position" >= 0),
	CONSTRAINT "milestones_status_valid" CHECK ("milestones"."status" in ('pending', 'in_progress', 'completed', 'cancelled', 'archived')),
	CONSTRAINT "milestones_completed_timestamp" CHECK ("milestones"."status" <> 'completed' or "milestones"."completed_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"goal_id" uuid,
	"life_area_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'planned' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"start_date" date,
	"deadline" date,
	"progress" numeric(5, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "projects_title_not_blank" CHECK (length(btrim("projects"."title")) > 0),
	CONSTRAINT "projects_status_valid" CHECK ("projects"."status" in ('planned', 'active', 'paused', 'completed', 'cancelled', 'archived')),
	CONSTRAINT "projects_priority_valid" CHECK ("projects"."priority" in ('low', 'medium', 'high', 'critical')),
	CONSTRAINT "projects_progress_range" CHECK ("projects"."progress" between 0 and 100),
	CONSTRAINT "projects_date_order" CHECK ("projects"."start_date" is null or "projects"."deadline" is null or "projects"."start_date" <= "projects"."deadline"),
	CONSTRAINT "projects_completed_timestamp" CHECK ("projects"."status" <> 'completed' or "projects"."completed_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid,
	"goal_id" uuid,
	"life_area_id" uuid,
	"parent_task_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'inbox' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"commitment_level" text DEFAULT 'could' NOT NULL,
	"estimated_minutes" integer,
	"actual_minutes" integer,
	"due_date" date,
	"scheduled_start" timestamp with time zone,
	"scheduled_end" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tasks_title_not_blank" CHECK (length(btrim("tasks"."title")) > 0),
	CONSTRAINT "tasks_not_own_parent" CHECK ("tasks"."parent_task_id" is null or "tasks"."parent_task_id" <> "tasks"."id"),
	CONSTRAINT "tasks_status_valid" CHECK ("tasks"."status" in ('inbox', 'todo', 'scheduled', 'in_progress', 'completed', 'cancelled', 'archived')),
	CONSTRAINT "tasks_priority_valid" CHECK ("tasks"."priority" in ('low', 'medium', 'high', 'critical')),
	CONSTRAINT "tasks_commitment_level_valid" CHECK ("tasks"."commitment_level" in ('must', 'should', 'could')),
	CONSTRAINT "tasks_durations_nonnegative" CHECK (("tasks"."estimated_minutes" is null or "tasks"."estimated_minutes" >= 0) and ("tasks"."actual_minutes" is null or "tasks"."actual_minutes" >= 0)),
	CONSTRAINT "tasks_schedule_order" CHECK ("tasks"."scheduled_start" is null or "tasks"."scheduled_end" is null or "tasks"."scheduled_start" <= "tasks"."scheduled_end"),
	CONSTRAINT "tasks_position_nonnegative" CHECK ("tasks"."position" >= 0),
	CONSTRAINT "tasks_completed_timestamp" CHECK ("tasks"."status" <> 'completed' or "tasks"."completed_at" is not null)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "life_areas_id_user_unique" ON "life_areas" USING btree ("id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "goals_id_user_unique" ON "goals" USING btree ("id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_id_user_unique" ON "projects" USING btree ("id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_id_user_unique" ON "tasks" USING btree ("id","user_id");--> statement-breakpoint
ALTER TABLE "goal_progress_history" ADD CONSTRAINT "goal_progress_history_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_progress_history" ADD CONSTRAINT "goal_progress_history_goal_owner_fk" FOREIGN KEY ("goal_id","user_id") REFERENCES "public"."goals"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_life_area_owner_fk" FOREIGN KEY ("life_area_id","user_id") REFERENCES "public"."life_areas"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_parent_owner_fk" FOREIGN KEY ("parent_goal_id","user_id") REFERENCES "public"."goals"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_items" ADD CONSTRAINT "inbox_items_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "life_areas" ADD CONSTRAINT "life_areas_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_project_owner_fk" FOREIGN KEY ("project_id","user_id") REFERENCES "public"."projects"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_goal_owner_fk" FOREIGN KEY ("goal_id","user_id") REFERENCES "public"."goals"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_life_area_owner_fk" FOREIGN KEY ("life_area_id","user_id") REFERENCES "public"."life_areas"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_owner_fk" FOREIGN KEY ("project_id","user_id") REFERENCES "public"."projects"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_goal_owner_fk" FOREIGN KEY ("goal_id","user_id") REFERENCES "public"."goals"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_life_area_owner_fk" FOREIGN KEY ("life_area_id","user_id") REFERENCES "public"."life_areas"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_owner_fk" FOREIGN KEY ("parent_task_id","user_id") REFERENCES "public"."tasks"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "app_users_email_unique" ON "app_users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "goal_progress_history_goal_recorded_idx" ON "goal_progress_history" USING btree ("goal_id","recorded_at");--> statement-breakpoint
CREATE INDEX "goal_progress_history_user_recorded_idx" ON "goal_progress_history" USING btree ("user_id","recorded_at");--> statement-breakpoint
CREATE INDEX "goals_user_status_idx" ON "goals" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "goals_life_area_idx" ON "goals" USING btree ("life_area_id");--> statement-breakpoint
CREATE INDEX "goals_parent_goal_idx" ON "goals" USING btree ("parent_goal_id");--> statement-breakpoint
CREATE INDEX "inbox_items_user_status_created_idx" ON "inbox_items" USING btree ("user_id","status","created_at");--> statement-breakpoint
CREATE INDEX "life_areas_user_status_position_idx" ON "life_areas" USING btree ("user_id","status","position");--> statement-breakpoint
CREATE UNIQUE INDEX "milestones_id_user_unique" ON "milestones" USING btree ("id","user_id");--> statement-breakpoint
CREATE INDEX "milestones_project_position_idx" ON "milestones" USING btree ("project_id","position");--> statement-breakpoint
CREATE INDEX "milestones_user_status_idx" ON "milestones" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "projects_user_status_idx" ON "projects" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "projects_goal_idx" ON "projects" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "projects_life_area_idx" ON "projects" USING btree ("life_area_id");--> statement-breakpoint
CREATE INDEX "tasks_user_status_due_idx" ON "tasks" USING btree ("user_id","status","due_date");--> statement-breakpoint
CREATE INDEX "tasks_user_scheduled_start_idx" ON "tasks" USING btree ("user_id","scheduled_start");--> statement-breakpoint
CREATE INDEX "tasks_project_idx" ON "tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "tasks_goal_idx" ON "tasks" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "tasks_life_area_idx" ON "tasks" USING btree ("life_area_id");--> statement-breakpoint
CREATE INDEX "tasks_parent_task_idx" ON "tasks" USING btree ("parent_task_id");
