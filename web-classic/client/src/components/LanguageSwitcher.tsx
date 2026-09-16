// import { Globe } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { useTranslation } from "@/contexts/TranslationContext";

// const languages = [
//   { code: "en", name: "English", flag: "🇺🇸" },
//   { code: "es", name: "Español", flag: "🇪🇸" },
//   { code: "fr", name: "Français", flag: "🇫🇷" },
// ] as const;

// export function LanguageSwitcher() {
//   const { language, setLanguage } = useTranslation();

//   const currentLang =
//     languages.find((l) => l.code === language) || languages[0];

//   return (
//     <DropdownMenu>
//       <DropdownMenuTrigger asChild>
//         <Button
//           variant="ghost"
//           size="icon"
//           data-testid="button-language-switcher"
//         >
//           <Globe className="h-5 w-5 text-foreground" />
//           <span className="sr-only">Switch language</span>
//         </Button>
//       </DropdownMenuTrigger>
//       <DropdownMenuContent align="end">
//         {languages.map((lang) => (
//           <DropdownMenuItem
//             key={lang.code}
//             onClick={() => setLanguage(lang.code as any)}
//             className="cursor-pointer"
//             data-testid={`option-language-${lang.code}`}
//           >
//             <span className="mr-2">{lang.flag}</span>
//             <span>{lang.name}</span>
//             {language === lang.code && (
//               <span className="ml-auto text-primary">✓</span>
//             )}
//           </DropdownMenuItem>
//         ))}
//       </DropdownMenuContent>
//     </DropdownMenu>
//   );
// }



import ReactCountryFlag from "react-country-flag";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/contexts/TranslationContext";

const DEFAULT_LANGUAGE = {
  code: "en",
  name: "English",
  nativeName: "English",
  flagCode: "US",
};

export function LanguageSwitcher() {
  const { languages, languageCode, setLanguage, t } = useTranslation();
  const lan = [
  { code: "en", name: "English", nativeName: "English", flagCode: "US" },
  { code: "es", name: "Spanish", nativeName: "Español", flagCode: "ES" },
  { code: "fr", name: "French", nativeName: "Français", flagCode: "FR" },
  { code: "de", name: "German", nativeName: "Deutsch", flagCode: "DE" },
  { code: "it", name: "Italian", nativeName: "Italiano", flagCode: "IT" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flagCode: "PT" },
  { code: "ru", name: "Russian", nativeName: "Русский", flagCode: "RU" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flagCode: "JP" },
  { code: "zh", name: "Chinese", nativeName: "中文", flagCode: "CN" },
  { code: "ko", name: "Korean", nativeName: "한국어", flagCode: "KR" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flagCode: "SA" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flagCode: "IN" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", flagCode: "BD" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", flagCode: "TR" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", flagCode: "VN" },
  { code: "th", name: "Thai", nativeName: "ไทย", flagCode: "TH" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", flagCode: "NL" },
  { code: "sv", name: "Swedish", nativeName: "Svenska", flagCode: "SE" },
  { code: "pl", name: "Polish", nativeName: "Polski", flagCode: "PL" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська", flagCode: "UA" },
];

  const currentLanguage =
    languages?.find((l) => l.code === languageCode) ?? DEFAULT_LANGUAGE;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1 sm:gap-2 rounded-full px-2 sm:px-3 border-border/50"
        >
          <ReactCountryFlag
            countryCode={currentLanguage.flagCode}
            svg
            style={{ width: "18px", height: "14px" }}
          />
          <span className="hidden sm:inline text-sm font-medium">
            {currentLanguage.code.toUpperCase()}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 max-h-[400px] overflow-y-auto p-0">
        <div className="px-3 sm:px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center">
          {/* {t?.("common.button.selectLanguage") || "Select Language"} */} {t ("Select Language")}
        </div>

        {(languages || []).map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <ReactCountryFlag
                countryCode={lang.flagCode}
                svg
                style={{ width: "20px", height: "15px" }}
              />
              <div>
                <div className="font-medium">{lang.nativeName}</div>
                <div className="text-xs text-muted-foreground">
                  {lang.name}
                </div>
              </div>
            </div>

            {languageCode === lang.code && (
              <div className="h-2 w-2 rounded-full bg-gradient-to-r from-teal-500 to-teal-600" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
