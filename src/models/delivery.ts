export type DeliveryChannel =
  | EmailChannel
  | SlackChannel
  | SmsChannel
  | WhatsAppChannel;

export interface EmailChannel {
  type: "email";
  address: string;
}

export interface SlackChannel {
  type: "slack";
  workspace: string;
  channel: string;
}

export interface SmsChannel {
  type: "sms";
  phoneNumber: string;
}

export interface WhatsAppChannel {
  type: "whatsapp";
  phoneNumber: string;
}

export type BriefingFormat = "concise" | "standard" | "detailed";

export interface DeliveryPreferences {
  channel: DeliveryChannel;
  preferredTime: string;
  timezone: string;
  format: BriefingFormat;
}
