ALTER TABLE "users" ADD COLUMN "resetPwdToken" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reset_pwd_token_expires_at" timestamp;