export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  color: string;
  createdAt: string;
}

export interface NewCalendarEventInput {
  title: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  color: string;
}
