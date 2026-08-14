CREATE TABLE "daily_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"review_date" date NOT NULL,
	"rating" integer NOT NULL,
	"main_objective_status" text NOT NULL,
	"went_well" text NOT NULL,
	"blocker" text NOT NULL,
	"tomorrow_priority" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_reviews_rating_range" CHECK ("daily_reviews"."rating" between 1 and 5),
	CONSTRAINT "daily_reviews_objective_status_valid" CHECK ("daily_reviews"."main_objective_status" in ('achieved', 'partial', 'missed', 'not_set')),
	CONSTRAINT "daily_reviews_went_well_not_blank" CHECK (length(btrim("daily_reviews"."went_well")) > 0),
	CONSTRAINT "daily_reviews_blocker_not_blank" CHECK (length(btrim("daily_reviews"."blocker")) > 0),
	CONSTRAINT "daily_reviews_tomorrow_priority_not_blank" CHECK (length(btrim("daily_reviews"."tomorrow_priority")) > 0)
);
--> statement-breakpoint
CREATE TABLE "weekly_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"rating" integer NOT NULL,
	"summary" text NOT NULL,
	"what_worked" text NOT NULL,
	"what_didnt" text NOT NULL,
	"should_change" text NOT NULL,
	"next_week_focus" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_reviews_rating_range" CHECK ("weekly_reviews"."rating" between 1 and 5),
	CONSTRAINT "weekly_reviews_week_is_monday" CHECK (extract(isodow from "weekly_reviews"."week_start") = 1),
	CONSTRAINT "weekly_reviews_summary_not_blank" CHECK (length(btrim("weekly_reviews"."summary")) > 0),
	CONSTRAINT "weekly_reviews_what_worked_not_blank" CHECK (length(btrim("weekly_reviews"."what_worked")) > 0),
	CONSTRAINT "weekly_reviews_what_didnt_not_blank" CHECK (length(btrim("weekly_reviews"."what_didnt")) > 0),
	CONSTRAINT "weekly_reviews_should_change_not_blank" CHECK (length(btrim("weekly_reviews"."should_change")) > 0),
	CONSTRAINT "weekly_reviews_next_focus_not_blank" CHECK (length(btrim("weekly_reviews"."next_week_focus")) > 0)
);
--> statement-breakpoint
ALTER TABLE "daily_reviews" ADD CONSTRAINT "daily_reviews_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_reviews" ADD CONSTRAINT "weekly_reviews_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_reviews_user_date_unique" ON "daily_reviews" USING btree ("user_id","review_date");--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_reviews_user_week_unique" ON "weekly_reviews" USING btree ("user_id","week_start");