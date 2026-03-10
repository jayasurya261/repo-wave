import { auth } from "../../../lib/auth";
import type { APIRoute } from "astro";

export const prerender = false;

const handler: APIRoute = async (ctx) => {
    return auth.handler(ctx.request);
};

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const ALL = handler;
