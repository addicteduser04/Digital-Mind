# Core data model decisions

## Ownership

`app_users` is the stable application identity. A future authentication adapter can map provider subjects to this ID without changing domain ownership. Every top-level domain record carries `user_id`.

Milestones also carry `user_id`. Although ownership could be derived through a project, direct ownership makes tenant-scoped milestone queries efficient and lets the composite `(project_id, user_id)` foreign key reject cross-owner references in PostgreSQL.

Owned parents expose a unique `(id, user_id)` key. Child references use both values, so a project, task, milestone, nested task, or nested goal cannot point across owners even if application validation is bypassed.

## Deletion and archival

All ownership and domain foreign keys use `ON DELETE RESTRICT`. Core records have archive/cancel/abandon states because deleting a parent should not erase completed or historical work. Optional links are deliberately not `SET NULL`: explicit unlinking through the domain layer is preferable to silent context loss. A future hard-delete workflow can prove that a record is safe before deleting it.

## Hierarchies

PostgreSQL checks reject direct self-parenting, and composite foreign keys enforce same-owner parents. Arbitrary-depth cycles cannot be prevented with a simple check constraint. `setGoalParent` and `setTaskParent` walk the proposed ancestor chain before updating. All future parent changes must use these domain functions.

## Timestamps

Events use `timestamp with time zone`; date-only planning concepts use `date`. PostgreSQL supplies initial `created_at` and `updated_at` values. Repositories explicitly set `updated_at` on mutations—there is no assumption that PostgreSQL updates it automatically.

## Progress history

`goal_progress_history` is the one Phase 1 history foundation. Goal progress is central and otherwise destructive to overwrite. Each sample retains progress, optional current value, owner, goal, and recording timestamp. Additional project, life-area, and analytics snapshots wait until their real workflows exist.

Phase 3 writes a sample only when progress or the supplied current value changes. Completing, reopening, or archiving a goal leaves its samples intact. Project progress remains explicitly manual; milestone completion is shown as a separate rollup and does not silently overwrite project progress.

## Planning context

Goals can form arbitrary-depth same-owner trees. The Phase 3 repository walks the proposed parent chain before every goal-parent update and rejects cycles. Life-area and detail queries always include the active owner boundary, including their linked tasks and rollups.

A project may link directly to both a goal and a life area. When the linked goal already has a life area, the project life area must match it. The repository rejects conflicting context before PostgreSQL ownership constraints provide the final boundary.

## Calendar and planned time

Calendar events represent fixed commitments. Scheduled tasks remain task records with `scheduled_start` and `scheduled_end`; scheduling never changes their due date, estimate, or actual minutes. Time blocks represent deliberately reserved time and can optionally reference same-owner planning context. They are not created automatically from task schedules.

Events and time blocks are retained through status changes rather than destructive deletion. Range queries use overlap semantics (`start < range end` and `end > range start`) so items crossing midnight or a visible boundary remain visible.

Planned minutes include scheduled-task duration and independent time-block duration. Events are commitments rather than planned work and are excluded. If a time block references a task that is itself scheduled in the visible range, the block is excluded so the task is counted once.

## Habit semantics

All habit types share `habits` and one canonical `habit_logs` row per owner, habit, and local date. Boolean values are 0/1. Quantity values use the habit’s declared unit. Duration values are normalized to minutes. Frequency values are occurrence counts for a date; weekly progress sums those daily counts across the Casablanca-local week. The per-log `completed` flag is intentionally not used as a daily success judgment for weekly habits.

Corrections update the canonical daily log and its `updated_at`. Archiving a habit retains all logs and uses `ON DELETE RESTRICT` to protect history.

## Focus and actual time

`focus_sessions` is the source of truth for measured focused work. A partial unique index on `user_id` where status is `active` enforces one running session per owner even under concurrent starts. Timer starts and stops use database timestamps. Completed duration is whole elapsed minutes rounded down, never a client-submitted timer value; manual entries explicitly supply a positive whole-minute duration and are marked with source `manual`.

Stopping focus does not complete a task, alter a time block, or log a habit. Timer-recorded timestamps are locked after completion, while context and notes remain correctable. `tasks.actual_minutes` remains separate legacy/manual task-level time and is never added to focus-session aggregates, preventing actual-time double counting.

Planned-versus-actual comparisons use the Phase 4 planned-time rule against completed focus-session minutes for the same Casablanca-local range. Aggregation occurs in SQL for day, week, task, and project scopes.

## Daily priorities

`daily_priorities` preserves the tasks explicitly chosen for each local calendar date. Positions are restricted to 1–3, with unique owner/date/position and owner/date/task keys. The composite task ownership foreign key rejects cross-owner assignments, while `ON DELETE RESTRICT` prevents an archived or historical priority from disappearing through task deletion. Replacing today’s set never touches previous dates.

Today grouping uses one operational list with deterministic precedence: overdue, scheduled today, due today, then other active tasks. Priority membership is visual context and does not duplicate a task between groups.

## Bootstrap user

No production bootstrap user is created automatically. `createAppUser` provides the future authentication/bootstrap boundary, while integration tests create uniquely named isolated users and remove them afterward. This avoids hardcoded personal information and accidental seed data in Neon.
