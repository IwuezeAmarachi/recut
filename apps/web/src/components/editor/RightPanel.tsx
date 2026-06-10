'use client';
import * as Tabs from '@radix-ui/react-tabs';
import { Film, Volume2, Captions, Image } from 'lucide-react';
import { PropertiesPanel } from './PropertiesPanel';
import { AudioPanel } from './AudioPanel';
import { CaptionPanel } from './CaptionPanel';
import { BackgroundPanel } from './BackgroundPanel';

const TABS = [
  { value: 'clip',       icon: Film,     label: 'Clip'       },
  { value: 'audio',      icon: Volume2,  label: 'Audio'      },
  { value: 'captions',   icon: Captions, label: 'Captions'   },
  { value: 'background', icon: Image,    label: 'Background' },
] as const;

export function RightPanel() {
  return (
    <aside className="flex w-[280px] shrink-0 flex-col border-l border-edge bg-surface-1">
      <Tabs.Root defaultValue="clip" className="flex flex-1 flex-col overflow-hidden">
        {/* Icon tab bar */}
        <Tabs.List className="flex shrink-0 items-center border-b border-edge bg-surface-1 px-2 py-1.5 gap-0.5">
          {TABS.map(({ value, icon: Icon, label }) => (
            <Tabs.Trigger
              key={value}
              value={value}
              title={label}
              className="group relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-ink-3 transition-all duration-150
                hover:text-ink-2
                data-[state=active]:bg-surface-3 data-[state=active]:text-ink-1"
            >
              <Icon size={15} strokeWidth={1.75} />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Tabs.Trigger>
          ))}
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

        <Tabs.Content value="background" className="flex-1 overflow-y-auto data-[state=inactive]:hidden">
          <BackgroundPanel />
        </Tabs.Content>
      </Tabs.Root>
    </aside>
  );
}
