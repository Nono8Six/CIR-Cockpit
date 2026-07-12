// Valeur locale au format datetime-local (YYYY-MM-DDTHH:mm), relance a 09:00.
// Meme format que le champ "Prochain rappel" du detail dossier.
export const buildReminderPresetValue = (daysAhead: number, from: Date = new Date()): string => {
  const target = new Date(from);
  target.setDate(target.getDate() + daysAhead);
  target.setHours(9, 0, 0, 0);

  const pad = (value: number) => String(value).padStart(2, '0');
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${pad(target.getHours())}:${pad(target.getMinutes())}`;
};
