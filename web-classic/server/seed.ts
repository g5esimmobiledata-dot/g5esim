import { db } from "./db";
import { destinations, regions, settings } from "@shared/schema";
import { eq } from "drizzle-orm";
import { seedEnterpriseUsers } from "./seedEnterpriseUsers";
import { seedCountryCodeMappings } from "./seeds/country-code-mappings";


async function seed() {
  console.log("🌱 Seeding database...");
  await seedEnterpriseUsers();
  await seedCountryCodeMappings()
  // Seed destinations
  const destData = [
    { name: "Afghanistan", slug: "afghanistan", countryCode: "AF", flagEmoji: "🇦🇫" },
    { name: "Åland Islands", slug: "aland-islands", countryCode: "AX", flagEmoji: "🇦🇽" },
    { name: "Albania", slug: "albania", countryCode: "AL", flagEmoji: "🇦🇱" },
    { name: "Algeria", slug: "algeria", countryCode: "DZ", flagEmoji: "🇩🇿" },
    { name: "American Samoa", slug: "american-samoa", countryCode: "AS", flagEmoji: "🇦🇸" },
    { name: "Andorra", slug: "andorra", countryCode: "AD", flagEmoji: "🇦🇩" },
    { name: "Angola", slug: "angola", countryCode: "AO", flagEmoji: "🇦🇴" },
    { name: "Anguilla", slug: "anguilla", countryCode: "AI", flagEmoji: "🇦🇮" },
    { name: "Antarctica", slug: "antarctica", countryCode: "AQ", flagEmoji: "🇦🇶" },
    { name: "Antigua and Barbuda", slug: "antigua-and-barbuda", countryCode: "AG", flagEmoji: "🇦🇬" },
    { name: "Argentina", slug: "argentina", countryCode: "AR", flagEmoji: "🇦🇷" },
    { name: "Armenia", slug: "armenia", countryCode: "AM", flagEmoji: "🇦🇲" },
    { name: "Aruba", slug: "aruba", countryCode: "AW", flagEmoji: "🇦🇼" },
    { name: "Australia", slug: "australia", countryCode: "AU", flagEmoji: "🇦🇺" },
    { name: "Austria", slug: "austria", countryCode: "AT", flagEmoji: "🇦🇹" },
    { name: "Azerbaijan", slug: "azerbaijan", countryCode: "AZ", flagEmoji: "🇦🇿" },
    { name: "Bahamas", slug: "bahamas", countryCode: "BS", flagEmoji: "🇧🇸" },
    { name: "Bahrain", slug: "bahrain", countryCode: "BH", flagEmoji: "🇧🇭" },
    { name: "Bangladesh", slug: "bangladesh", countryCode: "BD", flagEmoji: "🇧🇩" },
    { name: "Barbados", slug: "barbados", countryCode: "BB", flagEmoji: "🇧🇧" },
    { name: "Belarus", slug: "belarus", countryCode: "BY", flagEmoji: "🇧🇾" },
    { name: "Belgium", slug: "belgium", countryCode: "BE", flagEmoji: "🇧🇪" },
    { name: "Belize", slug: "belize", countryCode: "BZ", flagEmoji: "🇧🇿" },
    { name: "Benin", slug: "benin", countryCode: "BJ", flagEmoji: "🇧🇯" },
    { name: "Bermuda", slug: "bermuda", countryCode: "BM", flagEmoji: "🇧🇲" },
    { name: "Bhutan", slug: "bhutan", countryCode: "BT", flagEmoji: "🇧🇹" },
    { name: "Bolivia", slug: "bolivia", countryCode: "BO", flagEmoji: "🇧🇴" },
    { name: "Bonaire, Sint Eustatius and Saba", slug: "bonaire-sint-eustatius-and-saba", countryCode: "BQ", flagEmoji: "🇧🇶" },
    { name: "Bosnia and Herzegovina", slug: "bosnia-and-herzegovina", countryCode: "BA", flagEmoji: "🇧🇦" },
    { name: "Botswana", slug: "botswana", countryCode: "BW", flagEmoji: "🇧🇼" },
    { name: "Bouvet Island", slug: "bouvet-island", countryCode: "BV", flagEmoji: "🇧🇻" },
    { name: "Brazil", slug: "brazil", countryCode: "BR", flagEmoji: "🇧🇷" },
    { name: "British Indian Ocean Territory", slug: "british-indian-ocean-territory", countryCode: "IO", flagEmoji: "🇮🇴" },
    { name: "Brunei Darussalam", slug: "brunei", countryCode: "BN", flagEmoji: "🇧🇳" },
    { name: "Bulgaria", slug: "bulgaria", countryCode: "BG", flagEmoji: "🇧🇬" },
    { name: "Burkina Faso", slug: "burkina-faso", countryCode: "BF", flagEmoji: "🇧🇫" },
    { name: "Burundi", slug: "burundi", countryCode: "BI", flagEmoji: "🇧🇮" },
    { name: "Cabo Verde", slug: "cabo-verde", countryCode: "CV", flagEmoji: "🇨🇻" },
    { name: "Cambodia", slug: "cambodia", countryCode: "KH", flagEmoji: "🇰🇭" },
    { name: "Cameroon", slug: "cameroon", countryCode: "CM", flagEmoji: "🇨🇲" },
    { name: "Canada", slug: "canada", countryCode: "CA", flagEmoji: "🇨🇦" },
    { name: "Cayman Islands", slug: "cayman-islands", countryCode: "KY", flagEmoji: "🇰🇾" },
    { name: "Central African Republic", slug: "central-african-republic", countryCode: "CF", flagEmoji: "🇨🇫" },
    { name: "Chad", slug: "chad", countryCode: "TD", flagEmoji: "🇹🇩" },
    { name: "Chile", slug: "chile", countryCode: "CL", flagEmoji: "🇨🇱" },
    { name: "China", slug: "china", countryCode: "CN", flagEmoji: "🇨🇳" },
    { name: "Christmas Island", slug: "christmas-island", countryCode: "CX", flagEmoji: "🇨🇽" },
    { name: "Cocos (Keeling) Islands", slug: "cocos-islands", countryCode: "CC", flagEmoji: "🇨🇨" },
    { name: "Colombia", slug: "colombia", countryCode: "CO", flagEmoji: "🇨🇴" },
    { name: "Comoros", slug: "comoros", countryCode: "KM", flagEmoji: "🇰🇲" },
    { name: "Congo", slug: "congo", countryCode: "CG", flagEmoji: "🇨🇬" },
    { name: "Congo (Democratic Republic)", slug: "congo-democratic-republic", countryCode: "CD", flagEmoji: "🇨🇩" },
    { name: "Cook Islands", slug: "cook-islands", countryCode: "CK", flagEmoji: "🇨🇰" },
    { name: "Costa Rica", slug: "costa-rica", countryCode: "CR", flagEmoji: "🇨🇷" },
    { name: "Croatia", slug: "croatia", countryCode: "HR", flagEmoji: "🇭🇷" },
    { name: "Cuba", slug: "cuba", countryCode: "CU", flagEmoji: "🇨🇺" },
    { name: "Curaçao", slug: "curacao", countryCode: "CW", flagEmoji: "🇨🇼" },
    { name: "Cyprus", slug: "cyprus", countryCode: "CY", flagEmoji: "🇨🇾" },
    { name: "Northern Cyprus", slug: "cyprus", countryCode: "CYP", flagEmoji: "🇨🇾p" },
    { name: "Czechia", slug: "czechia", countryCode: "CZ", flagEmoji: "🇨🇿" },
    { name: "Denmark", slug: "denmark", countryCode: "DK", flagEmoji: "🇩🇰" },
    { name: "Djibouti", slug: "djibouti", countryCode: "DJ", flagEmoji: "🇩🇯" },
    { name: "Dominica", slug: "dominica", countryCode: "DM", flagEmoji: "🇩🇲" },
    { name: "Dominican Republic", slug: "dominican-republic", countryCode: "DO", flagEmoji: "🇩🇴" },
    { name: "Ecuador", slug: "ecuador", countryCode: "EC", flagEmoji: "🇪🇨" },
    { name: "Egypt", slug: "egypt", countryCode: "EG", flagEmoji: "🇪🇬" },
    { name: "El Salvador", slug: "el-salvador", countryCode: "SV", flagEmoji: "🇸🇻" },
    { name: "Equatorial Guinea", slug: "equatorial-guinea", countryCode: "GQ", flagEmoji: "🇬🇶" },
    { name: "Eritrea", slug: "eritrea", countryCode: "ER", flagEmoji: "🇪🇷" },
    { name: "Estonia", slug: "estonia", countryCode: "EE", flagEmoji: "🇪🇪" },
    { name: "Eswatini", slug: "eswatini", countryCode: "SZ", flagEmoji: "🇸🇿" },
    { name: "Ethiopia", slug: "ethiopia", countryCode: "ET", flagEmoji: "🇪🇹" },
    { name: "Falkland Islands", slug: "falkland-islands", countryCode: "FK", flagEmoji: "🇫🇰" },
    { name: "Faroe Islands", slug: "faroe-islands", countryCode: "FO", flagEmoji: "🇫🇴" },
    { name: "Fiji", slug: "fiji", countryCode: "FJ", flagEmoji: "🇫🇯" },
    { name: "Finland", slug: "finland", countryCode: "FI", flagEmoji: "🇫🇮" },
    { name: "France", slug: "france", countryCode: "FR", flagEmoji: "🇫🇷" },
    { name: "French Guiana", slug: "french-guiana", countryCode: "GF", flagEmoji: "🇬🇫" },
    { name: "French Polynesia", slug: "french-polynesia", countryCode: "PF", flagEmoji: "🇵🇫" },
    { name: "French Southern Territories", slug: "french-southern-territories", countryCode: "TF", flagEmoji: "🇹🇫" },
    { name: "Gabon", slug: "gabon", countryCode: "GA", flagEmoji: "🇬🇦" },
    { name: "Gambia", slug: "gambia", countryCode: "GM", flagEmoji: "🇬🇲" },
    { name: "Georgia", slug: "georgia", countryCode: "GE", flagEmoji: "🇬🇪" },
    { name: "Germany", slug: "germany", countryCode: "DE", flagEmoji: "🇩🇪" },
    { name: "Ghana", slug: "ghana", countryCode: "GH", flagEmoji: "🇬🇭" },
    { name: "Gibraltar", slug: "gibraltar", countryCode: "GI", flagEmoji: "🇬🇮" },
    { name: "Greece", slug: "greece", countryCode: "GR", flagEmoji: "🇬🇷" },
    { name: "Greenland", slug: "greenland", countryCode: "GL", flagEmoji: "🇬🇱" },
    { name: "Grenada", slug: "grenada", countryCode: "GD", flagEmoji: "🇬🇩" },
    { name: "Guadeloupe", slug: "guadeloupe", countryCode: "GP", flagEmoji: "🇬🇵" },
    { name: "Guam", slug: "guam", countryCode: "GU", flagEmoji: "🇬🇺" },
    { name: "Guatemala", slug: "guatemala", countryCode: "GT", flagEmoji: "🇬🇹" },
    { name: "Guernsey", slug: "guernsey", countryCode: "GG", flagEmoji: "🇬🇬" },
    { name: "Guinea", slug: "guinea", countryCode: "GN", flagEmoji: "🇬🇳" },
    { name: "Guinea-Bissau", slug: "guinea-bissau", countryCode: "GW", flagEmoji: "🇬🇼" },
    { name: "Guyana", slug: "guyana", countryCode: "GY", flagEmoji: "🇬🇾" },
    { name: "Haiti", slug: "haiti", countryCode: "HT", flagEmoji: "🇭🇹" },
    { name: "Heard Island and McDonald Islands", slug: "heard-island-mcdonald-islands", countryCode: "HM", flagEmoji: "🇭🇲" },
    { name: "Holy See", slug: "holy-see", countryCode: "VA", flagEmoji: "🇻🇦" },
    { name: "Honduras", slug: "honduras", countryCode: "HN", flagEmoji: "🇭🇳" },
    { name: "Hong Kong", slug: "hong-kong", countryCode: "HK", flagEmoji: "🇭🇰" },
    { name: "Hungary", slug: "hungary", countryCode: "HU", flagEmoji: "🇭🇺" },
    { name: "Iceland", slug: "iceland", countryCode: "IS", flagEmoji: "🇮🇸" },
    { name: "India", slug: "india", countryCode: "IN", flagEmoji: "🇮🇳" },
    { name: "Indonesia", slug: "indonesia", countryCode: "ID", flagEmoji: "🇮🇩" },
    { name: "Iran", slug: "iran", countryCode: "IR", flagEmoji: "🇮🇷" },
    { name: "Iraq", slug: "iraq", countryCode: "IQ", flagEmoji: "🇮🇶" },
    { name: "Ireland", slug: "ireland", countryCode: "IE", flagEmoji: "🇮🇪" },
    { name: "Isle of Man", slug: "isle-of-man", countryCode: "IM", flagEmoji: "🇮🇲" },
    { name: "Israel", slug: "israel", countryCode: "IL", flagEmoji: "🇮🇱" },
    { name: "Italy", slug: "italy", countryCode: "IT", flagEmoji: "🇮🇹" },
    { name: "Jamaica", slug: "jamaica", countryCode: "JM", flagEmoji: "🇯🇲" },
    { name: "Japan", slug: "japan", countryCode: "JP", flagEmoji: "🇯🇵" },
    { name: "Jersey", slug: "jersey", countryCode: "JE", flagEmoji: "🇯🇪" },
    { name: "Jordan", slug: "jordan", countryCode: "JO", flagEmoji: "🇯🇴" },
    { name: "Kazakhstan", slug: "kazakhstan", countryCode: "KZ", flagEmoji: "🇰🇿" },
    { name: "Kenya", slug: "kenya", countryCode: "KE", flagEmoji: "🇰🇪" },
    { name: "Kiribati", slug: "kiribati", countryCode: "KI", flagEmoji: "🇰🇮" },
    { name: "Korea (North)", slug: "north-korea", countryCode: "KP", flagEmoji: "🇰🇵" },
    { name: "Korea (South)", slug: "south-korea", countryCode: "KR", flagEmoji: "🇰🇷" },
    { name: "Kuwait", slug: "kuwait", countryCode: "KW", flagEmoji: "🇰🇼" },
    { name: "Kyrgyzstan", slug: "kyrgyzstan", countryCode: "KG", flagEmoji: "🇰🇬" },
    { name: "Lao People’s Democratic Republic", slug: "laos", countryCode: "LA", flagEmoji: "🇱🇦" },
    { name: "Latvia", slug: "latvia", countryCode: "LV", flagEmoji: "🇱🇻" },
    { name: "Lebanon", slug: "lebanon", countryCode: "LB", flagEmoji: "🇱🇧" },
    { name: "Lesotho", slug: "lesotho", countryCode: "LS", flagEmoji: "🇱🇸" },
    { name: "Liberia", slug: "liberia", countryCode: "LR", flagEmoji: "🇱🇷" },
    { name: "Libya", slug: "libya", countryCode: "LY", flagEmoji: "🇱🇾" },
    { name: "Liechtenstein", slug: "liechtenstein", countryCode: "LI", flagEmoji: "🇱🇮" },
    { name: "Lithuania", slug: "lithuania", countryCode: "LT", flagEmoji: "🇱🇹" },
    { name: "Luxembourg", slug: "luxembourg", countryCode: "LU", flagEmoji: "🇱🇺" },
    { name: "Macao", slug: "macao", countryCode: "MO", flagEmoji: "🇲🇴" },
    { name: "Madagascar", slug: "madagascar", countryCode: "MG", flagEmoji: "🇲🇬" },
    { name: "Malawi", slug: "malawi", countryCode: "MW", flagEmoji: "🇲🇼" },
    { name: "Malaysia", slug: "malaysia", countryCode: "MY", flagEmoji: "🇲🇾" },
    { name: "Maldives", slug: "maldives", countryCode: "MV", flagEmoji: "🇲🇻" },
    { name: "Mali", slug: "mali", countryCode: "ML", flagEmoji: "🇲🇱" },
    { name: "Malta", slug: "malta", countryCode: "MT", flagEmoji: "🇲🇹" },
    { name: "Marshall Islands", slug: "marshall-islands", countryCode: "MH", flagEmoji: "🇲🇭" },
    { name: "Martinique", slug: "martinique", countryCode: "MQ", flagEmoji: "🇲🇶" },
    { name: "Mauritania", slug: "mauritania", countryCode: "MR", flagEmoji: "🇲🇷" },
    { name: "Mauritius", slug: "mauritius", countryCode: "MU", flagEmoji: "🇲🇺" },
    { name: "Mayotte", slug: "mayotte", countryCode: "YT", flagEmoji: "🇾🇹" },
    { name: "Mexico", slug: "mexico", countryCode: "MX", flagEmoji: "🇲🇽" },
    { name: "Micronesia", slug: "micronesia", countryCode: "FM", flagEmoji: "🇫🇲" },
    { name: "Moldova", slug: "moldova", countryCode: "MD", flagEmoji: "🇲🇩" },
    { name: "Monaco", slug: "monaco", countryCode: "MC", flagEmoji: "🇲🇨" },
    { name: "Mongolia", slug: "mongolia", countryCode: "MN", flagEmoji: "🇲🇳" },
    { name: "Montenegro", slug: "montenegro", countryCode: "ME", flagEmoji: "🇲🇪" },
    { name: "Montserrat", slug: "montserrat", countryCode: "MS", flagEmoji: "🇲🇸" },
    { name: "Morocco", slug: "morocco", countryCode: "MA", flagEmoji: "🇲🇦" },
    { name: "Mozambique", slug: "mozambique", countryCode: "MZ", flagEmoji: "🇲🇿" },
    { name: "Myanmar", slug: "myanmar", countryCode: "MM", flagEmoji: "🇲🇲" },
    { name: "Namibia", slug: "namibia", countryCode: "NA", flagEmoji: "🇳🇦" },
    { name: "Nauru", slug: "nauru", countryCode: "NR", flagEmoji: "🇳🇷" },
    { name: "Nepal", slug: "nepal", countryCode: "NP", flagEmoji: "🇳🇵" },
    { name: "Netherlands", slug: "netherlands", countryCode: "NL", flagEmoji: "🇳🇱" },
    { name: "New Caledonia", slug: "new-caledonia", countryCode: "NC", flagEmoji: "🇳🇨" },
    { name: "New Zealand", slug: "new-zealand", countryCode: "NZ", flagEmoji: "🇳🇿" },
    { name: "Nicaragua", slug: "nicaragua", countryCode: "NI", flagEmoji: "🇳🇮" },
    { name: "Niger", slug: "niger", countryCode: "NE", flagEmoji: "🇳🇪" },
    { name: "Nigeria", slug: "nigeria", countryCode: "NG", flagEmoji: "🇳🇬" },
    { name: "Niue", slug: "niue", countryCode: "NU", flagEmoji: "🇳🇺" },
    { name: "Norfolk Island", slug: "norfolk-island", countryCode: "NF", flagEmoji: "🇳🇫" },
    { name: "North Macedonia", slug: "north-macedonia", countryCode: "MK", flagEmoji: "🇲🇰" },
    { name: "Northern Mariana Islands", slug: "northern-mariana-islands", countryCode: "MP", flagEmoji: "🇲🇵" },
    { name: "Norway", slug: "norway", countryCode: "NO", flagEmoji: "🇳🇴" },
    { name: "Oman", slug: "oman", countryCode: "OM", flagEmoji: "🇴🇲" },
    { name: "Pakistan", slug: "pakistan", countryCode: "PK", flagEmoji: "🇵🇰" },
    { name: "Palau", slug: "palau", countryCode: "PW", flagEmoji: "🇵🇼" },
    { name: "Palestine", slug: "palestine", countryCode: "PS", flagEmoji: "🇵🇸" },
    { name: "Panama", slug: "panama", countryCode: "PA", flagEmoji: "🇵🇦" },
    { name: "Papua New Guinea", slug: "papua-new-guinea", countryCode: "PG", flagEmoji: "🇵🇬" },
    { name: "Paraguay", slug: "paraguay", countryCode: "PY", flagEmoji: "🇵🇾" },
    { name: "Peru", slug: "peru", countryCode: "PE", flagEmoji: "🇵🇪" },
    { name: "Philippines", slug: "philippines", countryCode: "PH", flagEmoji: "🇵🇭" },
    { name: "Pitcairn", slug: "pitcairn", countryCode: "PN", flagEmoji: "🇵🇳" },
    { name: "Poland", slug: "poland", countryCode: "PL", flagEmoji: "🇵🇱" },
    { name: "Portugal", slug: "portugal", countryCode: "PT", flagEmoji: "🇵🇹" },
    { name: "Puerto Rico", slug: "puerto-rico", countryCode: "PR", flagEmoji: "🇵🇷" },
    { name: "Qatar", slug: "qatar", countryCode: "QA", flagEmoji: "🇶🇦" },
    { name: "Réunion", slug: "reunion", countryCode: "RE", flagEmoji: "🇷🇪" },
    { name: "Romania", slug: "romania", countryCode: "RO", flagEmoji: "🇷🇴" },
    { name: "Russian Federation", slug: "russia", countryCode: "RU", flagEmoji: "🇷🇺" },
    { name: "Rwanda", slug: "rwanda", countryCode: "RW", flagEmoji: "🇷🇼" },
    { name: "Saint Barthélemy", slug: "saint-barthelemy", countryCode: "BL", flagEmoji: "🇧🇱" },
    { name: "Saint Helena", slug: "saint-helena", countryCode: "SH", flagEmoji: "🇸🇭" },
    { name: "Saint Kitts and Nevis", slug: "saint-kitts-and-nevis", countryCode: "KN", flagEmoji: "🇰🇳" },
    { name: "Saint Lucia", slug: "saint-lucia", countryCode: "LC", flagEmoji: "🇱🇨" },
    { name: "Saint Martin", slug: "saint-martin", countryCode: "MF", flagEmoji: "🇲🇫" },
    { name: "Saint Pierre and Miquelon", slug: "saint-pierre-and-miquelon", countryCode: "PM", flagEmoji: "🇵🇲" },
    { name: "Saint Vincent and the Grenadines", slug: "saint-vincent-and-the-grenadines", countryCode: "VC", flagEmoji: "🇻🇨" },
    { name: "Samoa", slug: "samoa", countryCode: "WS", flagEmoji: "🇼🇸" },
    { name: "San Marino", slug: "san-marino", countryCode: "SM", flagEmoji: "🇸🇲" },
    { name: "Sao Tome and Principe", slug: "sao-tome-and-principe", countryCode: "ST", flagEmoji: "🇸🇹" },
    { name: "Saudi Arabia", slug: "saudi-arabia", countryCode: "SA", flagEmoji: "🇸🇦" },
    { name: "Senegal", slug: "senegal", countryCode: "SN", flagEmoji: "🇸🇳" },
    { name: "Serbia", slug: "serbia", countryCode: "RS", flagEmoji: "🇷🇸" },
    { name: "Seychelles", slug: "seychelles", countryCode: "SC", flagEmoji: "🇸🇨" },
    { name: "Sierra Leone", slug: "sierra-leone", countryCode: "SL", flagEmoji: "🇸🇱" },
    { name: "Singapore", slug: "singapore", countryCode: "SG", flagEmoji: "🇸🇬" },
    { name: "Sint Maarten", slug: "sint-maarten", countryCode: "SX", flagEmoji: "🇸🇽" },
    { name: "Slovakia", slug: "slovakia", countryCode: "SK", flagEmoji: "🇸🇰" },
    { name: "Slovenia", slug: "slovenia", countryCode: "SI", flagEmoji: "🇸🇮" },
    { name: "Solomon Islands", slug: "solomon-islands", countryCode: "SB", flagEmoji: "🇸🇧" },
    { name: "Somalia", slug: "somalia", countryCode: "SO", flagEmoji: "🇸🇴" },
    { name: "South Africa", slug: "south-africa", countryCode: "ZA", flagEmoji: "🇿🇦" },
    { name: "South Georgia and the South Sandwich Islands", slug: "south-georgia-and-the-south-sandwich-islands", countryCode: "GS", flagEmoji: "🇬🇸" },
    { name: "South Sudan", slug: "south-sudan", countryCode: "SS", flagEmoji: "🇸🇸" },
    { name: "Spain", slug: "spain", countryCode: "ES", flagEmoji: "🇪🇸" },
    { name: "Sri Lanka", slug: "sri-lanka", countryCode: "LK", flagEmoji: "🇱🇰" },
    { name: "Sudan", slug: "sudan", countryCode: "SD", flagEmoji: "🇸🇩" },
    { name: "Suriname", slug: "suriname", countryCode: "SR", flagEmoji: "🇸🇷" },
    { name: "Svalbard and Jan Mayen", slug: "svalbard-and-jan-mayen", countryCode: "SJ", flagEmoji: "🇸🇯" },
    { name: "Sweden", slug: "sweden", countryCode: "SE", flagEmoji: "🇸🇪" },
    { name: "Switzerland", slug: "switzerland", countryCode: "CH", flagEmoji: "🇨🇭" },
    { name: "Syrian Arab Republic", slug: "syria", countryCode: "SY", flagEmoji: "🇸🇾" },
    { name: "Taiwan", slug: "taiwan", countryCode: "TW", flagEmoji: "🇹🇼" },
    { name: "Tajikistan", slug: "tajikistan", countryCode: "TJ", flagEmoji: "🇹🇯" },
    { name: "Tanzania", slug: "tanzania", countryCode: "TZ", flagEmoji: "🇹🇿" },
    { name: "Thailand", slug: "thailand", countryCode: "TH", flagEmoji: "🇹🇭" },
    { name: "Timor-Leste", slug: "timor-leste", countryCode: "TL", flagEmoji: "🇹🇱" },
    { name: "Togo", slug: "togo", countryCode: "TG", flagEmoji: "🇹🇬" },
    { name: "Tokelau", slug: "tokelau", countryCode: "TK", flagEmoji: "🇹🇰" },
    { name: "Tonga", slug: "tonga", countryCode: "TO", flagEmoji: "🇹🇴" },
    { name: "Trinidad and Tobago", slug: "trinidad-and-tobago", countryCode: "TT", flagEmoji: "🇹🇹" },
    { name: "Tunisia", slug: "tunisia", countryCode: "TN", flagEmoji: "🇹🇳" },
    { name: "Turkey", slug: "turkey", countryCode: "TR", flagEmoji: "🇹🇷" },
    { name: "Turkmenistan", slug: "turkmenistan", countryCode: "TM", flagEmoji: "🇹🇲" },
    { name: "Turks and Caicos Islands", slug: "turks-and-caicos-islands", countryCode: "TC", flagEmoji: "🇹🇨" },
    { name: "Tuvalu", slug: "tuvalu", countryCode: "TV", flagEmoji: "🇹🇻" },
    { name: "Uganda", slug: "uganda", countryCode: "UG", flagEmoji: "🇺🇬" },
    { name: "Ukraine", slug: "ukraine", countryCode: "UA", flagEmoji: "🇺🇦" },
    { name: "United Arab Emirates", slug: "united-arab-emirates", countryCode: "AE", flagEmoji: "🇦🇪" },
    { name: "United Kingdom", slug: "united-kingdom", countryCode: "GB", flagEmoji: "🇬🇧" },
    { name: "United States", slug: "united-states", countryCode: "US", flagEmoji: "🇺🇸" },
    { name: "United States Minor Outlying Islands", slug: "united-states-minor-outlying-islands", countryCode: "UM", flagEmoji: "🇺🇲" },
    { name: "Uruguay", slug: "uruguay", countryCode: "UY", flagEmoji: "🇺🇾" },
    { name: "Uzbekistan", slug: "uzbekistan", countryCode: "UZ", flagEmoji: "🇺🇿" },
    { name: "Vanuatu", slug: "vanuatu", countryCode: "VU", flagEmoji: "🇻🇺" },
    { name: "Venezuela", slug: "venezuela", countryCode: "VE", flagEmoji: "🇻🇪" },
    { name: "Vietnam", slug: "vietnam", countryCode: "VN", flagEmoji: "🇻🇳" },
    { name: "Virgin Islands (British)", slug: "british-virgin-islands", countryCode: "VG", flagEmoji: "🇻🇬" },
    { name: "Virgin Islands (U.S.)", slug: "us-virgin-islands", countryCode: "VI", flagEmoji: "🇻🇮" },
    { name: "Wallis and Futuna", slug: "wallis-and-futuna", countryCode: "WF", flagEmoji: "🇼🇫" },
    { name: "Western Sahara", slug: "western-sahara", countryCode: "EH", flagEmoji: "🇪🇭" },
    { name: "Yemen", slug: "yemen", countryCode: "YE", flagEmoji: "🇾🇪" },
    { name: "Zambia", slug: "zambia", countryCode: "ZM", flagEmoji: "🇿🇲" },
    { name: "Zimbabwe", slug: "zimbabwe", countryCode: "ZW", flagEmoji: "🇿🇼" }
  ];


  for (const dest of destData) {
    const existing = await db.query.destinations.findFirst({
      where: eq(destinations.slug, dest.slug),
    });

    if (existing) {
      console.log(`⏩ Skipped (already exists): ${dest.name}`);
      continue;
    }

    await db.insert(destinations).values({
      ...dest,
      active: true,
    });

    console.log(`✓ Created destination: ${dest.name}`);
  }

  const regionData = [
    {
      name: "Africa",
      slug: "africa",
      countries: [
        "DZ", "AO", "BJ", "BW", "BF", "BI", "CM", "CV", "CF", "TD", "KM", "CG", "CD", "CI",
        "DJ", "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW", "KE", "LS", "LR",
        "LY", "MG", "MW", "ML", "MR", "MU", "YT", "MA", "MZ", "NA", "NE", "NG", "RE", "RW",
        "SH", "ST", "SN", "SC", "SL", "SO", "ZA", "SS", "SD", "TZ", "TG", "TN", "UG", "EH",
        "ZM", "ZW"
      ]
    },
    {
      name: "Asia",
      slug: "asia",
      countries: [
        "AF", "AM", "AZ", "BH", "BD", "BT", "BN", "KH", "CN", "CY", "GE", "HK", "IN", "ID",
        "IR", "IQ", "IL", "JP", "JO", "KZ", "KW", "KG", "LA", "LB", "MO", "MY", "MV", "MN",
        "MM", "NP", "KP", "OM", "PK", "PS", "PH", "QA", "SA", "SG", "KR", "LK", "SY", "TW",
        "TJ", "TH", "TL", "TR", "TM", "AE", "UZ", "VN", "YE"
      ]
    },
    {
      name: "Europe",
      slug: "europe",
      countries: [
        "AL", "AD", "AT", "BY", "BE", "BA", "BG", "HR", "CZ", "DK", "EE", "FO", "FI", "FR",
        "DE", "GI", "GR", "VA", "HU", "IS", "IE", "IM", "IT", "XK", "LV", "LI", "LT", "LU",
        "MT", "MD", "MC", "ME", "NL", "MK", "NO", "PL", "PT", "RO", "RU", "SM", "RS", "SK",
        "SI", "ES", "SE", "CH", "UA", "GB"
      ]
    },
    {
      name: "North America",
      slug: "north-america",
      countries: [
        "US", "CA", "MX", "GL", "BM", "PM"
      ]
    },
    {
      name: "Central America",
      slug: "central-america",
      countries: [
        "BZ", "CR", "SV", "GT", "HN", "NI", "PA"
      ]
    },
    {
      name: "South America",
      slug: "south-america",
      countries: [
        "AR", "BO", "BR", "CL", "CO", "EC", "FK", "GF", "GY", "PY", "PE", "SR", "UY", "VE"
      ]
    },
    {
      name: "Caribbean",
      slug: "caribbean",
      countries: [
        "AI", "AG", "AW", "BS", "BB", "BQ", "VG", "KY", "CU", "CW", "DM", "DO", "GD", "GP",
        "HT", "JM", "MQ", "MS", "PR", "BL", "KN", "LC", "MF", "VC", "SX", "TT", "TC", "VI"
      ]
    },
    {
      name: "Middle East",
      slug: "middle-east",
      countries: [
        "BH", "CY", "EG", "IR", "IQ", "IL", "JO", "KW", "LB", "OM", "PS", "QA", "SA", "SY",
        "TR", "AE", "YE"
      ]
    },
    {
      name: "Oceania",
      slug: "oceania",
      countries: [
        "AS", "AU", "CK", "FJ", "PF", "GU", "KI", "MH", "FM", "NR", "NC", "NZ", "NU", "MP",
        "PW", "PG", "WS", "SB", "TK", "TO", "TV", "VU", "WF"
      ]
    },
    {
      name: "Global",
      slug: "global",
      countries: [
        // All 249 ISO countries & territories
        "AF", "AX", "AL", "DZ", "AS", "AD", "AO", "AI", "AQ", "AG", "AR", "AM", "AW", "AU",
        "AT", "AZ", "BS", "BH", "BD", "BB", "BY", "BE", "BZ", "BJ", "BM", "BT", "BO", "BQ",
        "BA", "BW", "BV", "BR", "IO", "BN", "BG", "BF", "BI", "CV", "KH", "CM", "CA", "KY",
        "CF", "TD", "CL", "CN", "CX", "CC", "CO", "KM", "CD", "CG", "CK", "CR", "HR", "CU",
        "CW", "CY", "CZ", "DK", "DJ", "DM", "DO", "EC", "EG", "SV", "GQ", "ER", "EE", "SZ",
        "ET", "FK", "FO", "FJ", "FI", "FR", "GF", "PF", "TF", "GA", "GM", "GE", "DE", "GH",
        "GI", "GR", "GL", "GD", "GP", "GU", "GT", "GG", "GN", "GW", "GY", "HT", "HM", "VA",
        "HN", "HK", "HU", "IS", "IN", "ID", "IR", "IQ", "IE", "IM", "IL", "IT", "JM", "JP",
        "JE", "JO", "KZ", "KE", "KI", "KP", "KR", "KW", "KG", "LA", "LV", "LB", "LS", "LR",
        "LY", "LI", "LT", "LU", "MO", "MG", "MW", "MY", "MV", "ML", "MT", "MH", "MQ", "MR",
        "MU", "YT", "MX", "FM", "MD", "MC", "MN", "ME", "MS", "MA", "MZ", "MM", "NA", "NR",
        "NP", "NL", "NC", "NZ", "NI", "NE", "NG", "NU", "NF", "MK", "MP", "NO", "OM", "PK",
        "PW", "PS", "PA", "PG", "PY", "PE", "PH", "PN", "PL", "PT", "PR", "QA", "RE", "RO",
        "RU", "RW", "BL", "SH", "KN", "LC", "MF", "PM", "VC", "WS", "SM", "ST", "SA", "SN",
        "RS", "SC", "SL", "SG", "SX", "SK", "SI", "SB", "SO", "ZA", "GS", "SS", "ES", "LK",
        "SD", "SR", "SJ", "SE", "CH", "SY", "TW", "TJ", "TZ", "TH", "TL", "TG", "TK", "TO",
        "TT", "TN", "TR", "TM", "TC", "TV", "UG", "UA", "AE", "GB", "US", "UM", "UY", "UZ",
        "VU", "VE", "VN", "VG", "VI", "WF", "EH", "YE", "ZM", "ZW"
      ]
    }
  ];

  for (const region of regionData) {
    const existing = await db.query.regions.findFirst({
      where: eq(regions.slug, region.slug),
    });

    if (existing) {
      console.log(`⏩ Skipped (already exists): ${region.name}`);
      continue;
    }

    await db.insert(regions).values({
      name: region.name,
      slug: region.slug,
      countries: region.countries,
      active: true,
    });

    console.log(`✓ Created region: ${region.name}`);
  }

  // Seed settings
  const settingsData = [
    { key: "site_name", value: "eSIM Global", category: "general" },
    { key: "site_description", value: "Affordable eSIM data for international travel", category: "seo" },
    { key: "timezone", value: "UTC", category: "general" },
  ];

  for (const setting of settingsData) {
    const existing = await db.query.settings.findFirst({
      where: eq(settings.key, setting.key),
    });

    if (existing) {
      console.log(`⏩ Skipped setting (already exists): ${setting.key}`);
      continue;
    }

    await db.insert(settings).values(setting);
    console.log(`✓ Created setting: ${setting.key}`);
  }

  console.log("✨ Seeding completed successfully!");
}

seed()
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
