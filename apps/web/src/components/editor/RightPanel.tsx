'use client';
import * as Tabs from '@radix-ui/react-tabs';
import { PropertiesPanel } from './PropertiesPanel';
import { AudioPanel } from './AudioPanel';
import { CaptionPanel } from './CaptionPanel';

export function RightPanel() {
  return (
    <aside className="flex w-[280px] shrink-0 flex-col border-l border-edge bg-surface-1">
      <Tabs.Root defaultValue="clip" className="flex flex-1 flex-col overflow-hidden">
        <Tabs.List className="flex h-10 shrink-0 items-center border-b border-edge px-1 gap-0.5">
          <TabTrigger value="clip">Clip</TabTrigger>
          <TabTrigger value="audio">Audio</TabTrigger>
          <TabTrigger value="captions">Captions</TabTrigger>
        </Tabs.List>

        <Tabs.Content value="clip" className="flex-1 overflow-y-auto data-[state=inactive]:hidden">
          <PropertiesPanel />
        </Tabs.Content>

        <Tabs.Content value="audio" className="flex-1 overflow-y-auto data-[state=inactive]:hidden">
          <AudioPanel />
        </Tabs.Content>

        <Tabs.Content value="captions" className="flex-1 overflow-y-auto data-[state=inactive]:hidden">
          <CaptionPanel />
        </Tabs.Content>
      </Tabs.Root>
    </aside>
  );
}

function TabTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <Tabs.Trigger
      value={value}
      className="flex h-7 items-center rounded-md px-3 text-xs font-medium text-ink-3 transition-colors hover:text-ink-2
        data-[state=active]:bg-surface-2 data-[state=active]:text-ink-1"
    >
      {children}
    </Tabs.Trigger>
  );
}
