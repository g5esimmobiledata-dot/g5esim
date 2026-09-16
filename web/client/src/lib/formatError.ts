export function formatErrorMessage(error: any): string {
    if (!error) return "Something went wrong. Please try again.";


    let raw: any;

    // Axios / React Query / Fetch
    if (error?.response?.data) {
        raw = error.response.data;
    } else if (error?.data) {
        raw = error.data;
    } else if (error?.message) {
        raw = error.message;
    } else {
        raw = error;
    }

    // 🔥 If it's a string, clean "401: " / "500: " etc before parsing
    if (typeof raw === "string") {
        const cleaned = raw.replace(/^\d+\s*:\s*/, ""); // remove "401: ", "500: " etc

        try {
            const parsed = JSON.parse(cleaned);
            if (parsed?.message) return parsed.message;
            raw = parsed;
        } catch {
            raw = cleaned; // not JSON, keep cleaned string
        }
    }

    // 🔥 If it's an object, extract message
    if (typeof raw === "object" && raw !== null) {
        if (raw.message) return raw.message;
        return JSON.stringify(raw);
    }

    // Cleanup fallback
    let msg = String(raw)
        .replace(/^Error:\s*/i, "")
        .replace(/^\d+\s*:\s*/i, "")
        .trim();


    // Friendly mappings
    if (msg.toLowerCase().includes("users_email_unique")) {
        return "This email is already registered.";
    }

    if (msg.toLowerCase().includes("duplicate key")) {
        return "This record already exists.";
    }

    if (msg.toLowerCase().includes("permission")) {
        return "You don't have permission to perform this action.";
    }

    if (msg.toLowerCase().includes("network")) {
        return "Network error. Please check your internet connection.";
    }

    console.log(msg)

    return msg || "Something went wrong. Please try again.";
}
