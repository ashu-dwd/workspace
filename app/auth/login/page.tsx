"use client";

import {
  Form,
  FormControl,
  FormDescription,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export default function Login() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    console.log(values);
  }

  return (
    <div className="">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col h-screen items-center justify-center space-y-8 "
        >
          <h1 className="text-2xl font-bold">Login</h1>
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
          <Button type="submit">Login</Button>
        </form>
      </Form>
    </div>
  );
}
