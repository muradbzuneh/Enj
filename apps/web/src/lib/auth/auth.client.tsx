import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: "https://enj-fd0ec6a0ffca.herokuapp.com",
});