import { useMemo } from 'react';
import type { DayAssignment, CalendarMonth, CalendarConfig, Tutor } from '@/types/calendar';

const DAY_NAMES = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
const MONTH_NAMES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function isWeekendDay(dayOfWeek: number): boolean {
  return dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;
}

export function useCalendar(config: CalendarConfig): CalendarMonth {
  return useMemo(() => {
    const { year, month, mamaUnavailable, papaUnavailable, firstPayDay } = config;
    const daysInMonth = getDaysInMonth(year, month);

    // Lupita: odd weekends ON, even weekends OFF
    const getWeekendNum = (d: number): number => {
      let count = 0;
      for (let i = 1; i <= d; i++) {
        if (new Date(year, month, i).getDay() === 5) count++;
      }
      return count;
    };
    const isLupitaOffWeekend = (wn: number) => wn % 2 === 0;

    // ========== CORE PRINCIPLE: Max 5 consecutive days per tutor ==========
    // Strategy:
    // 1. Create 3-day blocks alternating tutors (Mamá/Papá/Mamá/Papá...)
    // 2. When a tutor is unavailable on certain days WITHIN their block:
    //    - Give ONLY those unavailable days to the other tutor
    //    - This creates 1-2 day "patches" for the other tutor
    //    - The original tutor keeps the rest of their block
    // 3. This guarantees NO tutor ever has more than 5 consecutive days
    //    because blocks are 3 days, and patches are 1-2 days max

    const dayAssignments = new Map<number, Tutor>();
    const lupitaStatusMap = new Map<number, DayAssignment['lupitaStatus']>();

    // Step 1: Build 3-day blocks with alternating ownership
    interface Block {
      days: number[];
      owner: Tutor; // Who this block belongs to
    }

    const blocks: Block[] = [];
    let currentOwner: Tutor = 'mama';

    for (let d = 1; d <= daysInMonth; d += 3) {
      const end = Math.min(d + 2, daysInMonth);
      const days: number[] = [];
      for (let i = d; i <= end; i++) days.push(i);
      blocks.push({ days, owner: currentOwner });
      currentOwner = currentOwner === 'mama' ? 'papa' : 'mama';
    }

    // Step 2: Assign day by day, handling restrictions
    for (const block of blocks) {
      for (const day of block.days) {
        const isMamaBlocked = mamaUnavailable.includes(day);
        const isPapaBlocked = papaUnavailable.includes(day);

        if (block.owner === 'mama') {
          if (isMamaBlocked && !isPapaBlocked) {
            dayAssignments.set(day, 'papa'); // Patch: give to papa
          } else if (isMamaBlocked && isPapaBlocked) {
            dayAssignments.set(day, 'mama'); // Both blocked, default to mama
          } else {
            dayAssignments.set(day, 'mama'); // Normal: mama keeps it
          }
        } else {
          // block.owner === 'papa'
          if (isPapaBlocked && !isMamaBlocked) {
            dayAssignments.set(day, 'mama'); // Patch: give to mama
          } else if (isPapaBlocked && isMamaBlocked) {
            dayAssignments.set(day, 'papa'); // Both blocked, default to papa
          } else {
            dayAssignments.set(day, 'papa'); // Normal: papa keeps it
          }
        }

        // Compute Lupita status independently
        const dow = new Date(year, month, day).getDay();
        const wkNum = getWeekendNum(day);
        const isOff = isLupitaOffWeekend(wkNum);

        if (dow === 5) {
          lupitaStatusMap.set(day, isOff ? 'LEAVES' : 'ON');
        } else if (dow === 6) {
          lupitaStatusMap.set(day, isOff ? 'OFF' : 'ON');
        } else if (dow === 0) {
          lupitaStatusMap.set(day, isOff ? 'OFF' : 'ON');
        } else if (dow === 1) {
          const prevSun = day - 1;
          if (prevSun >= 1 && isLupitaOffWeekend(getWeekendNum(prevSun))) {
            lupitaStatusMap.set(day, 'ARRIVES');
          } else {
            lupitaStatusMap.set(day, 'ON');
          }
        } else {
          lupitaStatusMap.set(day, 'ON');
        }
      }
    }

    // Step 3: Count and balance (fine-tune)
    let mamaCount = 0;
    let papaCount = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      if (dayAssignments.get(d) === 'mama') mamaCount++;
      else papaCount++;
    }

    // If imbalance > 1, try swapping individual boundary days
    let iterations = 0;
    while (Math.abs(mamaCount - papaCount) > 1 && iterations < 50) {
      iterations++;
      const overTutor: Tutor = mamaCount > papaCount ? 'mama' : 'papa';
      const underTutor: Tutor = overTutor === 'mama' ? 'papa' : 'mama';

      let swapped = false;
      // Find boundary days that can be swapped
      for (let d = 2; d <= daysInMonth && !swapped; d++) {
        const prev = dayAssignments.get(d - 1);
        const curr = dayAssignments.get(d);
        if (prev && curr && prev !== curr) {
          // Check both sides of the boundary
          if (curr === overTutor) {
            const canTake = underTutor === 'mama'
              ? !mamaUnavailable.includes(d)
              : !papaUnavailable.includes(d);
            if (canTake) {
              dayAssignments.set(d, underTutor);
              if (overTutor === 'mama') { mamaCount--; papaCount++; }
              else { papaCount--; mamaCount++; }
              swapped = true;
            }
          } else if (prev === overTutor && !swapped) {
            const canTake = underTutor === 'mama'
              ? !mamaUnavailable.includes(d - 1)
              : !papaUnavailable.includes(d - 1);
            if (canTake) {
              dayAssignments.set(d - 1, underTutor);
              if (overTutor === 'mama') { mamaCount--; papaCount++; }
              else { papaCount--; mamaCount++; }
              swapped = true;
            }
          }
        }
      }
      if (!swapped) break;
    }

    // Step 4: Count weekends per tutor
    let mamaWeekends = 0;
    let papaWeekends = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month, d).getDay();
      if (isWeekendDay(dow)) {
        const t = dayAssignments.get(d);
        if (t === 'mama') mamaWeekends++;
        else papaWeekends++;
      }
    }

    // Step 5: Payments
    const whoPays1st: Tutor = month % 2 === 0 ? 'mama' : 'papa';
    const whoPays2nd: Tutor = whoPays1st === 'mama' ? 'papa' : 'mama';

    let payDay1: number | null = null;
    let payDay2: number | null = null;

    if (firstPayDay) {
      payDay1 = firstPayDay;
      const second = firstPayDay + 14;
      payDay2 = second <= daysInMonth ? second : null;
    } else {
      // Auto: primer viernes entre días 11-15
      for (let d = 11; d <= 15; d++) {
        if (new Date(year, month, d).getDay() === 5) { payDay1 = d; break; }
      }
      // Auto: último viernes del mes
      let lf = daysInMonth;
      while (lf > 0 && new Date(year, month, lf).getDay() !== 5) lf--;
      if (lf > 0 && lf !== payDay1) payDay2 = lf;
    }

    // Step 6: Build final days array
    const days: DayAssignment[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dow = date.getDay();
      const dayName = DAY_NAMES[dow];
      const isWeekend = isWeekendDay(dow);

      const tutor = dayAssignments.get(d) || 'mama';
      const lupitaStatus = lupitaStatusMap.get(d) || 'ON';
      const comments: string[] = [];

      let isPayDay = false;
      let whoPays: Tutor | undefined;

      if (d === payDay1) {
        isPayDay = true;
        whoPays = whoPays1st;
        comments.push(`PAGA ${whoPays1st === 'mama' ? 'MAMÁ' : 'PAPÁ'}`);
      } else if (payDay2 && d === payDay2) {
        isPayDay = true;
        whoPays = whoPays2nd;
        comments.push(`PAGA ${whoPays2nd === 'mama' ? 'MAMÁ' : 'PAPÁ'}`);
      }

      if (lupitaStatus === 'LEAVES') comments.push('Lupita se va 12pm');
      else if (lupitaStatus === 'ARRIVES') comments.push('Llega Lupita 11am');

      if (mamaUnavailable.includes(d) && tutor === 'mama') comments.push('⚠ MAMÁ NO PUEDE');
      if (papaUnavailable.includes(d) && tutor === 'papa') comments.push('⚠ PAPÁ NO PUEDE');

      const prevTutor = d > 1 ? dayAssignments.get(d - 1) || null : null;
      let transitionType: DayAssignment['transitionType'] = null;
      let transitionNote = '';

      if (prevTutor && prevTutor !== tutor) {
        if (isWeekend) {
          transitionType = 'home_delivery';
          transitionNote = `${tutor === 'mama' ? 'Mamá' : 'Papá'} recoge`;
        } else {
          transitionType = 'school';
          transitionNote = `${tutor === 'mama' ? 'Mamá' : 'Papá'} recoge en escuela`;
        }
      }

      days.push({
        date, dayOfMonth: d, dayOfWeek: dow, dayName, tutor,
        lupitaStatus, isWeekend, comments, userNotes: '',
        isPayDay, whoPays,
        transitionType, transitionNote,
        editable: true,
      });
    }

    return {
      year, month,
      monthName: MONTH_NAMES[month],
      days,
      mamaCount: days.filter(d => d.tutor === 'mama').length,
      papaCount: days.filter(d => d.tutor === 'papa').length,
      mamaWeekends, papaWeekends,
    };
  }, [config]);
}
