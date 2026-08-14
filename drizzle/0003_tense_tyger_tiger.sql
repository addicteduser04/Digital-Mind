CREATE TABLE IF NOT EXISTS "focus_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"task_id" uuid,
	"project_id" uuid,
	"goal_id" uuid,
	"life_area_id" uuid,
	"planned_minutes" integer,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_minutes" integer,
	"status" text NOT NULL,
	"source" text DEFAULT 'timer' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "focus_sessions_status_valid" CHECK ("focus_sessions"."status" in ('active', 'completed', 'cancelled')),
	CONSTRAINT "focus_sessions_source_valid" CHECK ("focus_sessions"."source" in ('timer', 'manual')),
	CONSTRAINT "focus_sessions_planned_positive" CHECK ("focus_sessions"."planned_minutes" is null or "focus_sessions"."planned_minutes" > 0),
	CONSTRAINT "focus_sessions_duration_nonnegative" CHECK ("focus_sessions"."duration_minutes" is null or "focus_sessions"."duration_minutes" >= 0),
	CONSTRAINT "focus_sessions_time_order" CHECK ("focus_sessions"."ended_at" is null or "focus_sessions"."ended_at" >= "focus_sessions"."started_at"),
	CONSTRAINT "focus_sessions_state_consistent" CHECK (("focus_sessions"."status" = 'active' and "focus_sessions"."ended_at" is null and "focus_sessions"."duration_minutes" is null) or ("focus_sessions"."status" <> 'active' and "focus_sessions"."ended_at" is not null and "focus_sessions"."duration_minutes" is not null))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "habit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"habit_id" uuid NOT NULL,
	"log_date" date NOT NULL,
	"value" numeric(18, 4) DEFAULT '0' NOT NULL,
	"completed" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "habit_logs_value_nonnegative" CHECK ("habit_logs"."value" >= 0),
	CONSTRAINT "habit_logs_completed_valid" CHECK ("habit_logs"."completed" in (0, 1))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "habits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"life_area_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"tracking_type" text NOT NULL,
	"unit" text,
	"target_value" numeric(18, 4),
	"frequency_type" text DEFAULT 'daily' NOT NULL,
	"target_frequency" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "habits_name_not_blank" CHECK (length(btrim("habits"."name")) > 0),
	CONSTRAINT "habits_tracking_type_valid" CHECK ("habits"."tracking_type" in ('boolean', 'quantity', 'duration', 'frequency')),
	CONSTRAINT "habits_frequency_type_valid" CHECK ("habits"."frequency_type" in ('daily', 'weekly')),
	CONSTRAINT "habits_status_valid" CHECK ("habits"."status" in ('active', 'archived')),
	CONSTRAINT "habits_target_value_positive" CHECK ("habits"."target_value" is null or "habits"."target_value" > 0),
	CONSTRAINT "habits_target_frequency_positive" CHECK ("habits"."target_frequency" is null or "habits"."target_frequency" > 0),
	CONSTRAINT "habits_position_nonnegative" CHECK ("habits"."position" >= 0),
	CONSTRAINT "habits_archive_timestamp" CHECK ("habits"."status" <> 'archived' or "habits"."archived_at" is not null)
);
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'focus_sessions_user_fk') THEN ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE restrict ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'focus_sessions_task_owner_fk') THEN ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_task_owner_fk" FOREIGN KEY ("task_id","user_id") REFERENCES "public"."tasks"("id","user_id") ON DELETE restrict ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'focus_sessions_project_owner_fk') THEN ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_project_owner_fk" FOREIGN KEY ("project_id","user_id") REFERENCES "public"."projects"("id","user_id") ON DELETE restrict ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'focus_sessions_goal_owner_fk') THEN ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_goal_owner_fk" FOREIGN KEY ("goal_id","user_id") REFERENCES "public"."goals"("id","user_id") ON DELETE restrict ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'focus_sessions_life_area_owner_fk') THEN ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_life_area_owner_fk" FOREIGN KEY ("life_area_id","user_id") REFERENCES "public"."life_areas"("id","user_id") ON DELETE restrict ON UPDATE no action; END IF; END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "habits_id_user_unique" ON "habits" USING btree ("id","user_id");--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'habit_logs_user_fk') THEN ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE restrict ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'habit_logs_habit_owner_fk') THEN ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_habit_owner_fk" FOREIGN KEY ("habit_id","user_id") REFERENCES "public"."habits"("id","user_id") ON DELETE restrict ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'habits_user_fk') THEN ALTER TABLE "habits" ADD CONSTRAINT "habits_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE restrict ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'habits_life_area_owner_fk') THEN ALTER TABLE "habits" ADD CONSTRAINT "habits_life_area_owner_fk" FOREIGN KEY ("life_area_id","user_id") REFERENCES "public"."life_areas"("id","user_id") ON DELETE restrict ON UPDATE no action; END IF; END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "focus_sessions_one_active_user_unique" ON "focus_sessions" USING btree ("user_id") WHERE "focus_sessions"."status" = 'active';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "focus_sessions_user_started_idx" ON "focus_sessions" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "focus_sessions_user_status_idx" ON "focus_sessions" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "focus_sessions_user_task_started_idx" ON "focus_sessions" USING btree ("user_id","task_id","started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "focus_sessions_user_project_started_idx" ON "focus_sessions" USING btree ("user_id","project_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "habit_logs_user_habit_date_unique" ON "habit_logs" USING btree ("user_id","habit_id","log_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "habit_logs_user_date_idx" ON "habit_logs" USING btree ("user_id","log_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "habits_user_status_position_idx" ON "habits" USING btree ("user_id","status","position");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "habits_user_life_area_idx" ON "habits" USING btree ("user_id","life_area_id");
