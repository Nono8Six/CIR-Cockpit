import { APP_COMMAND_GROUP_LABELS, type AppCommand, type AppCommandGroup } from '@/app/appCommands';
import { Kbd } from '../ui/data-display/Kbd';
import { CommandGroup, CommandItem } from '../ui/inputs/selects/Command';

type AppSearchCommandsSectionProps = {
  commands: AppCommand[];
  onRunCommand: (command: AppCommand) => void;
};

const GROUP_ORDER: AppCommandGroup[] = ['navigation', 'creation'];

const AppSearchCommandsSection = ({ commands, onRunCommand }: AppSearchCommandsSectionProps) => {
  if (commands.length === 0) return null;

  return (
    <>
      {GROUP_ORDER.map((group) => {
        const groupCommands = commands.filter((command) => command.group === group);
        if (groupCommands.length === 0) return null;

        return (
          <CommandGroup key={group} heading={APP_COMMAND_GROUP_LABELS[group]}>
            {groupCommands.map((command) => {
              const Icon = command.icon;

              return (
                <CommandItem
                  key={command.id}
                  value={`${command.label} ${command.hint} ${command.keywords}`}
                  onSelect={() => onRunCommand(command)}
                  className="gap-3 px-3 py-2"
                  data-testid={`app-search-command-${command.id}`}
                >
                  <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium text-foreground">{command.label}</span>
                    <span className="truncate text-xs text-muted-foreground">{command.hint}</span>
                  </div>
                  {command.shortcut ? (
                    <Kbd className="shrink-0">{command.shortcut}</Kbd>
                  ) : null}
                </CommandItem>
              );
            })}
          </CommandGroup>
        );
      })}
    </>
  );
};

export default AppSearchCommandsSection;
