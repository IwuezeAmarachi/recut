'use client';
import * as Tabs from '@radix-ui/react-tabs';
import { PropertiesPanel } from './PropertiesPanel';
import { AudioPanel } from './AudioPanel';
import { CaptionPanel } from './CaptionPanel';

export function RightPanel() {
  return (
    <aside className="flex w-[280px] shrink-0 flex-col border-l border-edge bg-surface-1">
      <Tabs.Root defaultValue="clip" className="flex flex-1 flex-col overflow-hidden">
        {/* iOS-style segmented tab bar */}
        <Tabs.List className="flex shrink-0 items-center gap-1 border-b border-edge bg-surface-1 px-3 py-2">
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
      className="flex-1 h-7 rounded-lg text-2xs font-semibold text-ink-3 transition-all duration-150
        hover:text-ink-2
        data-[state=active]:bg-surface-3 data-[state=active]:text-ink-1 data-[state=active]:shadow-sm"
    >
      {children}
    </Tabs.Trigger>
  );
}
