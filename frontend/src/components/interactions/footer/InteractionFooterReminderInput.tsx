type InteractionFooterReminderInputProps = {
  reminder: string;
  onReminderChange: (value: string) => void;
};

const InteractionFooterReminderInput = ({
  reminder,
  onReminderChange
}: InteractionFooterReminderInputProps) => (
  <div className="col-span-5">
    <label htmlFor="interaction-reminder" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
      Prochain Rappel
    </label>
    <input
      id="interaction-reminder"
      type="datetime-local"
      value={reminder}
      onChange={(event) => onReminderChange(event.target.value)}
      className="w-full text-xs bg-white border border-slate-300 rounded-md py-1.5 px-2 focus:border-cir-red focus:outline-none"
      name="interaction-reminder"
      autoComplete="off"
    />
  </div>
);

export default InteractionFooterReminderInput;
