export type CalendarProvider = GoogleCalendar | OutlookCalendar;

export interface GoogleCalendar {
  provider: "google";
  accessToken: string;
  refreshToken: string;
}

export interface OutlookCalendar {
  provider: "outlook";
  accessToken: string;
  refreshToken: string;
}

export type CalendarConnectionStatus = "connected" | "disconnected";

export interface CalendarConnection {
  provider: CalendarProvider;
  status: CalendarConnectionStatus;
  lastSyncAt: string | null;
}

export interface MeetingAttendee {
  name: string;
  email: string;
  linkedinUrl: string | null;
  role: string | null;
  company: string | null;
  enriched: boolean;
}

export interface Meeting {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  description: string | null;
  attendees: MeetingAttendee[];
}

export interface MeetingIntelligence {
  meetingId: string;
  attendeeSummaries: AttendeeSummary[];
  relevantNews: string[];
  suggestedTalkingPoints: string[];
  generatedAt: string;
}

export interface AttendeeSummary {
  name: string;
  role: string | null;
  company: string | null;
  recentActivity: string[];
  topicsTheyCareAbout: string[];
}

export interface CalendarData {
  connection: CalendarConnection | null;
  upcomingMeetings: Meeting[];
  meetingIntelligence: MeetingIntelligence[];
}
