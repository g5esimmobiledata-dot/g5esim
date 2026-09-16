import { google } from "googleapis";

export const getAndroidPublisher = () => {
    const auth = new google.auth.GoogleAuth({
        keyFile: "server/config/service-playstore.json", // firebase.json
        scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });

    return google.androidpublisher({
        version: "v3",
        auth,
    });
};
