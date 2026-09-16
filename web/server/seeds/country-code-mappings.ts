/**
 * Country Code Mappings Seed Data
 * Maps ISO 3166-1 alpha-3 (3-letter) codes to alpha-2 (2-letter) codes
 * Used by providers like Maya that send 3-letter country codes
 */

import { db } from "../db";
import { countryCodeMappings } from "@shared/schema";

interface CountryMapping {
  externalCode: string;
  internalCode: string;
  countryName: string;
  codeType: string;
}

const ISO3_TO_ISO2_MAPPINGS: CountryMapping[] = [
  { externalCode: "ABW", internalCode: "AW", countryName: "Aruba", codeType: "iso3" },
  { externalCode: "AFG", internalCode: "AF", countryName: "Afghanistan", codeType: "iso3" },
  { externalCode: "AGO", internalCode: "AO", countryName: "Angola", codeType: "iso3" },
  { externalCode: "AIA", internalCode: "AI", countryName: "Anguilla", codeType: "iso3" },
  { externalCode: "ALA", internalCode: "AX", countryName: "Aland Islands", codeType: "iso3" },
  { externalCode: "ALB", internalCode: "AL", countryName: "Albania", codeType: "iso3" },
  { externalCode: "AND", internalCode: "AD", countryName: "Andorra", codeType: "iso3" },
  { externalCode: "ANT", internalCode: "AN", countryName: "Netherlands Antilles", codeType: "iso3" },
  { externalCode: "ARE", internalCode: "AE", countryName: "United Arab Emirates", codeType: "iso3" },
  { externalCode: "ARG", internalCode: "AR", countryName: "Argentina", codeType: "iso3" },
  { externalCode: "ARM", internalCode: "AM", countryName: "Armenia", codeType: "iso3" },
  { externalCode: "ASM", internalCode: "AS", countryName: "American Samoa", codeType: "iso3" },
  { externalCode: "ATA", internalCode: "AQ", countryName: "Antarctica", codeType: "iso3" },
  { externalCode: "ATF", internalCode: "TF", countryName: "French Southern Territories", codeType: "iso3" },
  { externalCode: "ATG", internalCode: "AG", countryName: "Antigua and Barbuda", codeType: "iso3" },
  { externalCode: "AUS", internalCode: "AU", countryName: "Australia", codeType: "iso3" },
  { externalCode: "AUT", internalCode: "AT", countryName: "Austria", codeType: "iso3" },
  { externalCode: "AZE", internalCode: "AZ", countryName: "Azerbaijan", codeType: "iso3" },
  { externalCode: "BDI", internalCode: "BI", countryName: "Burundi", codeType: "iso3" },
  { externalCode: "BEL", internalCode: "BE", countryName: "Belgium", codeType: "iso3" },
  { externalCode: "BEN", internalCode: "BJ", countryName: "Benin", codeType: "iso3" },
  { externalCode: "BES", internalCode: "BQ", countryName: "Bonaire, Sint Eustatius and Saba", codeType: "iso3" },
  { externalCode: "BFA", internalCode: "BF", countryName: "Burkina Faso", codeType: "iso3" },
  { externalCode: "BGD", internalCode: "BD", countryName: "Bangladesh", codeType: "iso3" },
  { externalCode: "BGR", internalCode: "BG", countryName: "Bulgaria", codeType: "iso3" },
  { externalCode: "BHR", internalCode: "BH", countryName: "Bahrain", codeType: "iso3" },
  { externalCode: "BHS", internalCode: "BS", countryName: "Bahamas", codeType: "iso3" },
  { externalCode: "BIH", internalCode: "BA", countryName: "Bosnia and Herzegovina", codeType: "iso3" },
  { externalCode: "BLM", internalCode: "BL", countryName: "Saint Barthelemy", codeType: "iso3" },
  { externalCode: "BLR", internalCode: "BY", countryName: "Belarus", codeType: "iso3" },
  { externalCode: "BLZ", internalCode: "BZ", countryName: "Belize", codeType: "iso3" },
  { externalCode: "BMU", internalCode: "BM", countryName: "Bermuda", codeType: "iso3" },
  { externalCode: "BOL", internalCode: "BO", countryName: "Bolivia", codeType: "iso3" },
  { externalCode: "BRA", internalCode: "BR", countryName: "Brazil", codeType: "iso3" },
  { externalCode: "BRB", internalCode: "BB", countryName: "Barbados", codeType: "iso3" },
  { externalCode: "BRN", internalCode: "BN", countryName: "Brunei Darussalam", codeType: "iso3" },
  { externalCode: "BTN", internalCode: "BT", countryName: "Bhutan", codeType: "iso3" },
  { externalCode: "BVT", internalCode: "BV", countryName: "Bouvet Island", codeType: "iso3" },
  { externalCode: "BWA", internalCode: "BW", countryName: "Botswana", codeType: "iso3" },
  { externalCode: "CAF", internalCode: "CF", countryName: "Central African Republic", codeType: "iso3" },
  { externalCode: "CAN", internalCode: "CA", countryName: "Canada", codeType: "iso3" },
  { externalCode: "CCK", internalCode: "CC", countryName: "Cocos (Keeling) Islands", codeType: "iso3" },
  { externalCode: "CHE", internalCode: "CH", countryName: "Switzerland", codeType: "iso3" },
  { externalCode: "CHL", internalCode: "CL", countryName: "Chile", codeType: "iso3" },
  { externalCode: "CHN", internalCode: "CN", countryName: "China", codeType: "iso3" },
  { externalCode: "CIV", internalCode: "CI", countryName: "Cote d'Ivoire", codeType: "iso3" },
  { externalCode: "CMR", internalCode: "CM", countryName: "Cameroon", codeType: "iso3" },
  { externalCode: "COD", internalCode: "CD", countryName: "Democratic Republic of the Congo", codeType: "iso3" },
  { externalCode: "COG", internalCode: "CG", countryName: "Congo", codeType: "iso3" },
  { externalCode: "COK", internalCode: "CK", countryName: "Cook Islands", codeType: "iso3" },
  { externalCode: "COL", internalCode: "CO", countryName: "Colombia", codeType: "iso3" },
  { externalCode: "COM", internalCode: "KM", countryName: "Comoros", codeType: "iso3" },
  { externalCode: "CPV", internalCode: "CV", countryName: "Cape Verde", codeType: "iso3" },
  { externalCode: "CRI", internalCode: "CR", countryName: "Costa Rica", codeType: "iso3" },
  { externalCode: "CUB", internalCode: "CU", countryName: "Cuba", codeType: "iso3" },
  { externalCode: "CUW", internalCode: "CW", countryName: "Curacao", codeType: "iso3" },
  { externalCode: "CXR", internalCode: "CX", countryName: "Christmas Island", codeType: "iso3" },
  { externalCode: "CYM", internalCode: "KY", countryName: "Cayman Islands", codeType: "iso3" },
  { externalCode: "CYP", internalCode: "CY", countryName: "Cyprus", codeType: "iso3" },
  { externalCode: "CZE", internalCode: "CZ", countryName: "Czech Republic", codeType: "iso3" },
  { externalCode: "DEU", internalCode: "DE", countryName: "Germany", codeType: "iso3" },
  { externalCode: "DJI", internalCode: "DJ", countryName: "Djibouti", codeType: "iso3" },
  { externalCode: "DMA", internalCode: "DM", countryName: "Dominica", codeType: "iso3" },
  { externalCode: "DNK", internalCode: "DK", countryName: "Denmark", codeType: "iso3" },
  { externalCode: "DOM", internalCode: "DO", countryName: "Dominican Republic", codeType: "iso3" },
  { externalCode: "DZA", internalCode: "DZ", countryName: "Algeria", codeType: "iso3" },
  { externalCode: "ECU", internalCode: "EC", countryName: "Ecuador", codeType: "iso3" },
  { externalCode: "EGY", internalCode: "EG", countryName: "Egypt", codeType: "iso3" },
  { externalCode: "ERI", internalCode: "ER", countryName: "Eritrea", codeType: "iso3" },
  { externalCode: "ESH", internalCode: "EH", countryName: "Western Sahara", codeType: "iso3" },
  { externalCode: "ESP", internalCode: "ES", countryName: "Spain", codeType: "iso3" },
  { externalCode: "EST", internalCode: "EE", countryName: "Estonia", codeType: "iso3" },
  { externalCode: "ETH", internalCode: "ET", countryName: "Ethiopia", codeType: "iso3" },
  { externalCode: "FIN", internalCode: "FI", countryName: "Finland", codeType: "iso3" },
  { externalCode: "FJI", internalCode: "FJ", countryName: "Fiji", codeType: "iso3" },
  { externalCode: "FLK", internalCode: "FK", countryName: "Falkland Islands", codeType: "iso3" },
  { externalCode: "FRA", internalCode: "FR", countryName: "France", codeType: "iso3" },
  { externalCode: "FRO", internalCode: "FO", countryName: "Faroe Islands", codeType: "iso3" },
  { externalCode: "FSM", internalCode: "FM", countryName: "Micronesia", codeType: "iso3" },
  { externalCode: "GAB", internalCode: "GA", countryName: "Gabon", codeType: "iso3" },
  { externalCode: "GBR", internalCode: "GB", countryName: "United Kingdom", codeType: "iso3" },
  { externalCode: "GEO", internalCode: "GE", countryName: "Georgia", codeType: "iso3" },
  { externalCode: "GGY", internalCode: "GG", countryName: "Guernsey", codeType: "iso3" },
  { externalCode: "GHA", internalCode: "GH", countryName: "Ghana", codeType: "iso3" },
  { externalCode: "GIB", internalCode: "GI", countryName: "Gibraltar", codeType: "iso3" },
  { externalCode: "GIN", internalCode: "GN", countryName: "Guinea", codeType: "iso3" },
  { externalCode: "GLP", internalCode: "GP", countryName: "Guadeloupe", codeType: "iso3" },
  { externalCode: "GMB", internalCode: "GM", countryName: "Gambia", codeType: "iso3" },
  { externalCode: "GNB", internalCode: "GW", countryName: "Guinea-Bissau", codeType: "iso3" },
  { externalCode: "GNQ", internalCode: "GQ", countryName: "Equatorial Guinea", codeType: "iso3" },
  { externalCode: "GRC", internalCode: "GR", countryName: "Greece", codeType: "iso3" },
  { externalCode: "GRD", internalCode: "GD", countryName: "Grenada", codeType: "iso3" },
  { externalCode: "GRL", internalCode: "GL", countryName: "Greenland", codeType: "iso3" },
  { externalCode: "GTM", internalCode: "GT", countryName: "Guatemala", codeType: "iso3" },
  { externalCode: "GUF", internalCode: "GF", countryName: "French Guiana", codeType: "iso3" },
  { externalCode: "GUM", internalCode: "GU", countryName: "Guam", codeType: "iso3" },
  { externalCode: "GUY", internalCode: "GY", countryName: "Guyana", codeType: "iso3" },
  { externalCode: "HKG", internalCode: "HK", countryName: "Hong Kong", codeType: "iso3" },
  { externalCode: "HMD", internalCode: "HM", countryName: "Heard Island and McDonald Islands", codeType: "iso3" },
  { externalCode: "HND", internalCode: "HN", countryName: "Honduras", codeType: "iso3" },
  { externalCode: "HRV", internalCode: "HR", countryName: "Croatia", codeType: "iso3" },
  { externalCode: "HTI", internalCode: "HT", countryName: "Haiti", codeType: "iso3" },
  { externalCode: "HUN", internalCode: "HU", countryName: "Hungary", codeType: "iso3" },
  { externalCode: "IDN", internalCode: "ID", countryName: "Indonesia", codeType: "iso3" },
  { externalCode: "IMN", internalCode: "IM", countryName: "Isle of Man", codeType: "iso3" },
  { externalCode: "IND", internalCode: "IN", countryName: "India", codeType: "iso3" },
  { externalCode: "IOT", internalCode: "IO", countryName: "British Indian Ocean Territory", codeType: "iso3" },
  { externalCode: "IRL", internalCode: "IE", countryName: "Ireland", codeType: "iso3" },
  { externalCode: "IRN", internalCode: "IR", countryName: "Iran", codeType: "iso3" },
  { externalCode: "IRQ", internalCode: "IQ", countryName: "Iraq", codeType: "iso3" },
  { externalCode: "ISL", internalCode: "IS", countryName: "Iceland", codeType: "iso3" },
  { externalCode: "ISR", internalCode: "IL", countryName: "Israel", codeType: "iso3" },
  { externalCode: "ITA", internalCode: "IT", countryName: "Italy", codeType: "iso3" },
  { externalCode: "JAM", internalCode: "JM", countryName: "Jamaica", codeType: "iso3" },
  { externalCode: "JEY", internalCode: "JE", countryName: "Jersey", codeType: "iso3" },
  { externalCode: "JOR", internalCode: "JO", countryName: "Jordan", codeType: "iso3" },
  { externalCode: "JPN", internalCode: "JP", countryName: "Japan", codeType: "iso3" },
  { externalCode: "KAZ", internalCode: "KZ", countryName: "Kazakhstan", codeType: "iso3" },
  { externalCode: "KEN", internalCode: "KE", countryName: "Kenya", codeType: "iso3" },
  { externalCode: "KGZ", internalCode: "KG", countryName: "Kyrgyzstan", codeType: "iso3" },
  { externalCode: "KHM", internalCode: "KH", countryName: "Cambodia", codeType: "iso3" },
  { externalCode: "KIR", internalCode: "KI", countryName: "Kiribati", codeType: "iso3" },
  { externalCode: "KNA", internalCode: "KN", countryName: "Saint Kitts and Nevis", codeType: "iso3" },
  { externalCode: "KOR", internalCode: "KR", countryName: "South Korea", codeType: "iso3" },
  { externalCode: "KWT", internalCode: "KW", countryName: "Kuwait", codeType: "iso3" },
  { externalCode: "LAO", internalCode: "LA", countryName: "Laos", codeType: "iso3" },
  { externalCode: "LBN", internalCode: "LB", countryName: "Lebanon", codeType: "iso3" },
  { externalCode: "LBR", internalCode: "LR", countryName: "Liberia", codeType: "iso3" },
  { externalCode: "LBY", internalCode: "LY", countryName: "Libya", codeType: "iso3" },
  { externalCode: "LCA", internalCode: "LC", countryName: "Saint Lucia", codeType: "iso3" },
  { externalCode: "LIE", internalCode: "LI", countryName: "Liechtenstein", codeType: "iso3" },
  { externalCode: "LKA", internalCode: "LK", countryName: "Sri Lanka", codeType: "iso3" },
  { externalCode: "LSO", internalCode: "LS", countryName: "Lesotho", codeType: "iso3" },
  { externalCode: "LTU", internalCode: "LT", countryName: "Lithuania", codeType: "iso3" },
  { externalCode: "LUX", internalCode: "LU", countryName: "Luxembourg", codeType: "iso3" },
  { externalCode: "LVA", internalCode: "LV", countryName: "Latvia", codeType: "iso3" },
  { externalCode: "MAC", internalCode: "MO", countryName: "Macao", codeType: "iso3" },
  { externalCode: "MAF", internalCode: "MF", countryName: "Saint Martin (French)", codeType: "iso3" },
  { externalCode: "MAR", internalCode: "MA", countryName: "Morocco", codeType: "iso3" },
  { externalCode: "MCO", internalCode: "MC", countryName: "Monaco", codeType: "iso3" },
  { externalCode: "MDA", internalCode: "MD", countryName: "Moldova", codeType: "iso3" },
  { externalCode: "MDG", internalCode: "MG", countryName: "Madagascar", codeType: "iso3" },
  { externalCode: "MDV", internalCode: "MV", countryName: "Maldives", codeType: "iso3" },
  { externalCode: "MEX", internalCode: "MX", countryName: "Mexico", codeType: "iso3" },
  { externalCode: "MHL", internalCode: "MH", countryName: "Marshall Islands", codeType: "iso3" },
  { externalCode: "MKD", internalCode: "MK", countryName: "North Macedonia", codeType: "iso3" },
  { externalCode: "MLI", internalCode: "ML", countryName: "Mali", codeType: "iso3" },
  { externalCode: "MLT", internalCode: "MT", countryName: "Malta", codeType: "iso3" },
  { externalCode: "MMR", internalCode: "MM", countryName: "Myanmar", codeType: "iso3" },
  { externalCode: "MNE", internalCode: "ME", countryName: "Montenegro", codeType: "iso3" },
  { externalCode: "MNG", internalCode: "MN", countryName: "Mongolia", codeType: "iso3" },
  { externalCode: "MNP", internalCode: "MP", countryName: "Northern Mariana Islands", codeType: "iso3" },
  { externalCode: "MOZ", internalCode: "MZ", countryName: "Mozambique", codeType: "iso3" },
  { externalCode: "MRT", internalCode: "MR", countryName: "Mauritania", codeType: "iso3" },
  { externalCode: "MSR", internalCode: "MS", countryName: "Montserrat", codeType: "iso3" },
  { externalCode: "MTQ", internalCode: "MQ", countryName: "Martinique", codeType: "iso3" },
  { externalCode: "MUS", internalCode: "MU", countryName: "Mauritius", codeType: "iso3" },
  { externalCode: "MWI", internalCode: "MW", countryName: "Malawi", codeType: "iso3" },
  { externalCode: "MYS", internalCode: "MY", countryName: "Malaysia", codeType: "iso3" },
  { externalCode: "MYT", internalCode: "YT", countryName: "Mayotte", codeType: "iso3" },
  { externalCode: "NAM", internalCode: "NA", countryName: "Namibia", codeType: "iso3" },
  { externalCode: "NCL", internalCode: "NC", countryName: "New Caledonia", codeType: "iso3" },
  { externalCode: "NER", internalCode: "NE", countryName: "Niger", codeType: "iso3" },
  { externalCode: "NFK", internalCode: "NF", countryName: "Norfolk Island", codeType: "iso3" },
  { externalCode: "NGA", internalCode: "NG", countryName: "Nigeria", codeType: "iso3" },
  { externalCode: "NIC", internalCode: "NI", countryName: "Nicaragua", codeType: "iso3" },
  { externalCode: "NIU", internalCode: "NU", countryName: "Niue", codeType: "iso3" },
  { externalCode: "NLD", internalCode: "NL", countryName: "Netherlands", codeType: "iso3" },
  { externalCode: "NOR", internalCode: "NO", countryName: "Norway", codeType: "iso3" },
  { externalCode: "NPL", internalCode: "NP", countryName: "Nepal", codeType: "iso3" },
  { externalCode: "NRU", internalCode: "NR", countryName: "Nauru", codeType: "iso3" },
  { externalCode: "NZL", internalCode: "NZ", countryName: "New Zealand", codeType: "iso3" },
  { externalCode: "OMN", internalCode: "OM", countryName: "Oman", codeType: "iso3" },
  { externalCode: "PAK", internalCode: "PK", countryName: "Pakistan", codeType: "iso3" },
  { externalCode: "PAN", internalCode: "PA", countryName: "Panama", codeType: "iso3" },
  { externalCode: "PCN", internalCode: "PN", countryName: "Pitcairn", codeType: "iso3" },
  { externalCode: "PER", internalCode: "PE", countryName: "Peru", codeType: "iso3" },
  { externalCode: "PHL", internalCode: "PH", countryName: "Philippines", codeType: "iso3" },
  { externalCode: "PLW", internalCode: "PW", countryName: "Palau", codeType: "iso3" },
  { externalCode: "PNG", internalCode: "PG", countryName: "Papua New Guinea", codeType: "iso3" },
  { externalCode: "POL", internalCode: "PL", countryName: "Poland", codeType: "iso3" },
  { externalCode: "PRI", internalCode: "PR", countryName: "Puerto Rico", codeType: "iso3" },
  { externalCode: "PRK", internalCode: "KP", countryName: "North Korea", codeType: "iso3" },
  { externalCode: "PRT", internalCode: "PT", countryName: "Portugal", codeType: "iso3" },
  { externalCode: "PRY", internalCode: "PY", countryName: "Paraguay", codeType: "iso3" },
  { externalCode: "PSE", internalCode: "PS", countryName: "Palestine", codeType: "iso3" },
  { externalCode: "PYF", internalCode: "PF", countryName: "French Polynesia", codeType: "iso3" },
  { externalCode: "QAT", internalCode: "QA", countryName: "Qatar", codeType: "iso3" },
  { externalCode: "REU", internalCode: "RE", countryName: "Reunion", codeType: "iso3" },
  { externalCode: "ROU", internalCode: "RO", countryName: "Romania", codeType: "iso3" },
  { externalCode: "RUS", internalCode: "RU", countryName: "Russia", codeType: "iso3" },
  { externalCode: "RWA", internalCode: "RW", countryName: "Rwanda", codeType: "iso3" },
  { externalCode: "SAU", internalCode: "SA", countryName: "Saudi Arabia", codeType: "iso3" },
  { externalCode: "SDN", internalCode: "SD", countryName: "Sudan", codeType: "iso3" },
  { externalCode: "SEN", internalCode: "SN", countryName: "Senegal", codeType: "iso3" },
  { externalCode: "SGP", internalCode: "SG", countryName: "Singapore", codeType: "iso3" },
  { externalCode: "SGS", internalCode: "GS", countryName: "South Georgia", codeType: "iso3" },
  { externalCode: "SHN", internalCode: "SH", countryName: "Saint Helena", codeType: "iso3" },
  { externalCode: "SJM", internalCode: "SJ", countryName: "Svalbard and Jan Mayen", codeType: "iso3" },
  { externalCode: "SLB", internalCode: "SB", countryName: "Solomon Islands", codeType: "iso3" },
  { externalCode: "SLE", internalCode: "SL", countryName: "Sierra Leone", codeType: "iso3" },
  { externalCode: "SLV", internalCode: "SV", countryName: "El Salvador", codeType: "iso3" },
  { externalCode: "SMR", internalCode: "SM", countryName: "San Marino", codeType: "iso3" },
  { externalCode: "SOM", internalCode: "SO", countryName: "Somalia", codeType: "iso3" },
  { externalCode: "SPM", internalCode: "PM", countryName: "Saint Pierre and Miquelon", codeType: "iso3" },
  { externalCode: "SRB", internalCode: "RS", countryName: "Serbia", codeType: "iso3" },
  { externalCode: "SSD", internalCode: "SS", countryName: "South Sudan", codeType: "iso3" },
  { externalCode: "STP", internalCode: "ST", countryName: "Sao Tome and Principe", codeType: "iso3" },
  { externalCode: "SUR", internalCode: "SR", countryName: "Suriname", codeType: "iso3" },
  { externalCode: "SVK", internalCode: "SK", countryName: "Slovakia", codeType: "iso3" },
  { externalCode: "SVN", internalCode: "SI", countryName: "Slovenia", codeType: "iso3" },
  { externalCode: "SWE", internalCode: "SE", countryName: "Sweden", codeType: "iso3" },
  { externalCode: "SWZ", internalCode: "SZ", countryName: "Eswatini", codeType: "iso3" },
  { externalCode: "SXM", internalCode: "SX", countryName: "Sint Maarten (Dutch)", codeType: "iso3" },
  { externalCode: "SYC", internalCode: "SC", countryName: "Seychelles", codeType: "iso3" },
  { externalCode: "SYR", internalCode: "SY", countryName: "Syria", codeType: "iso3" },
  { externalCode: "TCA", internalCode: "TC", countryName: "Turks and Caicos Islands", codeType: "iso3" },
  { externalCode: "TCD", internalCode: "TD", countryName: "Chad", codeType: "iso3" },
  { externalCode: "TGO", internalCode: "TG", countryName: "Togo", codeType: "iso3" },
  { externalCode: "THA", internalCode: "TH", countryName: "Thailand", codeType: "iso3" },
  { externalCode: "TJK", internalCode: "TJ", countryName: "Tajikistan", codeType: "iso3" },
  { externalCode: "TKL", internalCode: "TK", countryName: "Tokelau", codeType: "iso3" },
  { externalCode: "TKM", internalCode: "TM", countryName: "Turkmenistan", codeType: "iso3" },
  { externalCode: "TLS", internalCode: "TL", countryName: "Timor-Leste", codeType: "iso3" },
  { externalCode: "TON", internalCode: "TO", countryName: "Tonga", codeType: "iso3" },
  { externalCode: "TTO", internalCode: "TT", countryName: "Trinidad and Tobago", codeType: "iso3" },
  { externalCode: "TUN", internalCode: "TN", countryName: "Tunisia", codeType: "iso3" },
  { externalCode: "TUR", internalCode: "TR", countryName: "Turkey", codeType: "iso3" },
  { externalCode: "TUV", internalCode: "TV", countryName: "Tuvalu", codeType: "iso3" },
  { externalCode: "TWN", internalCode: "TW", countryName: "Taiwan", codeType: "iso3" },
  { externalCode: "TZA", internalCode: "TZ", countryName: "Tanzania", codeType: "iso3" },
  { externalCode: "UGA", internalCode: "UG", countryName: "Uganda", codeType: "iso3" },
  { externalCode: "UKR", internalCode: "UA", countryName: "Ukraine", codeType: "iso3" },
  { externalCode: "UMI", internalCode: "UM", countryName: "United States Minor Outlying Islands", codeType: "iso3" },
  { externalCode: "URY", internalCode: "UY", countryName: "Uruguay", codeType: "iso3" },
  { externalCode: "USA", internalCode: "US", countryName: "United States", codeType: "iso3" },
  { externalCode: "UZB", internalCode: "UZ", countryName: "Uzbekistan", codeType: "iso3" },
  { externalCode: "VAT", internalCode: "VA", countryName: "Vatican City", codeType: "iso3" },
  { externalCode: "VCT", internalCode: "VC", countryName: "Saint Vincent and the Grenadines", codeType: "iso3" },
  { externalCode: "VEN", internalCode: "VE", countryName: "Venezuela", codeType: "iso3" },
  { externalCode: "VGB", internalCode: "VG", countryName: "British Virgin Islands", codeType: "iso3" },
  { externalCode: "VIR", internalCode: "VI", countryName: "U.S. Virgin Islands", codeType: "iso3" },
  { externalCode: "VNM", internalCode: "VN", countryName: "Vietnam", codeType: "iso3" },
  { externalCode: "VUT", internalCode: "VU", countryName: "Vanuatu", codeType: "iso3" },
  { externalCode: "WLF", internalCode: "WF", countryName: "Wallis and Futuna", codeType: "iso3" },
  { externalCode: "WSM", internalCode: "WS", countryName: "Samoa", codeType: "iso3" },
  { externalCode: "XKX", internalCode: "XK", countryName: "Kosovo", codeType: "iso3" },
  { externalCode: "YEM", internalCode: "YE", countryName: "Yemen", codeType: "iso3" },
  { externalCode: "ZAF", internalCode: "ZA", countryName: "South Africa", codeType: "iso3" },
  { externalCode: "ZMB", internalCode: "ZM", countryName: "Zambia", codeType: "iso3" },
  { externalCode: "ZWE", internalCode: "ZW", countryName: "Zimbabwe", codeType: "iso3" },
];

/**
 * Seed country code mappings to database
 */
export async function seedCountryCodeMappings(): Promise<void> {
  console.log("Seeding country code mappings...");
  
  let insertedCount = 0;
  let skippedCount = 0;
  
  for (const mapping of ISO3_TO_ISO2_MAPPINGS) {
    try {
      await db.insert(countryCodeMappings).values(mapping).onConflictDoNothing();
      insertedCount++;
    } catch (error) {
      skippedCount++;
    }
  }
  
  console.log(`Country code mappings seeded: ${insertedCount} inserted, ${skippedCount} skipped`);
}

/**
 * Lookup function to get internal 2-letter code from any external code
 */
export async function lookupCountryCode(externalCode: string): Promise<{
  internalCode: string;
  countryName: string;
} | null> {
  const code = externalCode.toUpperCase();
  
  const result = await db.query.countryCodeMappings.findFirst({
    where: (mappings, { eq }) => eq(mappings.externalCode, code),
  });
  
  if (result) {
    return {
      internalCode: result.internalCode,
      countryName: result.countryName,
    };
  }
  
  return null;
}

/**
 * Get mapping by internal code (reverse lookup)
 */
export async function getCountryByInternalCode(internalCode: string): Promise<{
  externalCode: string;
  countryName: string;
} | null> {
  const code = internalCode.toUpperCase();
  
  const result = await db.query.countryCodeMappings.findFirst({
    where: (mappings, { eq }) => eq(mappings.internalCode, code),
  });
  
  if (result) {
    return {
      externalCode: result.externalCode,
      countryName: result.countryName,
    };
  }
  
  return null;
}
