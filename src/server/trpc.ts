import "server-only";

import { headers } from "next/headers";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { auth } from "@/server/auth";

export async function createTRPCContext() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return {
    session,
    userId: session?.user?.id ?? null,
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});

export const approvedProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    const { userRepository } = await import("@/repositories/user.repository");
    const user = await userRepository.findById(ctx.userId);

    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    if (user.approvalStatus !== "APPROVED") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Your account is pending approval. Please contact support.",
      });
    }

    return next({
      ctx: {
        ...ctx,
        userName: user.name,
      },
    });
  }
);
