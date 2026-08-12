ALTER TABLE "notebooks" ALTER COLUMN "content" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "notebooks" ALTER COLUMN "content" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "notebooks" ADD COLUMN "icon" varchar(10) DEFAULT '📝';