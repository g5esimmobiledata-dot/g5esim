import axios from "axios";
import { storage } from "../storage";

export async function verifyCaptcha(token: string) {
  const secretKeySetting = await storage.getSettingByKey(
    "recaptcha_secret_key"
  );

  if (!secretKeySetting?.value) return false;

  const { data } = await axios.post(
    "https://www.google.com/recaptcha/api/siteverify",
    null,
    {
      params: {
        secret: secretKeySetting.value,
        response: token,
      },
    }
  );

  return data.success;
}