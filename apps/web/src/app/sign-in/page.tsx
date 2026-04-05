import Link from "next/link";

import { signInAction } from "@/app/sign-in/actions";

function resolveSafeCallbackPath(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

export default async function SignInPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const error = resolvedSearchParams?.error === "invalid-credentials" ? resolvedSearchParams.error : "";
  const callbackUrl = resolveSafeCallbackPath(resolvedSearchParams?.callbackUrl);
  const defaultEmail = process.env.DEFAULT_USER_EMAIL ?? "hayden@example.com";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
      <section className="w-full max-w-xl rounded-[2rem] bg-surface-container p-8 shadow-ambient">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Komorebi 访问入口</p>
        <h1 className="mt-3 font-headline text-4xl text-foreground">登录你的个人工作站</h1>
        <p className="mt-4 text-sm leading-6 text-foreground/70">
          当前工作站采用私有单人登录模式。登录后，笔记、任务、写作和归档都会在同一个个人空间内解析和持久化。
        </p>

        {error ? (
          <div className="mt-6 rounded-[1.5rem] bg-white/80 px-5 py-4 text-sm text-rose-600 shadow-ambient">
            邮箱或访问口令不匹配当前工作站。
          </div>
        ) : null}

        <form action={signInAction} className="mt-8 grid gap-4">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <label className="grid gap-2 text-sm text-foreground/70">
            邮箱
            <input
              type="email"
              name="email"
              defaultValue={defaultEmail}
              className="rounded-2xl bg-white px-4 py-3 text-sm text-foreground shadow-ambient outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-foreground/70">
            访问口令
            <input
              type="password"
              name="password"
              className="rounded-2xl bg-white px-4 py-3 text-sm text-foreground shadow-ambient outline-none"
            />
          </label>
          <button type="submit" className="mt-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white">
            进入工作站
          </button>
        </form>

        <div className="mt-8 rounded-[1.5rem] bg-white/80 p-5 text-sm leading-6 text-foreground/65">
          <p className="font-semibold text-primary">私有工作站访问</p>
          <p className="mt-2">默认工作站账号是 <span className="font-medium text-foreground">{defaultEmail}</span>。</p>
          <p className="mt-1">访问口令读取自根目录 <code className="rounded bg-surface-container-low px-1.5 py-0.5">.env</code> 中的 <code className="rounded bg-surface-container-low px-1.5 py-0.5">AUTH_DEMO_PASSWORD</code>。</p>
        </div>

        <div className="mt-6 text-sm text-foreground/55">
          <Link href="https://authjs.dev" className="text-primary">
            Auth.js
          </Link>{" "}
          负责会话边界，工作站数据仍保存在 PostgreSQL 中。
        </div>
      </section>
    </main>
  );
}
