CREATE TABLE "daily_priorities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"priority_date" date NOT NULL,
	"task_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_priorities_position_range" CHECK ("daily_priorities"."position" between 1 and 3)
);
--> statement-breakpoint
ALTER TABLE "daily_priorities" ADD CONSTRAINT "daily_priorities_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_priorities" ADD CONSTRAINT "daily_priorities_task_owner_fk" FOREIGN KEY ("task_id","user_id") REFERENCES "public"."tasks"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_priorities_user_date_position_unique" ON "daily_priorities" USING btree ("user_id","priority_date","position");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_priorities_user_date_task_unique" ON "daily_priorities" USING btree ("user_id","priority_date","task_id");--> statement-breakpoint
CREATE INDEX "daily_priorities_user_date_idx" ON "daily_priorities" USING btree ("user_id","priority_date");