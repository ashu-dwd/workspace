"use client";

import {
  Form,
  FormControl,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const formSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  email: z.string().email(),
  password: z.string().min(6),
});

export default function SignUp() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const response = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Sign-up failed:", data.message);
        return;
      }

      console.log("Sign-up successful:", data);
      // TODO: Redirect to login or dashboard after successful sign-up
    } catch (error) {
      console.error("Sign-up error:", error);
    }
  }

  return (
    <div className="">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col h-screen items-center justify-center space-y-8 "
        >
          <h1 className="text-2xl font-bold">Sign Up</h1>
          <div className="">
            <FormLabel htmlFor="username">Username: </FormLabel>
            <FormControl>
              <Input id="username" {...form.register("username")} />
            </FormControl>
            <FormMessage />
          </div>
          <div className="">
            <FormLabel htmlFor="email">Email: </FormLabel>
            <FormControl>
              <Input id="email" {...form.register("email")} />
            </FormControl>
            <FormMessage />
          </div>
          <div className="">
            <FormLabel htmlFor="password">Password: </FormLabel>
            <FormControl>
              <Input
                id="password"
                {...form.register("password")}
                type="password"
              />
            </FormControl>
            <FormMessage />
          </div>
          <Button type="submit">Sign Up</Button>
        </form>
      </Form>
    </div>
  );
}
