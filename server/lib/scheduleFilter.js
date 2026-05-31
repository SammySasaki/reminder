export function filterByScheduleRelevance(instructions, dayOfWeek) {
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  return instructions.filter((inst) => {
    switch (inst.schedule_relevance) {
      case 'everyday':
        return true;
      case 'weekdays':
        return isWeekday;
      case 'weekends':
        return isWeekend;
      case 'specific_days':
        return Array.isArray(inst.specific_days) && inst.specific_days.includes(dayOfWeek);
      default:
        return true;
    }
  });
}
