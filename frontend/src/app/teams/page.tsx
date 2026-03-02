"use client";

import { redirect } from "next/navigation";

// Teams have been replaced by workspace Members.
// Redirect to the Members page.
export default function TeamsPage() {
  redirect("/users");
}
