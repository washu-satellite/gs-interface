"use client";
import z from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "./ui/input";
import { signUpData } from "@/lib/definitions";
import { Button } from "./ui/button";
import { signUp } from "@/lib/auth-client";
import { redirect } from "next/navigation";
import { useState } from "react";
import { Spinner } from "./ui/spinner";

export default function SignUp() {
    const [waiting, setWaiting] = useState(false);

    const form = useForm<z.infer<typeof signUpData>>({
        resolver: zodResolver(signUpData),
        defaultValues: {
            name: "",
            email: "",
            password: ""
        }
    });

    const submit = ({ name, email, password }: z.infer<typeof signUpData>) => {
        setWaiting(true);

        signUp.email({
            name: name,
            email: email,
            password: password
        }).then(res => {
            console.log(res);
            redirect("/");
        })
    };

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(submit)}
                className="flex-1 flex flex-col gap-4 p-4 max-w-[24rem] border rounded-md"
            >
                <h1 className="text-center capitalize font-mono text-lg">SIGN UP</h1>
                <FormField
                    control={form.control}
                    name={'name'}
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                            <Input placeholder="some_user" type="text" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name={'email'}
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                            <Input placeholder="user@wustl.edu" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name={'password'}
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                            <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="flex flex-row gap-4 items-center justify-between">
                    <Button type="submit" className="cursor-pointer flex flex-row items-center" disabled={waiting}>
                        {waiting &&
                            <Spinner />
                        }
                        <span>Submit</span>
                    </Button>
                    <div className="text-sm text-right text-muted-foreground">
                        <p>Already have an account?</p>
                        <a href="/sign-in" className="underline text-blue-600 hover:text-blue-500">sign in</a> instead.
                    </div>
                </div>
            </form>
        </Form>
    )
}