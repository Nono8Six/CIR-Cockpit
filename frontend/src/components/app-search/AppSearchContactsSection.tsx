import type { EntityContact } from '@/types';

type AppSearchContactsSectionProps = {
  contacts: EntityContact[];
  entityNameById: Map<string, string>;
  onFocusClient: (clientId: string, contactId?: string | null) => void;
};

const AppSearchContactsSection = ({
  contacts,
  entityNameById,
  onFocusClient
}: AppSearchContactsSectionProps) => {
  if (contacts.length === 0) return null;

  return (
    <div className="space-y-1">
      <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Contacts
      </div>
      {contacts.map((contact) => (
        <button
          key={contact.id}
          type="button"
          className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 text-left transition-colors"
          onClick={() => onFocusClient(contact.entity_id, contact.id)}
        >
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-slate-900 text-sm">
              {(contact.first_name ?? '').trim()} {contact.last_name}
            </span>
            <span className="text-xs text-slate-500">
              {entityNameById.get(contact.entity_id) ?? 'Client'} • {contact.position ?? 'Contact'} • {contact.email ?? contact.phone ?? 'Coordonnées manquantes'}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
};

export default AppSearchContactsSection;
