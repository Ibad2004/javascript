import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "@/app/actions/auth";
import { AuthForm } from "@/components/AuthForm";
import { DEFAULT_NEXT, safeNextPath } from "@/lib/safeNext";
import { parseNextParam, type RawSearchParams } from "@/lib/searchParams";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Log in" };

export default async function Page({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  if ((await getCurrentUser()) !== null) redirect(DEFAULT_NEXT);
  const next = safeNextPath(parseNextParam(await searchParams));

  return (
    <main id="main" className="auth-page">
      <section className="panel" aria-labelledby="auth-heading">
        <h1 id="auth-heading">Log in</h1>
        <AuthForm action={login} mode="login" next={next} />
        <p>
          No account yet? <Link href={`/signup?next=${encodeURIComponent(next)}`}>Sign up</Link>
        </p>
      </section>
    </main>
  );
}
