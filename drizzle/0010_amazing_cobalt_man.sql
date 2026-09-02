CREATE TYPE "public"."public_access" AS ENUM('off', 'viewer', 'editor');--> statement-breakpoint
CREATE TYPE "public"."share_role" AS ENUM('editor', 'viewer');--> statement-breakpoint
CREATE TABLE "notebook_shares" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notebook_shares_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"notebookId" integer NOT NULL,
	"sharedWithUserId" integer NOT NULL,
	"role" "share_role" DEFAULT 'viewer' NOT NULL,
	"invitedByUserId" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "notebooks" ADD COLUMN "shareToken" varchar(64);--> statement-breakpoint
ALTER TABLE "notebooks" ADD COLUMN "public_access" "public_access" DEFAULT 'off';--> statement-breakpoint
ALTER TABLE "notebook_shares" ADD CONSTRAINT "notebook_shares_notebookId_notebooks_id_fk" FOREIGN KEY ("notebookId") REFERENCES "public"."notebooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebook_shares" ADD CONSTRAINT "notebook_shares_sharedWithUserId_users_id_fk" FOREIGN KEY ("sharedWithUserId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebook_shares" ADD CONSTRAINT "notebook_shares_invitedByUserId_users_id_fk" FOREIGN KEY ("invitedByUserId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebooks" ADD CONSTRAINT "notebooks_shareToken_unique" UNIQUE("shareToken");