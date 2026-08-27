"use client";

import {
  Form,
  FormControl,
  FormDescription,
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

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export default function ForgotPassword() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) =>
      fetch("/api/auth/forgot-pwd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      }),
  });
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const res = await mutation.mutateAsync(values);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to send reset link");
      }

      toast.success("Password reset link sent! Please check your email.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send reset link",
      );
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tighter sm:text-3xl">
            Forgot your password?
          </h1>
        </div>
        <div className="w-full max-w-sm rounded-lg border bg-card p-8 shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      We&apos;ll send you a link to reset your password.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
