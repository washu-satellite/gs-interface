import z from "zod";

export const signUpData = z.object({
    name: z.string()
        .min(1, { error: "Username must be at least 1 character" })
        .max(16, { error: "Username cannot be longer than 16 characters" })
        .regex(/^[a-zA-Z0-9_]+$/, { error: "Username must be alphanumeric and/or underscores" })
        .trim(),
    email: z.email({ error: "Invalid email address!" }).trim(),
    password: z.string()
        .min(8, { error: "Password must be at least 8 characters" })
        .regex(/[a-zA-Z_]/, { error: 'Contain at least one letter.' })
        .regex(/[0-9]/, { error: 'Contain at least one number.' })
        .regex(/[^a-zA-Z0-9]/, {
        error: 'Contain at least one special character.',
        })
        .trim()
});

export const signInUsernameData = z.object({
    name: z.string()
        .min(1, { error: "Username must be at least 1 character" })
        .max(16, { error: "Username cannot be longer than 16 characters" })
        .regex(/^[a-zA-Z0-9_]+$/, { error: "Username must be alphanumeric and/or underscores" })
        .trim(),
    password: z.string()
        .min(8, { error: "Password must be at least 8 characters" })
        .regex(/[a-zA-Z_]/, { error: 'Contain at least one letter.' })
        .regex(/[0-9]/, { error: 'Contain at least one number.' })
        .regex(/[^a-zA-Z0-9]/, {
        error: 'Contain at least one special character.',
        })
        .trim()
});

export const signInEmailData = z.object({
    email: z.email({ error: "Invalid email address!" }).trim(),
    password: z.string()
        .min(8, { error: "Password must be at least 8 characters" })
        .regex(/[a-zA-Z_]/, { error: 'Contain at least one letter.' })
        .regex(/[0-9]/, { error: 'Contain at least one number.' })
        .regex(/[^a-zA-Z0-9]/, {
        error: 'Contain at least one special character.',
        })
        .trim()
});


type DataField = {

}