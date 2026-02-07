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
  statusField,
  statusGroups,
  hasStatuses,
  statusHelpId,
  onSetReminder,
  onReset
}: CockpitFormRightPaneProps) => {
  return (
    <div className="col-span-12 md:col-span-7 p-5 flex flex-col gap-5 overflow-y-auto">
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
        statusField={statusField}
        statusGroups={statusGroups}
        hasStatuses={hasStatuses}
        statusHelpId={statusHelpId}
        onSetReminder={onSetReminder}
        onReset={onReset}
      />
      {errors.status_id ? (
        <p className="text-[11px] text-red-600" role="status" aria-live="polite">
          {errors.status_id.message}
        </p>
      ) : null}
    </div>
  );
};

export default CockpitFormRightPane;
