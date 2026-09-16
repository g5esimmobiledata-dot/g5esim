import { Request, Response, NextFunction } from 'express';

const DEMO_EMAIL = process.env.DEMO_EMAIL;

// console.log("@@@@@@@DEMO_EMAIL", DEMO_EMAIL)

function maskValue(value: any) {
    if (typeof value === 'string') {
        // email
        if (value.includes('@')) {
            const [n, d] = value.split('@');
            return n.slice(0, 2) + '****@' + d.slice(0, 2) + '***';
        }

        // phone number
        if (/^\d{8,15}$/.test(value)) {
            return value.slice(0, 2) + '******' + value.slice(-2);
        }
    }
    return value;
}

export async function demoMaskResponse(
    req: Request & { email?: string },
    res: Response,
    next: NextFunction
) {
    const isDemo = !!DEMO_EMAIL && req.email === DEMO_EMAIL;
    if (!isDemo) return next();


    const oldJson = res.json;

    res.json = function (data: any) {
        const walk = (obj: any) => {
            if (!obj || typeof obj !== 'object') return obj;

            for (const key in obj) {
                if (typeof obj[key] === 'object') {
                    obj[key] = walk(obj[key]);
                } else {
                    obj[key] = maskValue(obj[key]);
                }
            }
            return obj;
        };

        return oldJson.call(this, walk(data));
    };

    next();
}