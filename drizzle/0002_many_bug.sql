CREATE TABLE "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"all_day" integer DEFAULT 0 NOT NULL,
	"location" text,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_events_title_not_blank" CHECK (length(btrim("calendar_events"."title")) > 0),
	CONSTRAINT "calendar_events_range_valid" CHECK ("calendar_events"."end_at" >= "calendar_events"."start_at"),
	CONSTRAINT "calendar_events_all_day_valid" CHECK ("calendar_events"."all_day" in (0, 1)),
	CONSTRAINT "calendar_events_status_valid" CHECK ("calendar_events"."status" in ('confirmed', 'cancelled', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "time_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"task_id" uuid,
	"project_id" uuid,
	"goal_id" uuid,
	"life_area_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "time_blocks_title_not_blank" CHECK (length(btrim("time_blocks"."title")) > 0),
	CONSTRAINT "time_blocks_range_valid" CHECK ("time_blocks"."end_at" >= "time_blocks"."start_at"),
	CONSTRAINT "time_blocks_status_valid" CHECK ("time_blocks"."status" in ('planned', 'completed', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_blocks" ADD CONSTRAINT "time_blocks_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_blocks" ADD CONSTRAINT "time_blocks_task_owner_fk" FOREIGN KEY ("task_id","user_id") REFERENCES "public"."tasks"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_blocks" ADD CONSTRAINT "time_blocks_project_owner_fk" FOREIGN KEY ("project_id","user_id") REFERENCES "public"."projects"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_blocks" ADD CONSTRAINT "time_blocks_goal_owner_fk" FOREIGN KEY ("goal_id","user_id") REFERENCES "public"."goals"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_blocks" ADD CONSTRAINT "time_blocks_life_area_owner_fk" FOREIGN KEY ("life_area_id","user_id") REFERENCES "public"."life_areas"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_events_id_user_unique" ON "calendar_events" USING btree ("id","user_id");--> statement-breakpoint
CREATE INDEX "calendar_events_user_start_idx" ON "calendar_events" USING btree ("user_id","start_at");--> statement-breakpoint
CREATE INDEX "calendar_events_user_status_start_idx" ON "calendar_events" USING btree ("user_id","status","start_at");--> statement-breakpoint
CREATE UNIQUE INDEX "time_blocks_id_user_unique" ON "time_blocks" USING btree ("id","user_id");--> statement-breakpoint
CREATE INDEX "time_blocks_user_start_idx" ON "time_blocks" USING btree ("user_id","start_at");--> statement-breakpoint
CREATE INDEX "time_blocks_user_status_start_idx" ON "time_blocks" USING btree ("user_id","status","start_at");