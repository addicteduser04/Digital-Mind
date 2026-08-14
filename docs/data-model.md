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

## Daily priorities

`daily_priorities` preserves the tasks explicitly chosen for each local calendar date. Positions are restricted to 1–3, with unique owner/date/position and owner/date/task keys. The composite task ownership foreign key rejects cross-owner assignments, while `ON DELETE RESTRICT` prevents an archived or historical priority from disappearing through task deletion. Replacing today’s set never touches previous dates.

Today grouping uses one operational list with deterministic precedence: overdue, scheduled today, due today, then other active tasks. Priority membership is visual context and does not duplicate a task between groups.

## Bootstrap user

No production bootstrap user is created automatically. `createAppUser` provides the future authentication/bootstrap boundary, while integration tests create uniquely named isolated users and remove them afterward. This avoids hardcoded personal information and accidental seed data in Neon.
