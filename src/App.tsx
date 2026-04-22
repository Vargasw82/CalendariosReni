import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import {
  Printer, CalendarDays, RotateCcw, Info, ChevronLeft, ChevronRight,
  FileDown, X, Pencil, School, Home, ArrowRightLeft, MapPin,
  Save, Trash2, BookCheck, Lock,
} from 'lucide-react';
import { useCalendar } from '@/hooks/useCalendar';
import type { CalendarConfig, DayAssignment, Tutor, TransitionType, SavedCalendar, SavedDayInfo } from '@/types/calendar';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './App.css';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const MONTHS_ENGLISH = MONTHS;
const WEEKDAY_HEADERS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MINI_CAL_HEADERS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const DAY_NAMES_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// ─── MiniCalendarPicker ───────────────────────────────────────────────────────

interface MiniCalendarPickerProps {
  year: number;
  month: number;
  selectedDays: number[];
  onToggle: (day: number) => void;
  colorClass: string;
}

function MiniCalendarPicker({ year, month, selectedDays, onToggle, colorClass }: MiniCalendarPickerProps) {
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {MINI_CAL_HEADERS.map((h, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-gray-400 h-5 flex items-center justify-center">{h}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) =>
          day === null ? <div key={`empty-${i}`} style={{ width: 32, height: 32 }} /> : (
            <button key={day} className={`day-btn ${selectedDays.includes(day) ? colorClass : ''}`}
              style={{ width: 32, height: 32, fontSize: '0.75rem' }} onClick={() => onToggle(day)}>
              {day}
            </button>
          )
        )}
      </div>
    </div>
  );
}

// ─── SavedCalendarCard ────────────────────────────────────────────────────────

interface SavedCalendarCardProps {
  calendar: SavedCalendar;
  isCurrentMonth: boolean;
  onDelete: () => void;
  onEditDay: (dayOfMonth: number) => void;
  onExportPDF: () => void;
  onPrint: () => void;
  printRef: (el: HTMLDivElement | null) => void;
}

function SavedCalendarCard({ calendar, isCurrentMonth, onDelete, onEditDay, onExportPDF, onPrint, printRef }: SavedCalendarCardProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthEnd = new Date(calendar.year, calendar.month + 1, 0);
  monthEnd.setHours(23, 59, 59, 999);
  const isPastMonth = monthEnd < today;
  const isFutureMonth = new Date(calendar.year, calendar.month, 1) > today;

  const isDayEditable = (dayOfMonth: number) => {
    if (isPastMonth) return false;
    if (isFutureMonth) return true;
    const d = new Date(calendar.year, calendar.month, dayOfMonth);
    d.setHours(0, 0, 0, 0);
    return d >= today;
  };

  const isDayPast = (dayOfMonth: number) => {
    if (isPastMonth) return true;
    if (isFutureMonth) return false;
    const d = new Date(calendar.year, calendar.month, dayOfMonth);
    d.setHours(0, 0, 0, 0);
    return d < today;
  };

  const firstDow = new Date(calendar.year, calendar.month, 1).getDay();
  const cells: (SavedDayInfo | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (const day of calendar.days) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  const payDays = calendar.days.filter(d => d.isPayDay);
  const balance = Math.abs(calendar.mamaCount - calendar.papaCount);

  return (
    <Card className={`shadow-md overflow-hidden ${isCurrentMonth ? 'ring-2 ring-purple-400' : ''}`}>
      {/* Control buttons - excluded from PDF */}
      <div className={`no-pdf px-5 py-3 flex items-center justify-between border-b ${
        isCurrentMonth ? 'bg-purple-50 border-purple-200' : isPastMonth ? 'bg-gray-50' : 'bg-white'
      }`}>
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-xl font-black uppercase tracking-tight">{calendar.monthName} {calendar.year}</h3>
          {isCurrentMonth && <Badge className="bg-purple-500 text-white text-[10px] py-0 px-2">MES ACTUAL</Badge>}
          {isPastMonth && <Badge variant="outline" className="text-gray-400 text-[10px] py-0">MES PASADO</Badge>}
          {isFutureMonth && <Badge className="bg-blue-100 text-blue-600 border border-blue-300 text-[10px] py-0">MES FUTURO</Badge>}
        </div>
        <div className="flex gap-2">
          <Button onClick={onExportPDF} variant="outline" size="sm" className="gap-1 font-bold text-xs">
            <FileDown className="w-3 h-3" />PDF
          </Button>
          <Button onClick={onPrint} variant="outline" size="sm" className="gap-1 font-bold text-xs">
            <Printer className="w-3 h-3" />Imprimir
          </Button>
          <Button onClick={onDelete} variant="outline" size="sm" className="font-bold text-red-400 hover:bg-red-50 border-red-200 px-2">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Printable area */}
      <div ref={printRef} className="bg-white">
        <CardContent className="p-2 sm:p-5">
          {/* Title for print */}
          <div className="hidden-screen print-only text-center mb-4">
            <h2 className="text-3xl font-black uppercase">{calendar.monthName} {calendar.year}</h2>
            <p className="text-gray-500 font-bold">Calendario de Custodia - Renata</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="stat-card mama-stat">
              <div className="text-3xl font-black text-pink-700">{calendar.mamaCount}</div>
              <div className="text-xs font-bold text-pink-600 uppercase">Noches Mamá</div>
            </div>
            <div className="stat-card papa-stat">
              <div className="text-3xl font-black text-blue-700">{calendar.papaCount}</div>
              <div className="text-xs font-bold text-blue-600 uppercase">Noches Papá</div>
            </div>
            <div className="stat-card mama-stat">
              <div className="text-3xl font-black text-pink-700">{calendar.mamaWeekends}</div>
              <div className="text-xs font-bold text-pink-600 uppercase">Fin sem Mamá</div>
            </div>
            <div className="stat-card papa-stat">
              <div className="text-3xl font-black text-blue-700">{calendar.papaWeekends}</div>
              <div className="text-xs font-bold text-blue-600 uppercase">Fin sem Papá</div>
            </div>
          </div>

          {/* Balance + Pay days row */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className={`px-4 py-1.5 rounded-full font-bold text-sm ${
              balance === 0 ? 'bg-green-100 text-green-700 border-2 border-green-300' :
              balance <= 2 ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-300' :
              'bg-red-100 text-red-700 border-2 border-red-300'
            }`}>
              {balance === 0 ? '✓ Balance 50-50' :
               calendar.mamaCount > calendar.papaCount
                 ? `Mamá +${balance} día${balance > 1 ? 's' : ''}`
                 : `Papá +${balance} día${balance > 1 ? 's' : ''}`}
            </div>
            {payDays.map(d => (
              <span key={d.dayOfMonth} className="pay-badge">
                $ Día {d.dayOfMonth} ({DAY_NAMES_SHORT[d.dayOfWeek]}) — {d.whoPays === 'mama' ? 'MAMÁ' : 'PAPÁ'}
              </span>
            ))}
          </div>

          {/* Weekday headers */}
          <div className="calendar-grid mb-2">
            {WEEKDAY_HEADERS.map((wd, i) => <div key={i} className="weekday-header">{wd}</div>)}
          </div>

          {/* Full calendar grid */}
          <div className="calendar-grid">
            {cells.map((cell, index) => {
              if (!cell) return <div key={`empty-${index}`} className="day-cell empty" />;

              const past = isDayPast(cell.dayOfMonth);
              const editable = isDayEditable(cell.dayOfMonth);

              return (
                <div
                  key={cell.dayOfMonth}
                  className={`day-cell ${cell.tutor} ${past ? 'day-past' : ''}`}
                  onClick={() => editable && onEditDay(cell.dayOfMonth)}
                  style={{ cursor: editable ? 'pointer' : 'default' }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <div className="text-center">
                      <div className="day-name">{DAY_NAMES_SHORT[cell.dayOfWeek]}</div>
                      <div className="day-number" style={{ color: cell.tutor === 'mama' ? '#880e4f' : '#0d47a1' }}>
                        {cell.dayOfMonth}
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      {cell.lupitaStatus !== 'ON' && (
                        <span className="lupita-badge">
                          {cell.lupitaStatus === 'LEAVES' ? 'SE VA' : cell.lupitaStatus === 'ARRIVES' ? 'LLEGA' : cell.lupitaStatus}
                        </span>
                      )}
                      {cell.isPayDay && (
                        <span className="pay-badge">$ PAGA {cell.whoPays === 'mama' ? 'MAMÁ' : 'PAPÁ'}</span>
                      )}
                    </div>
                  </div>
                  {cell.notes && <span className="note-badge">{cell.notes}</span>}
                  {/* Edit / Lock hint */}
                  <div className="no-pdf mt-auto pt-1 flex items-center justify-center gap-1 text-gray-400" style={{ fontSize: '0.55rem' }}>
                    {editable ? <><Pencil className="w-3 h-3" />Editar</> : past ? <><Lock className="w-3 h-3" />Cerrado</> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

// ─── Transition helpers ───────────────────────────────────────────────────────

const TRANSITION_OPTIONS: { value: TransitionType; label: string }[] = [
  { value: null, label: 'Sin cambio' },
  { value: 'school', label: 'Pasa por escuela' },
  { value: 'home_delivery', label: 'Entrega en casa' },
  { value: 'goes_home', label: 'Pasa a casa' },
  { value: 'other', label: 'Otro' },
];

function getTransitionIcon(type: TransitionType) {
  switch (type) {
    case 'school': return <School className="w-3 h-3" />;
    case 'home_delivery': return <Home className="w-3 h-3" />;
    case 'goes_home': return <MapPin className="w-3 h-3" />;
    case 'other': return <ArrowRightLeft className="w-3 h-3" />;
    default: return null;
  }
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(4);
  const [mamaUnavailable, setMamaUnavailable] = useState<number[]>([]);
  const [papaUnavailable, setPapaUnavailable] = useState<number[]>([]);
  const [firstPayDay, setFirstPayDay] = useState<number | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [dayNotes, setDayNotes] = useState<Record<number, string>>({});
  const [dayTransitions, setDayTransitions] = useState<Record<number, { type: TransitionType; note: string }>>({});
  const [calendarDays, setCalendarDays] = useState<DayAssignment[]>([]);
  const [monthNotes, setMonthNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'generar' | 'guardados'>('generar');
  const [editingSaved, setEditingSaved] = useState<{ year: number; month: number; dayOfMonth: number } | null>(null);
  const [savedEditNote, setSavedEditNote] = useState('');

  const [savedCalendars, setSavedCalendars] = useState<SavedCalendar[]>(() => {
    try {
      const stored = localStorage.getItem('calendariosReni_saved');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('calendariosReni_saved', JSON.stringify(savedCalendars));
  }, [savedCalendars]);

  useEffect(() => {
    if (!editingSaved) return;
    const cal = savedCalendars.find(c => c.year === editingSaved.year && c.month === editingSaved.month);
    const dayInfo = cal?.days.find(d => d.dayOfMonth === editingSaved.dayOfMonth);
    setSavedEditNote(dayInfo?.notes ?? '');
  }, [editingSaved]);

  const calendarRef = useRef<HTMLDivElement>(null);
  const savedPrintRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const config: CalendarConfig = {
    year, month, mamaUnavailable, papaUnavailable,
    firstPayDay: firstPayDay ?? undefined,
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const fridays = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    .filter(d => new Date(year, month, d).getDay() === 5);

  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevMonthCalendar = savedCalendars.find(c => c.year === prevYear && c.month === prevMonth) ?? null;

  const calendar = useCalendar(config);
  const displayDays = calendarDays.length > 0 ? calendarDays : calendar.days;

  // ── Próximo pago ──
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextPayment = (() => {
    const candidates = savedCalendars
      .flatMap(cal => cal.days.filter(d => d.isPayDay && d.whoPays).map(d => ({
        year: cal.year, month: cal.month,
        day: d.dayOfMonth, dayOfWeek: d.dayOfWeek,
        whoPays: d.whoPays as Tutor,
        date: new Date(cal.year, cal.month, d.dayOfMonth),
      })))
      .filter(p => p.date >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    if (!candidates.length) return null;
    const next = candidates[0];
    return { ...next, daysUntil: Math.ceil((next.date.getTime() - today.getTime()) / 86400000) };
  })();

  // ── Balance acumulado ──
  const cumulative = savedCalendars.reduce(
    (acc, cal) => ({ mama: acc.mama + cal.mamaCount, papa: acc.papa + cal.papaCount }),
    { mama: 0, papa: 0 }
  );

  // ── Handlers generator ──
  const handleToggleMamaUnavailable = useCallback((day: number) => {
    setMamaUnavailable(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  }, []);
  const handleTogglePapaUnavailable = useCallback((day: number) => {
    setPapaUnavailable(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  }, []);

  const handleGenerate = () => {
    setShowCalendar(true); setEditingDay(null);
    setCalendarDays([...calendar.days]); setDayNotes({}); setDayTransitions({});
    toast.success('Calendario generado con éxito');
  };

  const handlePrint = () => window.print();

  const handleExportPDF = async () => {
    if (!calendarRef.current) return;
    await captureAndSavePDF(calendarRef.current, `Calendario${MONTHS_ENGLISH[month]}${year}Renata.pdf`);
  };

  const captureAndSavePDF = async (element: HTMLDivElement, fileName: string) => {
    toast.info('Generando PDF, espera un momento...');
    const noPdfEls = element.querySelectorAll('.no-pdf, .no-print-pdf');
    noPdfEls.forEach(el => (el as HTMLElement).style.display = 'none');
    try {
      const canvas = await html2canvas(element, {
        scale: 2, useCORS: true, logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });
      noPdfEls.forEach(el => (el as HTMLElement).style.display = '');
      const pxToMm = 0.264583;
      const pw = canvas.width * pxToMm;
      const ph = canvas.height * pxToMm;
      const pdf = new jsPDF({ orientation: pw > ph ? 'l' : 'p', unit: 'mm', format: [pw, ph] });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pw, ph);
      pdf.save(fileName);
      toast.success(`PDF guardado: ${fileName}`);
    } catch (err) {
      noPdfEls.forEach(el => (el as HTMLElement).style.display = '');
      toast.error('Error al generar PDF');
      console.error(err);
    }
  };

  const handlePrevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1);
    setShowCalendar(false); setEditingDay(null); setCalendarDays([]); setFirstPayDay(null);
  };
  const handleNextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1);
    setShowCalendar(false); setEditingDay(null); setCalendarDays([]); setFirstPayDay(null);
  };

  const updateDayTutor = (dayOfMonth: number, newTutor: Tutor) => {
    const dayIndex = displayDays.findIndex(d => d.dayOfMonth === dayOfMonth);
    if (dayIndex === -1) return;
    const newDays = [...displayDays];
    const prevTutor = dayIndex > 0 ? newDays[dayIndex - 1].tutor : null;
    newDays[dayIndex] = {
      ...newDays[dayIndex], tutor: newTutor,
      transitionType: prevTutor && prevTutor !== newTutor ? 'other' : null,
      transitionNote: prevTutor && prevTutor !== newTutor ? 'Cambio de custodia' : '',
    };
    if (dayIndex < newDays.length - 1 && newDays[dayIndex + 1].tutor !== newTutor)
      newDays[dayIndex + 1] = { ...newDays[dayIndex + 1], transitionType: 'other', transitionNote: 'Cambio de custodia' };
    setCalendarDays(newDays);
    toast.info(`Día ${dayOfMonth} asignado a ${newTutor === 'mama' ? 'Mamá' : 'Papá'}`);
  };

  const updateDayNotes = (dayOfMonth: number, notes: string) =>
    setDayNotes(prev => ({ ...prev, [dayOfMonth]: notes }));

  const updateDayTransition = (dayOfMonth: number, type: TransitionType, note: string) => {
    setDayTransitions(prev => ({ ...prev, [dayOfMonth]: { type, note } }));
    const idx = displayDays.findIndex(d => d.dayOfMonth === dayOfMonth);
    if (idx !== -1) {
      const nd = [...displayDays];
      nd[idx] = { ...nd[idx], transitionType: type, transitionNote: note };
      setCalendarDays(nd);
    }
  };

  const getDayCells = () => {
    const firstDow = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const cells: (DayAssignment | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= days; d++) {
      const da = displayDays.find(day => day.dayOfMonth === d);
      if (da) cells.push({
        ...da,
        userNotes: dayNotes[d] !== undefined ? dayNotes[d] : da.userNotes,
        transitionType: dayTransitions[d]?.type !== undefined ? dayTransitions[d].type : da.transitionType,
        transitionNote: dayTransitions[d]?.note !== undefined ? dayTransitions[d].note : da.transitionNote,
      });
      else cells.push(null);
    }
    return cells;
  };

  // ── Handlers saved calendars ──
  const handleSaveCalendar = () => {
    const alreadySaved = savedCalendars.some(c => c.year === year && c.month === month);
    const existingDays = savedCalendars.find(c => c.year === year && c.month === month)?.days ?? [];

    const newSaved: SavedCalendar = {
      year, month,
      monthName: MONTHS[month].toUpperCase(),
      days: displayDays.map(d => {
        const existing = existingDays.find(e => e.dayOfMonth === d.dayOfMonth);
        return {
          dayOfMonth: d.dayOfMonth, dayOfWeek: d.dayOfWeek,
          tutor: d.tutor, lupitaStatus: d.lupitaStatus,
          isWeekend: d.isWeekend, isPayDay: d.isPayDay, whoPays: d.whoPays,
          notes: existing?.notes, // preserve existing notes on re-save
        };
      }),
      mamaCount: displayDays.filter(d => d.tutor === 'mama').length,
      papaCount: displayDays.filter(d => d.tutor === 'papa').length,
      mamaWeekends: displayDays.filter(d => d.tutor === 'mama' && d.isWeekend).length,
      papaWeekends: displayDays.filter(d => d.tutor === 'papa' && d.isWeekend).length,
      savedAt: new Date().toISOString(),
      firstPayDay: firstPayDay ?? undefined,
    };
    setSavedCalendars(prev => {
      const filtered = prev.filter(c => !(c.year === year && c.month === month));
      return [...filtered, newSaved].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
    });
    toast.success(alreadySaved
      ? `Calendario de ${MONTHS[month]} ${year} actualizado`
      : `Calendario de ${MONTHS[month]} ${year} guardado`);
  };

  const handleCloseSavedModal = () => {
    if (editingSaved && savedEditNote !== undefined) {
      setSavedCalendars(prev => prev.map(cal => {
        if (cal.year !== editingSaved.year || cal.month !== editingSaved.month) return cal;
        const newDays = cal.days.map(d =>
          d.dayOfMonth === editingSaved.dayOfMonth ? { ...d, notes: savedEditNote || undefined } : d
        );
        return { ...cal, days: newDays };
      }));
    }
    setEditingSaved(null);
  };

  const handleDeleteSavedCalendar = (y: number, m: number) => {
    setSavedCalendars(prev => prev.filter(c => !(c.year === y && c.month === m)));
    toast.info('Calendario eliminado');
  };

  const updateSavedDayTutor = (y: number, m: number, dayOfMonth: number, newTutor: Tutor) => {
    setSavedCalendars(prev => prev.map(cal => {
      if (cal.year !== y || cal.month !== m) return cal;
      const newDays = cal.days.map(d => d.dayOfMonth === dayOfMonth ? { ...d, tutor: newTutor } : d);
      return {
        ...cal, days: newDays,
        mamaCount: newDays.filter(d => d.tutor === 'mama').length,
        papaCount: newDays.filter(d => d.tutor === 'papa').length,
        mamaWeekends: newDays.filter(d => d.tutor === 'mama' && d.isWeekend).length,
        papaWeekends: newDays.filter(d => d.tutor === 'papa' && d.isWeekend).length,
      };
    }));
    toast.info(`Día ${dayOfMonth} cambiado a ${newTutor === 'mama' ? 'Mamá' : 'Papá'}`);
  };

  const exportSavedPDF = async (y: number, m: number) => {
    const el = savedPrintRefs.current.get(`${y}-${m}`);
    if (!el) return;
    await captureAndSavePDF(el, `Calendario${MONTHS_ENGLISH[m]}${y}Renata.pdf`);
  };

  const printSavedCalendar = (y: number, m: number) => {
    const el = savedPrintRefs.current.get(`${y}-${m}`);
    if (!el) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Calendario ${MONTHS[m]} ${y}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap');
        * { font-family: Nunito, sans-serif; }
        body { margin: 0; padding: 8mm; }
        @page { size: landscape; margin: 8mm; }
      </style>
      </head><body>${el.innerHTML}</body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const mamaCount = displayDays.filter(d => d.tutor === 'mama').length;
  const papaCount = displayDays.filter(d => d.tutor === 'papa').length;
  const balance = Math.abs(mamaCount - papaCount);
  const editingDayData = editingDay !== null ? displayDays.find(d => d.dayOfMonth === editingDay) || null : null;

  const editingSavedData = editingSaved
    ? savedCalendars.find(c => c.year === editingSaved.year && c.month === editingSaved.month)
        ?.days.find(d => d.dayOfMonth === editingSaved.dayOfMonth) ?? null
    : null;

  // ── Render ──
  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-center" />

      {/* Header */}
      <header className="bg-white shadow-sm border-b no-print">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarDays className="w-8 h-8 text-pink-500" />
            <div>
              <h1 className="text-2xl font-black text-gray-800">Calendario Renata</h1>
              <p className="text-sm text-gray-500 font-semibold">Generador de calendario de custodia mensual</p>
            </div>
          </div>
          {activeTab === 'generar' && showCalendar && (
            <div className="flex gap-2">
              <Button onClick={handleSaveCalendar} variant="outline" className="gap-2 font-bold text-green-700 border-green-400 hover:bg-green-50">
                <Save className="w-4 h-4" />Guardar
              </Button>
              <Button onClick={handleExportPDF} variant="outline" className="gap-2 font-bold">
                <FileDown className="w-4 h-4" />PDF
              </Button>
              <Button onClick={handlePrint} variant="outline" className="gap-2 font-bold">
                <Printer className="w-4 h-4" />Imprimir
              </Button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 pb-3 flex gap-2">
          <button
            className={`px-5 py-1.5 rounded-full text-sm font-bold transition-all ${activeTab === 'generar' ? 'bg-gradient-to-r from-pink-500 to-blue-500 text-white shadow' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            onClick={() => setActiveTab('generar')}
          >Generar Calendario</button>
          <button
            className={`px-5 py-1.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'guardados' ? 'bg-gradient-to-r from-pink-500 to-blue-500 text-white shadow' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            onClick={() => setActiveTab('guardados')}
          >
            <BookCheck className="w-4 h-4" />
            Calendarios Aceptados
            {savedCalendars.length > 0 && (
              <span className={`rounded-full text-xs px-1.5 py-0.5 font-black ${activeTab === 'guardados' ? 'bg-white text-pink-600' : 'bg-pink-500 text-white'}`}>
                {savedCalendars.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-6">

        {/* ═══ TAB: GENERAR ═══ */}
        {activeTab === 'generar' && (
          <>
            <Card className="no-print mb-6 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-500" />Configuración del Mes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Col 1 */}
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-bold">Año</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Button variant="outline" size="icon" onClick={() => { setYear(y => y - 1); setShowCalendar(false); setFirstPayDay(null); }}><ChevronLeft className="w-4 h-4" /></Button>
                        <span className="text-2xl font-black w-16 text-center">{year}</span>
                        <Button variant="outline" size="icon" onClick={() => { setYear(y => y + 1); setShowCalendar(false); setFirstPayDay(null); }}><ChevronRight className="w-4 h-4" /></Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-bold">Mes</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Button variant="outline" size="icon" onClick={handlePrevMonth}><ChevronLeft className="w-4 h-4" /></Button>
                        <span className="text-lg font-bold w-24 text-center">{MONTHS[month]}</span>
                        <Button variant="outline" size="icon" onClick={handleNextMonth}><ChevronRight className="w-4 h-4" /></Button>
                      </div>
                    </div>
                    {prevMonthCalendar && (
                      <div className={`rounded-lg p-2 text-xs border ${
                        prevMonthCalendar.mamaCount === prevMonthCalendar.papaCount
                          ? 'bg-green-50 border-green-300'
                          : 'bg-amber-50 border-amber-300'
                      }`}>
                        <p className="font-black text-gray-700 mb-0.5">
                          {prevMonthCalendar.monthName} {prevMonthCalendar.year}:
                        </p>
                        {prevMonthCalendar.mamaCount === prevMonthCalendar.papaCount ? (
                          <p className="text-green-700 font-bold">✓ Balance perfecto el mes pasado</p>
                        ) : prevMonthCalendar.mamaCount > prevMonthCalendar.papaCount ? (
                          <p className="text-amber-800 font-bold">
                            Mamá tuvo {prevMonthCalendar.mamaCount - prevMonthCalendar.papaCount} día{prevMonthCalendar.mamaCount - prevMonthCalendar.papaCount > 1 ? 's' : ''} más
                            <br />→ Compensar a <strong>Papá</strong> este mes
                          </p>
                        ) : (
                          <p className="text-amber-800 font-bold">
                            Papá tuvo {prevMonthCalendar.papaCount - prevMonthCalendar.mamaCount} día{prevMonthCalendar.papaCount - prevMonthCalendar.mamaCount > 1 ? 's' : ''} más
                            <br />→ Compensar a <strong>Mamá</strong> este mes
                          </p>
                        )}
                      </div>
                    )}

                    <div>
                      <Label className="text-sm font-bold text-green-700 mb-1 block">Primer pago Lupita (viernes)</Label>
                      <div className="flex flex-wrap gap-1">
                        <button className={`day-btn ${firstPayDay === null ? 'selected-pay' : ''}`} style={{ fontSize: '0.65rem', width: '40px' }} onClick={() => setFirstPayDay(null)}>Auto</button>
                        {fridays.map(f => (
                          <button key={f} className={`day-btn ${firstPayDay === f ? 'selected-pay' : ''}`} onClick={() => setFirstPayDay(prev => prev === f ? null : f)}>{f}</button>
                        ))}
                      </div>
                      {firstPayDay !== null && (
                        <p className="text-xs text-gray-500 mt-1">
                          Pago 2: {firstPayDay + 14 <= daysInMonth ? `viernes día ${firstPayDay + 14}` : 'no cae en este mes'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Col 2 */}
                  <div>
                    <Label className="text-sm font-bold text-pink-600 mb-2 block">Días que MAMÁ NO puede (Rosa)</Label>
                    <MiniCalendarPicker year={year} month={month} selectedDays={mamaUnavailable} onToggle={handleToggleMamaUnavailable} colorClass="selected-mama" />
                  </div>

                  {/* Col 3 */}
                  <div>
                    <Label className="text-sm font-bold text-blue-600 mb-2 block">Días que PAPÁ NO puede (Azul)</Label>
                    <MiniCalendarPicker year={year} month={month} selectedDays={papaUnavailable} onToggle={handleTogglePapaUnavailable} colorClass="selected-papa" />
                  </div>

                  {/* Col 4 */}
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-bold text-gray-600 mb-1 block">Notas y Eventos del mes:</Label>
                      <textarea className="w-full border rounded-lg p-2 text-sm min-h-[80px] resize-y" placeholder="Escribe notas y eventos del mes..." value={monthNotes} onChange={e => setMonthNotes(e.target.value)} />
                    </div>
                    <Button onClick={handleGenerate} className="w-full h-12 text-base font-bold bg-gradient-to-r from-pink-500 to-blue-500 hover:from-pink-600 hover:to-blue-600 text-white shadow-lg">
                      <CalendarDays className="w-5 h-5 mr-2" />Generar Calendario
                    </Button>
                    <Button variant="outline" onClick={() => { setMamaUnavailable([]); setPapaUnavailable([]); setFirstPayDay(null); setShowCalendar(false); setEditingDay(null); setCalendarDays([]); }} className="w-full gap-2 font-bold">
                      <RotateCcw className="w-4 h-4" />Limpiar
                    </Button>
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-4 flex flex-wrap gap-3 text-xs">
                  <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-pink-300 border border-pink-500"></div><span className="font-semibold">Mamá</span></div>
                  <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-blue-300 border border-blue-500"></div><span className="font-semibold">Papá</span></div>
                  <div className="flex items-center gap-1"><Badge className="bg-orange-500 text-white text-[10px] py-0">SE VA / LLEGA / OFF</Badge><span className="font-semibold">Lupita</span></div>
                  <div className="flex items-center gap-1"><Badge className="text-[10px] py-0" style={{ background: 'linear-gradient(135deg, #66bb6a, #43a047)', color: 'white' }}>$ PAGA</Badge><span className="font-semibold">Pago quincenal</span></div>
                </div>
              </CardContent>
            </Card>

            {/* Calendar view */}
            {showCalendar && (
              <div ref={calendarRef} className="calendar-print-area">
                <div className="title-section text-center mb-4">
                  <h2 className="text-4xl font-black text-gray-800 tracking-tight uppercase">{calendar.monthName} {calendar.year}</h2>
                  <p className="text-lg font-bold text-gray-500 mt-1">Calendario de Custodia - Renata</p>
                </div>
                <div className="stats-bar grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="stat-card mama-stat"><div className="text-3xl font-black text-pink-700">{mamaCount}</div><div className="text-xs font-bold text-pink-600 uppercase tracking-wide">Noches Mamá</div></div>
                  <div className="stat-card papa-stat"><div className="text-3xl font-black text-blue-700">{papaCount}</div><div className="text-xs font-bold text-blue-600 uppercase tracking-wide">Noches Papá</div></div>
                  <div className="stat-card mama-stat"><div className="text-3xl font-black text-pink-700">{displayDays.filter(d => d.tutor === 'mama' && d.isWeekend).length}</div><div className="text-xs font-bold text-pink-600 uppercase tracking-wide">Fin de semana Mamá</div></div>
                  <div className="stat-card papa-stat"><div className="text-3xl font-black text-blue-700">{displayDays.filter(d => d.tutor === 'papa' && d.isWeekend).length}</div><div className="text-xs font-bold text-blue-600 uppercase tracking-wide">Fin de semana Papá</div></div>
                </div>
                <div className="flex justify-center mb-4 no-print">
                  <div className={`px-5 py-2 rounded-full font-bold text-sm ${balance === 0 ? 'bg-green-100 text-green-700 border-2 border-green-300' : balance <= 2 ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-300' : 'bg-red-100 text-red-700 border-2 border-red-300'}`}>
                    {balance === 0 ? 'Balance: Perfecto 50-50' : balance <= 2 ? `Balance: Diferencia de ${balance} noche${balance > 1 ? 's' : ''}` : `Balance: Diferencia de ${balance} noches - Ajustar`}
                  </div>
                </div>
                <div className="calendar-grid mb-2">
                  {WEEKDAY_HEADERS.map((wd, i) => <div key={i} className="weekday-header">{wd}</div>)}
                </div>
                <div className="calendar-grid">
                  {getDayCells().map((cell, index) => {
                    if (!cell) return <div key={`empty-${index}`} className="day-cell empty" />;
                    return (
                      <div key={cell.dayOfMonth} className={`day-cell ${cell.tutor}`} onClick={() => setEditingDay(cell.dayOfMonth)}>
                        <div className="flex flex-col items-center gap-1">
                          <div className="text-center">
                            <div className="day-name">{cell.dayName.slice(0, 3)}</div>
                            <div className="day-number" style={{ color: cell.tutor === 'mama' ? '#880e4f' : '#0d47a1' }}>{cell.dayOfMonth}</div>
                          </div>
                          <div className="flex flex-col items-center gap-0.5">
                            {cell.lupitaStatus !== 'ON' && <span className="lupita-badge">{cell.lupitaStatus === 'LEAVES' ? 'SE VA' : cell.lupitaStatus === 'ARRIVES' ? 'LLEGA' : cell.lupitaStatus}</span>}
                            {cell.isPayDay && <span className="pay-badge">$ PAGA {cell.whoPays === 'mama' ? 'MAMÁ' : 'PAPÁ'}</span>}
                          </div>
                        </div>
                        {cell.transitionType && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="transition-badge flex items-center gap-1">{getTransitionIcon(cell.transitionType)}{cell.transitionNote}</span>
                          </div>
                        )}
                        <div className="comments-area">
                          {cell.comments.filter(c => !c.includes('PAGA') && !c.includes('Lupita se va') && !c.includes('Llega Lupita')).map((comment, i) => (
                            <div key={i} className="comment-line" style={{ color: comment.includes('NO PUEDE') ? '#c62828' : '#444' }}>{comment}</div>
                          ))}
                        </div>
                        {(cell.userNotes || dayNotes[cell.dayOfMonth]) && <span className="note-badge">{dayNotes[cell.dayOfMonth] || cell.userNotes}</span>}
                        <div className="no-print no-print-pdf mt-auto pt-1 flex items-center justify-center gap-1 text-gray-400" style={{ fontSize: '0.55rem' }}>
                          <Pencil className="w-3 h-3" />Editar
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 month-notes-section">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-3">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Notas y Eventos:</p>
                    {monthNotes ? <p className="text-sm text-gray-700 whitespace-pre-wrap">{monthNotes}</p> : (
                      <div className="space-y-2">
                        <div className="border-b border-gray-200 h-6"></div>
                        <div className="border-b border-gray-200 h-6"></div>
                        <div className="border-b border-gray-200 h-6"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══ TAB: GUARDADOS ═══ */}
        {activeTab === 'guardados' && (
          <div className="space-y-5">

            {/* Próximo pago */}
            {nextPayment && (
              <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                <div className="text-4xl">💵</div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-green-600 uppercase tracking-wide">Próximo pago de Lupita</p>
                  <p className="text-xl font-black text-green-800">
                    {WEEKDAY_HEADERS[nextPayment.dayOfWeek]} {nextPayment.day} de {MONTHS[nextPayment.month]} {nextPayment.year}
                  </p>
                  <p className="text-sm font-bold text-green-700">Paga {nextPayment.whoPays === 'mama' ? 'MAMÁ' : 'PAPÁ'}</p>
                </div>
                <div className="text-center bg-green-100 rounded-xl px-4 py-2 border border-green-200">
                  <p className="text-3xl font-black text-green-700">{nextPayment.daysUntil === 0 ? '¡Hoy!' : nextPayment.daysUntil}</p>
                  {nextPayment.daysUntil > 0 && <p className="text-xs font-bold text-green-600">días</p>}
                </div>
              </div>
            )}

            {/* Balance acumulado */}
            {savedCalendars.length > 0 && (
              <div className="bg-white border rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-4">
                <div className="font-black text-gray-600 text-sm uppercase tracking-wide">Balance acumulado</div>
                <div className="flex gap-3">
                  <div className="bg-pink-50 border border-pink-200 rounded-lg px-4 py-2 text-center">
                    <div className="text-2xl font-black text-pink-700">{cumulative.mama}</div>
                    <div className="text-xs font-bold text-pink-600">días Mamá</div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-center">
                    <div className="text-2xl font-black text-blue-700">{cumulative.papa}</div>
                    <div className="text-xs font-bold text-blue-600">días Papá</div>
                  </div>
                </div>
                {cumulative.mama !== cumulative.papa && (
                  <div className={`px-4 py-2 rounded-full font-bold text-sm ${Math.abs(cumulative.mama - cumulative.papa) <= 2 ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
                    {cumulative.mama > cumulative.papa
                      ? `Mamá tiene ${cumulative.mama - cumulative.papa} día${cumulative.mama - cumulative.papa > 1 ? 's' : ''} más → Papá compensa el siguiente mes`
                      : `Papá tiene ${cumulative.papa - cumulative.mama} día${cumulative.papa - cumulative.mama > 1 ? 's' : ''} más → Mamá compensa el siguiente mes`}
                  </div>
                )}
                {cumulative.mama === cumulative.papa && cumulative.mama > 0 && (
                  <div className="px-4 py-2 rounded-full font-bold text-sm bg-green-100 text-green-800 border border-green-300">
                    ✓ Balance perfecto acumulado
                  </div>
                )}
              </div>
            )}

            {/* Empty state */}
            {savedCalendars.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <BookCheck className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-black">No hay calendarios aceptados</p>
                <p className="text-sm mt-2">Genera un calendario y presiona <span className="font-bold text-green-600">Guardar</span> para verlo aquí</p>
              </div>
            )}

            {/* Saved calendar cards - full view */}
            {savedCalendars.map(cal => {
              const key = `${cal.year}-${cal.month}`;
              const isCurrentMonth = cal.year === today.getFullYear() && cal.month === today.getMonth();
              return (
                <SavedCalendarCard
                  key={key}
                  calendar={cal}
                  isCurrentMonth={isCurrentMonth}
                  onDelete={() => handleDeleteSavedCalendar(cal.year, cal.month)}
                  onEditDay={(dayOfMonth) => setEditingSaved({ year: cal.year, month: cal.month, dayOfMonth })}
                  onExportPDF={() => exportSavedPDF(cal.year, cal.month)}
                  onPrint={() => printSavedCalendar(cal.year, cal.month)}
                  printRef={(el) => {
                    if (el) savedPrintRefs.current.set(key, el);
                    else savedPrintRefs.current.delete(key);
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Edit Modal (Generator) ─── */}
      {editingDay !== null && editingDayData && (
        <div className="edit-modal-overlay no-print" onClick={() => setEditingDay(null)}>
          <div className="edit-modal" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black">Día {editingDayData.dayOfMonth} - {editingDayData.dayName}</h3>
              <button onClick={() => setEditingDay(null)} className="p-1 rounded-full hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="mb-4 p-3 rounded-lg" style={{ background: editingDayData.tutor === 'mama' ? 'linear-gradient(135deg, #fce4ec, #f8bbd0)' : 'linear-gradient(135deg, #e3f2fd, #bbdefb)', border: `2px solid ${editingDayData.tutor === 'mama' ? '#ec407a' : '#1976d2'}` }}>
              <p className="text-sm font-bold">Actualmente con: {editingDayData.tutor === 'mama' ? 'MAMÁ' : 'PAPÁ'}</p>
              {editingDayData.lupitaStatus !== 'ON' && <p className="text-xs font-bold mt-1" style={{ color: '#ff9800' }}>Lupita: {editingDayData.lupitaStatus === 'LEAVES' ? 'SE VA 12PM' : editingDayData.lupitaStatus === 'ARRIVES' ? 'LLEGA 11AM' : 'OFF'}</p>}
            </div>
            <div className="mb-4">
              <Label className="text-sm font-bold mb-2 block">Cambiar tutor:</Label>
              <div className="flex gap-2">
                <Button className="flex-1 font-bold" style={{ background: editingDayData.tutor === 'mama' ? '#fce4ec' : '#ec407a', color: editingDayData.tutor === 'mama' ? '#ec407a' : 'white', border: '2px solid #ec407a' }} onClick={() => editingDayData.tutor !== 'mama' && updateDayTutor(editingDay, 'mama')} disabled={editingDayData.tutor === 'mama'}>MAMÁ</Button>
                <Button className="flex-1 font-bold" style={{ background: editingDayData.tutor === 'papa' ? '#e3f2fd' : '#1976d2', color: editingDayData.tutor === 'papa' ? '#1976d2' : 'white', border: '2px solid #1976d2' }} onClick={() => editingDayData.tutor !== 'papa' && updateDayTutor(editingDay, 'papa')} disabled={editingDayData.tutor === 'papa'}>PAPÁ</Button>
              </div>
            </div>
            <div className="mb-4">
              <Label className="text-sm font-bold mb-2 block">Tipo de cambio:</Label>
              <div className="flex flex-wrap gap-1">
                {TRANSITION_OPTIONS.map(opt => (
                  <Button key={opt.value || 'none'} size="sm" variant={editingDayData.transitionType === opt.value ? 'default' : 'outline'} className="text-xs font-bold"
                    onClick={() => { const note = opt.value ? `${editingDayData.tutor === 'mama' ? 'Mamá' : 'Papá'} recoge${opt.value === 'school' ? ' en escuela' : ''}` : ''; updateDayTransition(editingDay, opt.value, note); }}>
                    {opt.label}
                  </Button>
                ))}
              </div>
              {editingDayData.transitionNote && (
                <p className="text-xs mt-1 font-bold px-2 py-1 rounded" style={{ background: editingDayData.transitionNote.includes('Mamá') ? '#fce4ec' : editingDayData.transitionNote.includes('Papá') ? '#e3f2fd' : 'transparent', color: editingDayData.transitionNote.includes('Mamá') ? '#880e4f' : editingDayData.transitionNote.includes('Papá') ? '#0d47a1' : '#666' }}>
                  {editingDayData.transitionNote}
                </p>
              )}
            </div>
            <div className="mb-4">
              <Label className="text-sm font-bold mb-2 block">Anotaciones:</Label>
              <textarea className="w-full border rounded-lg p-2 text-sm min-h-[60px]" placeholder="Escribe anotaciones para este día..." value={dayNotes[editingDay] || editingDayData.userNotes || ''} onChange={e => updateDayNotes(editingDay, e.target.value)} />
            </div>
            <Button onClick={() => setEditingDay(null)} className="w-full font-bold">Guardar cambios</Button>
          </div>
        </div>
      )}

      {/* ─── Edit Modal (Saved Calendar) ─── */}
      {editingSaved !== null && editingSavedData && (
        <div className="edit-modal-overlay no-print" onClick={handleCloseSavedModal}>
          <div className="edit-modal" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black">
                Día {editingSaved.dayOfMonth} — {MONTHS[editingSaved.month]} {editingSaved.year}
              </h3>
              <button onClick={handleCloseSavedModal} className="p-1 rounded-full hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>

            <div className="mb-4 p-3 rounded-lg" style={{ background: editingSavedData.tutor === 'mama' ? 'linear-gradient(135deg, #fce4ec, #f8bbd0)' : 'linear-gradient(135deg, #e3f2fd, #bbdefb)', border: `2px solid ${editingSavedData.tutor === 'mama' ? '#ec407a' : '#1976d2'}` }}>
              <p className="text-sm font-bold">Actualmente con: {editingSavedData.tutor === 'mama' ? 'MAMÁ' : 'PAPÁ'}</p>
              {editingSavedData.lupitaStatus !== 'ON' && (
                <p className="text-xs font-bold mt-1" style={{ color: '#ff9800' }}>
                  Lupita: {editingSavedData.lupitaStatus === 'LEAVES' ? 'SE VA 12PM' : editingSavedData.lupitaStatus === 'ARRIVES' ? 'LLEGA 11AM' : 'OFF'}
                </p>
              )}
              {editingSavedData.isPayDay && (
                <p className="text-xs font-bold mt-1 text-green-700">
                  💵 Día de pago — {editingSavedData.whoPays === 'mama' ? 'MAMÁ' : 'PAPÁ'}
                </p>
              )}
            </div>

            <div className="mb-4">
              <Label className="text-sm font-bold mb-2 block">Cambiar tutor:</Label>
              <div className="flex gap-2">
                <Button className="flex-1 font-bold" style={{ background: editingSavedData.tutor === 'mama' ? '#fce4ec' : '#ec407a', color: editingSavedData.tutor === 'mama' ? '#ec407a' : 'white', border: '2px solid #ec407a' }}
                  onClick={() => editingSavedData.tutor !== 'mama' && updateSavedDayTutor(editingSaved.year, editingSaved.month, editingSaved.dayOfMonth, 'mama')}
                  disabled={editingSavedData.tutor === 'mama'}>MAMÁ</Button>
                <Button className="flex-1 font-bold" style={{ background: editingSavedData.tutor === 'papa' ? '#e3f2fd' : '#1976d2', color: editingSavedData.tutor === 'papa' ? '#1976d2' : 'white', border: '2px solid #1976d2' }}
                  onClick={() => editingSavedData.tutor !== 'papa' && updateSavedDayTutor(editingSaved.year, editingSaved.month, editingSaved.dayOfMonth, 'papa')}
                  disabled={editingSavedData.tutor === 'papa'}>PAPÁ</Button>
              </div>
            </div>

            <div className="mb-4">
              <Label className="text-sm font-bold mb-2 block">Anotación del día:</Label>
              <textarea
                className="w-full border rounded-lg p-2 text-sm min-h-[60px]"
                placeholder="Escribe una nota para este día..."
                value={savedEditNote}
                onChange={e => setSavedEditNote(e.target.value)}
              />
              <p className="text-[10px] text-gray-400 mt-1">Se muestra en amarillo en el calendario</p>
            </div>

            <Button onClick={handleCloseSavedModal} className="w-full font-bold">Guardar y Cerrar</Button>
          </div>
        </div>
      )}
    </div>
  );
}
