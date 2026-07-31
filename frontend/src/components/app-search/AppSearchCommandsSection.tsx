import { APP_COMMAND_GROUP_LABELS, type AppCommand, type AppCommandGroup } from '@/app/appCommands';
import AppSearchGroup from './AppSearchGroup';
import AppSearchRow from './AppSearchRow';

type AppSearchCommandsSectionProps = {
  commands: AppCommand[];
  onRunCommand: (command: AppCommand) => void;
};

const GROUP_ORDER: AppCommandGroup[] = ['creation', 'navigation'];

const AppSearchCommandsSection = ({ commands, onRunCommand }: AppSearchCommandsSectionProps) => {
  if (commands.length === 0) return null;

  return (
    <>
      {GROUP_ORDER.map((group) => {
        const groupCommands = commands.filter((command) => command.group === group);
        if (groupCommands.length === 0) return null;

        return (
          <AppSearchGroup key={group} heading={APP_COMMAND_GROUP_LABELS[group]}>
            {groupCommands.map((command) => (
              <AppSearchRow
                key={command.id}
                value={`${command.label} ${command.hint} ${command.keywords}`}
                onSelect={() => onRunCommand(command)}
                icon={command.icon}
                label={command.label}
                detail={command.hint}
                meta={command.shortcut}
                testId={`app-search-command-${command.id}`}
              />
            ))}
          </AppSearchGroup>
        );
      })}
    </>
  );
};

export default AppSearchCommandsSection;
