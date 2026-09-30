/** Setting key-value pairs stored in the SETTINGS sheet */
export interface Setting {
  key: string;
  value: string;
  description: string;
  updated_at: string; // ISO 8601
}

/** Well-known setting keys */
export type SettingKey =
  | "company_name"
  | "company_address"
  | "company_phone"
  | "company_email"
  | "tax_percentage"
  | "currency_locale"
  | "trip_number_sequence"; // stores the last used NNNN number for trip_no generation
