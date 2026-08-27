"use client";

import { Suspense } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

function ResetPasswordForm() {
  const router = useRouter();
  const searchParamsData = useSearchParams();
  const token = searchParamsData.get("token") as string;

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (values: z.infer<typeof resetPasswordSchema>) =>
      fetch("/api/auth/reset-pwd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword: values.newPassword,
        }),
      }),
  });

  const onSubmit = async (values: z.infer<typeof resetPasswordSchema>) => {
    try {
      const res = await resetPasswordMutation.mutateAsync(values);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Password reset failed");
      }

      toast.success("Password reset successful!");
      router.push("/auth/login");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Password reset failed"
      );
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tighter sm:text-3xl">
            Reset Password
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Enter your new password
          </p>
        </div>
        <div className="w-full max-w-sm rounded-lg border bg-card p-8 shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={resetPasswordMutation.isPending}>
                {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
