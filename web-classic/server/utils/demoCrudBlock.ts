import { Request, Response, NextFunction } from "express";

const DEMO_EMAIL = process.env.DEMO_EMAIL;
// console.log("CHECK DEMO EMAIL", DEMO_EMAIL)

// Routes demo user is allowed to write to
const ALLOWED_DEMO_ROUTES = [
    "/admin/login",
    "/admin/logout",
    "/auth/refresh",
];

export async function demoCrudBlock(
    req: Request & { email?: string },
    res: Response,
    next: NextFunction
) {
    const isDemo = !!DEMO_EMAIL && req.email === DEMO_EMAIL;
    if (!isDemo) return next();

    // Allow specific routes even if they are POST/DELETE
    if (ALLOWED_DEMO_ROUTES.includes(req.path)) {
        return next();
    }

    // If logged-in user is demo user → block writes
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
        return res.status(403).json({
            success: false,
            message: "Demo account: write operations are disabled",
        });
    }

    next();
}


