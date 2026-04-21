import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import {
  Printer, CalendarDays, RotateCcw, Info, ChevronLeft, ChevronRight,
  FileDown, X, Pencil, School, Home, ArrowRightLeft, MapPin
} from 'lucide-react';
import { useCalendar } from '@/hooks/useCalendar';
import type { CalendarConfig, DayAssignment, Tutor, TransitionType } from '@/types/calendar';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './App.css';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTHS_ENGLISH = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAY_HEADERS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

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

export default function App() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(4); // May (0-indexed)
  const [mamaUnavailable, setMamaUnavailable] = useState<number[]>([]);
  const [papaUnavailable, setPapaUnavailable] = useState<number[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [dayNotes, setDayNotes] = useState<Record<number, string>>({});
  const [dayTransitions, setDayTransitions] = useState<Record<number, { type: TransitionType; note: string }>>({});
  const [calendarDays, setCalendarDays] = useState<DayAssignment[]>([]);
  const [monthNotes, setMonthNotes] = useState('');

  const calendarRef = useRef<HTMLDivElement>(null);

  const config: CalendarConfig = {
    year,
    month,
    mamaUnavailable,
    papaUnavailable,
  };

  const calendar = useCalendar(config);

  // Use calendar.days but merge with any user edits
  const displayDays = calendarDays.length > 0 ? calendarDays : calendar.days;

  const handleToggleMamaUnavailable = useCallback((day: number) => {
    setMamaUnavailable(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  }, []);

  const handleTogglePapaUnavailable = useCallback((day: number) => {
    setPapaUnavailable(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  }, []);

  const handleGenerate = () => {
    setShowCalendar(true);
    setEditingDay(null);
    setCalendarDays([...calendar.days]);
    setDayNotes({});
    setDayTransitions({});
    // Keep monthNotes across regenerations
    toast.success('Calendario generado con éxito');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    if (!calendarRef.current) return;

    toast.info('Generando PDF, espera un momento...');

    // Temporarily hide edit hints and empty notes for clean PDF
    const editHints = calendarRef.current.querySelectorAll('.no-print-pdf');
    const notesSection = calendarRef.current.querySelector('.month-notes-section') as HTMLElement;
    const originalNotesDisplay = notesSection?.style.display || '';

    editHints.forEach((el) => {
      (el as HTMLElement).style.display = 'none';
    });

    // Hide notes section if empty
    if (notesSection && !monthNotes.trim()) {
      notesSection.style.display = 'none';
    }

    try {
      const element = calendarRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      // Restore visibility
      editHints.forEach((el) => {
        (el as HTMLElement).style.display = '';
      });
      if (notesSection) notesSection.style.display = originalNotesDisplay;

      // Use canvas dimensions as PDF page size for exact proportions
      const pxToMm = 0.264583;
      const pageWidthMm = canvas.width * pxToMm;
      const pageHeightMm = canvas.height * pxToMm;

      const pdf = new jsPDF({
        orientation: pageWidthMm > pageHeightMm ? 'l' : 'p',
        unit: 'mm',
        format: [pageWidthMm, pageHeightMm],
      });

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidthMm, pageHeightMm);

      const fileName = `Calendario${MONTHS_ENGLISH[month]}${year}Renata.pdf`;
      pdf.save(fileName);
      toast.success(`PDF guardado como ${fileName}`);
    } catch (error) {
      toast.error('Error al generar PDF');
      console.error(error);
    }
  };

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(y => y - 1);
    } else {
      setMonth(m => m - 1);
    }
    setShowCalendar(false);
    setEditingDay(null);
    setCalendarDays([]);
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(y => y + 1);
    } else {
      setMonth(m => m + 1);
    }
    setShowCalendar(false);
    setEditingDay(null);
    setCalendarDays([]);
  };

  const openEditModal = (dayOfMonth: number) => {
    setEditingDay(dayOfMonth);
  };

  const closeEditModal = () => {
    setEditingDay(null);
  };

  const updateDayTutor = (dayOfMonth: number, newTutor: Tutor) => {
    const dayIndex = displayDays.findIndex(d => d.dayOfMonth === dayOfMonth);
    if (dayIndex === -1) return;

    const newDays = [...displayDays];
    const prevTutor = dayIndex > 0 ? newDays[dayIndex - 1].tutor : null;
    newDays[dayIndex] = {
      ...newDays[dayIndex],
      tutor: newTutor,
      transitionType: prevTutor && prevTutor !== newTutor ? 'other' : null,
      transitionNote: prevTutor && prevTutor !== newTutor ? 'Cambio de custodia' : '',
    };

    // Update transition for next day too
    if (dayIndex < newDays.length - 1) {
      const nextDay = newDays[dayIndex + 1];
      if (nextDay.tutor !== newTutor) {
        newDays[dayIndex + 1] = {
          ...nextDay,
          transitionType: 'other',
          transitionNote: 'Cambio de custodia',
        };
      }
    }

    setCalendarDays(newDays);

    toast.info(`Día ${dayOfMonth} asignado a ${newTutor === 'mama' ? 'Mamá' : 'Papá'}`);
  };

  const updateDayNotes = (dayOfMonth: number, notes: string) => {
    setDayNotes(prev => ({ ...prev, [dayOfMonth]: notes }));
  };

  const updateDayTransition = (dayOfMonth: number, type: TransitionType, note: string) => {
    setDayTransitions(prev => ({ ...prev, [dayOfMonth]: { type, note } }));

    const dayIndex = displayDays.findIndex(d => d.dayOfMonth === dayOfMonth);
    if (dayIndex !== -1) {
      const newDays = [...displayDays];
      newDays[dayIndex] = {
        ...newDays[dayIndex],
        transitionType: type,
        transitionNote: note,
      };
      setCalendarDays(newDays);
    }
  };

  const getDayCells = () => {
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (DayAssignment | null)[] = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(null);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dayAssignment = displayDays.find(day => day.dayOfMonth === d);
      if (dayAssignment) {
        // Merge user edits
        const userNote = dayNotes[d];
        const userTransition = dayTransitions[d];
        cells.push({
          ...dayAssignment,
          userNotes: userNote !== undefined ? userNote : dayAssignment.userNotes,
          transitionType: userTransition?.type !== undefined ? userTransition.type : dayAssignment.transitionType,
          transitionNote: userTransition?.note !== undefined ? userTransition.note : dayAssignment.transitionNote,
        });
      } else {
        cells.push(null);
      }
    }

    return cells;
  };

  const mamaCount = displayDays.filter(d => d.tutor === 'mama').length;
  const papaCount = displayDays.filter(d => d.tutor === 'papa').length;
  const balance = Math.abs(mamaCount - papaCount);

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Get current editing day data
  const editingDayData = editingDay !== null
    ? displayDays.find(d => d.dayOfMonth === editingDay) || null
    : null;

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
          {showCalendar && (
            <div className="flex gap-2">
              <Button onClick={handleExportPDF} variant="outline" className="gap-2 font-bold">
                <FileDown className="w-4 h-4" />
                Exportar PDF
              </Button>
              <Button onClick={handlePrint} variant="outline" className="gap-2 font-bold">
                <Printer className="w-4 h-4" />
                Imprimir
              </Button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Configuration Panel */}
        <Card className="no-print mb-6 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-500" />
              Configuración del Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Month/Year Selection */}
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-bold">Año</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Button variant="outline" size="icon" onClick={() => { setYear(y => y - 1); setShowCalendar(false); }}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-2xl font-black w-16 text-center">{year}</span>
                    <Button variant="outline" size="icon" onClick={() => { setYear(y => y + 1); setShowCalendar(false); }}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-bold">Mes</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-lg font-bold w-24 text-center">{MONTHS[month]}</span>
                    <Button variant="outline" size="icon" onClick={handleNextMonth}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Mama Unavailable Days */}
              <div>
                <Label className="text-sm font-bold text-pink-600 mb-2 block">
                  Días que MAMÁ NO puede (Rosa)
                </Label>
                <div className="flex flex-wrap gap-1">
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                    <button
                      key={`mama-${day}`}
                      className={`day-btn ${mamaUnavailable.includes(day) ? 'selected-mama' : ''}`}
                      onClick={() => handleToggleMamaUnavailable(day)}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Papa Unavailable Days */}
              <div>
                <Label className="text-sm font-bold text-blue-600 mb-2 block">
                  Días que PAPÁ NO puede (Azul)
                </Label>
                <div className="flex flex-wrap gap-1">
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                    <button
                      key={`papa-${day}`}
                      className={`day-btn ${papaUnavailable.includes(day) ? 'selected-papa' : ''}`}
                      onClick={() => handleTogglePapaUnavailable(day)}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Month Notes & Events - unified */}
              <div>
                <Label className="text-sm font-bold text-gray-600 mb-1 block">Notas y Eventos del mes:</Label>
                <textarea
                  className="w-full border rounded-lg p-2 text-sm min-h-[80px] resize-y"
                  placeholder="Escribe notas y eventos del mes..."
                  value={monthNotes}
                  onChange={(e) => setMonthNotes(e.target.value)}
                />
              </div>

              {/* Generate Button */}
              <div className="flex flex-col justify-center gap-3">
                <Button
                  onClick={handleGenerate}
                  className="w-full h-14 text-lg font-bold bg-gradient-to-r from-pink-500 to-blue-500 hover:from-pink-600 hover:to-blue-600 text-white shadow-lg"
                >
                  <CalendarDays className="w-5 h-5 mr-2" />
                  Generar Calendario
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMamaUnavailable([]);
                    setPapaUnavailable([]);
                    setShowCalendar(false);
                    setEditingDay(null);
                    setCalendarDays([]);
                  }}
                  className="w-full gap-2 font-bold"
                >
                  <RotateCcw className="w-4 h-4" />
                  Limpiar
                </Button>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-pink-300 border border-pink-500"></div>
                <span className="font-semibold">Mamá</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-blue-300 border border-blue-500"></div>
                <span className="font-semibold">Papá</span>
              </div>
              <div className="flex items-center gap-1">
                <Badge className="bg-orange-500 text-white text-[10px] py-0">SE VA / LLEGA / OFF</Badge>
                <span className="font-semibold">Lupita</span>
              </div>
              <div className="flex items-center gap-1">
                <Badge className="text-[10px] py-0" style={{ background: 'linear-gradient(135deg, #66bb6a, #43a047)', color: 'white' }}>$ PAGA</Badge>
                <span className="font-semibold">Pago quincenal (viernes)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar View */}
        {showCalendar && (
          <div ref={calendarRef} className="calendar-print-area">
            {/* Title Section */}
            <div className="title-section text-center mb-4">
              <h2 className="text-4xl font-black text-gray-800 tracking-tight uppercase">
                {calendar.monthName} {calendar.year}
              </h2>
              <p className="text-lg font-bold text-gray-500 mt-1">
                Calendario de Custodia - Renata
              </p>
            </div>

            {/* Stats Bar */}
            <div className="stats-bar grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="stat-card mama-stat">
                <div className="text-3xl font-black text-pink-700">{mamaCount}</div>
                <div className="text-xs font-bold text-pink-600 uppercase tracking-wide">Noches Mamá</div>
              </div>
              <div className="stat-card papa-stat">
                <div className="text-3xl font-black text-blue-700">{papaCount}</div>
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">Noches Papá</div>
              </div>
              <div className="stat-card mama-stat">
                <div className="text-3xl font-black text-pink-700">{
                  displayDays.filter(d => d.tutor === 'mama' && d.isWeekend).length
                }</div>
                <div className="text-xs font-bold text-pink-600 uppercase tracking-wide">Fin de semana Mamá</div>
              </div>
              <div className="stat-card papa-stat">
                <div className="text-3xl font-black text-blue-700">{
                  displayDays.filter(d => d.tutor === 'papa' && d.isWeekend).length
                }</div>
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">Fin de semana Papá</div>
              </div>
            </div>

            {/* Balance Indicator */}
            <div className="flex justify-center mb-4 no-print">
              <div className={`px-5 py-2 rounded-full font-bold text-sm ${
                balance === 0 ? 'bg-green-100 text-green-700 border-2 border-green-300' :
                balance <= 2 ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-300' :
                'bg-red-100 text-red-700 border-2 border-red-300'
              }`}>
                {balance === 0 ? 'Balance: Perfecto 50-50' :
                 balance <= 2 ? `Balance: Diferencia de ${balance} noche${balance > 1 ? 's' : ''}` :
                 `Balance: Diferencia de ${balance} noches - Ajustar`}
              </div>
            </div>

            {/* Weekday Headers */}
            <div className="calendar-grid mb-2">
              {WEEKDAY_HEADERS.map((wd, i) => (
                <div key={i} className="weekday-header">{wd}</div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="calendar-grid">
              {getDayCells().map((cell, index) => {
                if (!cell) {
                  return <div key={`empty-${index}`} className="day-cell empty" />;
                }

                return (
                  <div
                    key={cell.dayOfMonth}
                    className={`day-cell ${cell.tutor}`}
                    onClick={() => openEditModal(cell.dayOfMonth)}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div className="text-center">
                        <div className="day-name">{cell.dayName.slice(0, 3)}</div>
                        <div className="day-number" style={{
                          color: cell.tutor === 'mama' ? '#880e4f' : '#0d47a1'
                        }}>
                          {cell.dayOfMonth}
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        {cell.lupitaStatus !== 'ON' && (
                          <span className="lupita-badge">
                            {cell.lupitaStatus === 'LEAVES' ? 'SE VA' :
                             cell.lupitaStatus === 'ARRIVES' ? 'LLEGA' :
                             cell.lupitaStatus}
                          </span>
                        )}
                        {cell.isPayDay && (
                          <span className="pay-badge">
                            $ PAGA {cell.whoPays === 'mama' ? 'MAMÁ' : 'PAPÁ'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Transition info - white background */}
                    {cell.transitionType && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="transition-badge flex items-center gap-1">
                          {getTransitionIcon(cell.transitionType)}
                          {cell.transitionNote}
                        </span>
                      </div>
                    )}

                    {/* System comments */}
                    <div className="comments-area">
                      {cell.comments.filter(c =>
                        !c.includes('PAGA') &&
                        !c.includes('Lupita se va') &&
                        !c.includes('Llega Lupita')
                      ).map((comment, i) => (
                        <div key={i} className="comment-line" style={{
                          color: comment.includes('NO PUEDE') ? '#c62828' : '#444',
                        }}>
                          {comment}
                        </div>
                      ))}
                    </div>

                    {/* User notes - yellow badge */}
                    {(cell.userNotes || dayNotes[cell.dayOfMonth]) && (
                      <span className="note-badge">
                        {dayNotes[cell.dayOfMonth] || cell.userNotes}
                      </span>
                    )}

                    {/* Edit hint - hidden in PDF */}
                    <div className="no-print no-print-pdf mt-auto pt-1 flex items-center justify-center gap-1 text-gray-400" style={{ fontSize: '0.55rem' }}>
                      <Pencil className="w-3 h-3" />
                      Editar
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Notes Area - unified */}
            <div className="mt-6 month-notes-section">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-3">
                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Notas y Eventos:</p>
                {monthNotes ? (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{monthNotes}</p>
                ) : (
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
      </div>

      {/* Edit Modal */}
      {editingDay !== null && editingDayData && (
        <div className="edit-modal-overlay no-print" onClick={closeEditModal}>
          <div className="edit-modal" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black">
                Día {editingDayData.dayOfMonth} - {editingDayData.dayName}
              </h3>
              <button onClick={closeEditModal} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current assignment */}
            <div className="mb-4 p-3 rounded-lg" style={{
              background: editingDayData.tutor === 'mama'
                ? 'linear-gradient(135deg, #fce4ec, #f8bbd0)'
                : 'linear-gradient(135deg, #e3f2fd, #bbdefb)',
              border: `2px solid ${editingDayData.tutor === 'mama' ? '#ec407a' : '#1976d2'}`
            }}>
              <p className="text-sm font-bold">
                Actualmente con: {editingDayData.tutor === 'mama' ? 'MAMÁ' : 'PAPÁ'}
              </p>
              {editingDayData.lupitaStatus !== 'ON' && (
                <p className="text-xs font-bold mt-1" style={{ color: '#ff9800' }}>
                  Lupita: {editingDayData.lupitaStatus === 'LEAVES' ? 'SE VA 12PM'
                    : editingDayData.lupitaStatus === 'ARRIVES' ? 'LLEGA 11AM'
                    : 'OFF'}
                </p>
              )}
            </div>

            {/* Change tutor */}
            <div className="mb-4">
              <Label className="text-sm font-bold mb-2 block">Cambiar tutor:</Label>
              <div className="flex gap-2">
                <Button
                  className="flex-1 font-bold"
                  style={{
                    background: editingDayData.tutor === 'mama' ? '#fce4ec' : '#ec407a',
                    color: editingDayData.tutor === 'mama' ? '#ec407a' : 'white',
                    border: '2px solid #ec407a'
                  }}
                  onClick={() => editingDayData.tutor !== 'mama' && updateDayTutor(editingDay, 'mama')}
                  disabled={editingDayData.tutor === 'mama'}
                >
                  MAMÁ
                </Button>
                <Button
                  className="flex-1 font-bold"
                  style={{
                    background: editingDayData.tutor === 'papa' ? '#e3f2fd' : '#1976d2',
                    color: editingDayData.tutor === 'papa' ? '#1976d2' : 'white',
                    border: '2px solid #1976d2'
                  }}
                  onClick={() => editingDayData.tutor !== 'papa' && updateDayTutor(editingDay, 'papa')}
                  disabled={editingDayData.tutor === 'papa'}
                >
                  PAPÁ
                </Button>
              </div>
            </div>

            {/* Transition type */}
            <div className="mb-4">
              <Label className="text-sm font-bold mb-2 block">Tipo de cambio:</Label>
              <div className="flex flex-wrap gap-1">
                {TRANSITION_OPTIONS.map(opt => (
                  <Button
                    key={opt.value || 'none'}
                    size="sm"
                    variant={editingDayData.transitionType === opt.value ? 'default' : 'outline'}
                    className="text-xs font-bold"
                    onClick={() => {
                      const note = opt.value === 'school' ? `${editingDayData.tutor === 'mama' ? 'Mamá' : 'Papá'} recoge en escuela`
                        : opt.value === 'home_delivery' ? `${editingDayData.tutor === 'mama' ? 'Mamá' : 'Papá'} recoge`
                        : opt.value === 'goes_home' ? `${editingDayData.tutor === 'mama' ? 'Mamá' : 'Papá'} recoge`
                        : opt.value === 'other' ? `${editingDayData.tutor === 'mama' ? 'Mamá' : 'Papá'} recoge`
                        : '';
                      updateDayTransition(editingDay, opt.value, note);
                    }}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
              {editingDayData.transitionNote && (
                <p
                  className="text-xs mt-1 font-bold px-2 py-1 rounded"
                  style={{
                    background: editingDayData.transitionNote.includes('Mamá')
                      ? '#fce4ec'
                      : editingDayData.transitionNote.includes('Papá')
                      ? '#e3f2fd'
                      : 'transparent',
                    color: editingDayData.transitionNote.includes('Mamá')
                      ? '#880e4f'
                      : editingDayData.transitionNote.includes('Papá')
                      ? '#0d47a1'
                      : '#666',
                  }}
                >
                  {editingDayData.transitionNote}
                </p>
              )}
            </div>

            {/* User notes */}
            <div className="mb-4">
              <Label className="text-sm font-bold mb-2 block">Anotaciones:</Label>
              <textarea
                className="w-full border rounded-lg p-2 text-sm min-h-[60px]"
                placeholder="Escribe anotaciones para este día..."
                value={dayNotes[editingDay] || editingDayData.userNotes || ''}
                onChange={(e) => updateDayNotes(editingDay, e.target.value)}
              />
            </div>

            <Button onClick={closeEditModal} className="w-full font-bold">
              Guardar cambios
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
