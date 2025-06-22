import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  Label,
  cn,
} from '@redplanethq/ui';
import { useTheme } from 'next-themes';
import React from 'react';
import { useDebouncedCallback } from 'use-debounce';

import { SettingSection } from 'modules/settings/setting-section';

import { useUpdateWorkspaceMutation } from 'services/workspace';

import { UserContext } from 'store/user-context';

type SliderProps = React.ComponentProps<typeof Slider>;
function SliderControl({ className, ...props }: SliderProps) {
  return (
    <Slider
      defaultValue={[50]}
      max={100}
      step={1}
      className={cn('w-full', className)}
      {...props}
    />
  );
}

export function Preferences() {
  const { theme, setTheme } = useTheme();

  const user = React.useContext(UserContext);
  const preferences = user.workspace.preferences;
  const { mutate: updateWorkspace } = useUpdateWorkspaceMutation({});

  // For demonstration, use local state for personality sliders.
  // In a real app, these would be loaded from/saved to user preferences.
  const [autonomy, setAutonomy] = React.useState(preferences.autonomy ?? 50);
  const [tone, setTone] = React.useState(preferences.tone ?? 50);

  // Debounced updateWorkspace for personality changes
  const debouncedUpdateWorkspace = useDebouncedCallback(
    (key: string, value: number) => {
      updateWorkspace({
        name: user.workspace.name,
        workspaceId: user.workspace.id,
        preferences: {
          ...preferences,
          [key]: value,
        },
      });
    },
    400, // 400ms debounce
  );

  // Handler to save personality settings
  const handlePersonalityChange = (key: string, value: number) => {
    // Update local state
    if (key === 'autonomy') {
      setAutonomy(value);
    }
    if (key === 'tone') {
      setTone(value);
    }

    // Persist to backend/user context (debounced)
    debouncedUpdateWorkspace(key, value);
  };

  return (
    <div className="flex flex-col gap-4 w-3xl mx-auto px-4 py-6">
      <SettingSection
        title="Theme"
        description="Choose a preferred theme for the app."
      >
        <Select
          value={theme}
          onValueChange={(value: string) => {
            setTheme(value);
          }}
        >
          <SelectTrigger className="w-[180px]" showIcon={false}>
            <SelectValue placeholder="Select your theme" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </SettingSection>

      <SettingSection
        title="Personality"
        description="Adjust the personality of your assistant."
      >
        <div className="mb-4 text-muted-foreground max-w-2xl">
          These settings control how your assistant interacts with you. Adjust
          autonomy, tone, and playfulness to match your preferred style.
        </div>
        <div className="flex flex-col gap-8">
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="autonomy-slider" className="font-medium">
                Autonomy
              </Label>
              <div className="text-xs text-muted-foreground">
                Controls how proactive the assistant should be.
              </div>
            </div>
            <SliderControl
              id="autonomy-slider"
              min={0}
              max={100}
              step={1}
              value={[autonomy]}
              onValueChange={(value) =>
                handlePersonalityChange('autonomy', value[0])
              }
            />
            <div className="flex justify-between text-xs mt-1 text-muted-foreground">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="tone-slider" className="font-medium">
                Tone
              </Label>
              <div className="text-xs text-muted-foreground">
                Controls formality and warmth.
              </div>
            </div>
            <SliderControl
              id="tone-slider"
              className=""
              min={0}
              max={100}
              step={1}
              value={[tone]}
              onValueChange={(value) =>
                handlePersonalityChange('tone', value[0])
              }
            />
            <div className="flex justify-between text-xs mt-1 text-muted-foreground">
              <span>Formal</span>
              <span>Balanced</span>
              <span>Casual</span>
            </div>
          </div>
        </div>
      </SettingSection>
    </div>
  );
}
