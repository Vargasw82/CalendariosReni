export type Tutor = 'mama' | 'papa';

export type TransitionType = 'school' | 'home_delivery' | 'goes_home' | 'other' | null;

export interface DayAssignment {
  date: Date;
  dayOfMonth: number;
  dayOfWeek: number;
  dayName: string;
  tutor: Tutor;
  lupitaStatus: 'ON' | 'OFF' | 'ARRIVES' | 'LEAVES';
  isWeekend: boolean;
  comments: string[];
  userNotes: string;
  isPayDay: boolean;
  whoPays?: Tutor;
  transitionType: TransitionType;
  transitionNote: string;
  editable: boolean;
}

export interface CalendarMonth {
  year: number;
  month: number;
  monthName: string;
  days: DayAssignment[];
  mamaCount: number;
  papaCount: number;
  mamaWeekends: number;
  papaWeekends: number;
}

export interface CalendarConfig {
  year: number;
  month: number;
  mamaUnavailable: number[];
  papaUnavailable: number[];
}
