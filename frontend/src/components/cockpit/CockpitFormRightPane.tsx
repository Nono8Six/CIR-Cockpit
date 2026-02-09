import type { CockpitFormRightPaneProps } from './CockpitPaneTypes';
import CockpitSubjectSection from './right/CockpitSubjectSection';
import CockpitFooterSection from './right/CockpitFooterSection';

const CockpitFormRightPane = ({
  labelStyle,
  footerLabelStyle,
  subjectField,
  notesField,
  orderRefField,
  reminderField,
  reminderAt,
  errors,
  families,
  megaFamilies,
  onToggleFamily,
  statusMeta,
  statusCategoryLabel,
  statusCategoryBadges,
  statusTriggerRef,
  statusValue,
  onStatusChange,
  statusGroups,
  hasStatuses,
  statusHelpId,
  onSetReminder,
  onReset
}: CockpitFormRightPaneProps) => {
  return (
    <div data-testid="cockpit-right-pane" className="col-span-12 md:col-span-7 min-w-0 p-4 sm:p-5 flex flex-col gap-4 sm:gap-5">
      <CockpitSubjectSection
        labelStyle={labelStyle}
        subjectField={subjectField}
        notesField={notesField}
        errors={errors}
        families={families}
        megaFamilies={megaFamilies}
        onToggleFamily={onToggleFamily}
      />

      <CockpitFooterSection
        footerLabelStyle={footerLabelStyle}
        orderRefField={orderRefField}
        reminderField={reminderField}
        reminderAt={reminderAt}
        statusMeta={statusMeta}
        statusCategoryLabel={statusCategoryLabel}
        statusCategoryBadges={statusCategoryBadges}
        statusTriggerRef={statusTriggerRef}
        statusValue={statusValue}
        onStatusChange={onStatusChange}
        statusGroups={statusGroups}
        hasStatuses={hasStatuses}
        statusHelpId={statusHelpId}
        onSetReminder={onSetReminder}
        onReset={onReset}
      />
      {errors.status_id ? (
        <p className="text-xs text-red-600" role="status" aria-live="polite">
          {errors.status_id.message}
        </p>
      ) : null}
    </div>
  );
};

export default CockpitFormRightPane;
