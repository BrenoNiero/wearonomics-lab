
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  getControls, 
  saveControls, 
  defaultControls, 
  type ControlSettings 
} from '@/lib/controls';
import { rebuildLedgerFromLibrary } from '@/lib/library';
import { useToast } from '@/hooks/use-toast';
import { 
  getEconomics, 
  saveEconomics, 
  defaultEconomics, 
  type EconomicsSettings, 
  type PricingMode,
} from '@/lib/economics';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type ControlId = keyof Omit<ControlSettings, 'validWalkingSpeedBand' | 'cadenceConsistencyCheck'>;

interface ControlItem {
  id: ControlId;
  label: string;
  unit: string;
  explanation: string;
  min: number;
  max: number;
  step: number;
}

const kineticControls: ControlItem[] = [
  {
    id: 'gpsJumpMaxSpeed',
    label: 'GPS Jump Max Speed',
    unit: 'm/s',
    explanation: 'Sets a limit for detecting implausible jumps in GPS position.',
    min: 8.0,
    max: 30.0,
    step: 0.5,
  },
  {
    id: 'segmentGapThreshold',
    label: 'Segment Gap Threshold',
    unit: 'seconds',
    explanation: 'Determines when continuous movement is split into separate segments.',
    min: 30,
    max: 600,
    step: 10,
  },
  {
    id: 'stepsPerMinuteMin',
    label: 'Steps Per Minute Minimum',
    unit: '',
    explanation: 'Sets the lowest cadence considered meaningful walking activity.',
    min: 0,
    max: 80,
    step: 1,
  },
  {
    id: 'stepsPerMinuteMax',
    label: 'Steps Per Minute Maximum',
    unit: '',
    explanation: 'Sets the highest cadence considered plausible for walking.',
    min: 120,
    max: 320,
    step: 1,
  },
];

const classificationControls: ControlItem[] = [
  {
    id: 'sustainedHighSpeedDurationThreshold',
    label: 'Sustained High-Speed Duration',
    unit: 's',
    explanation: 'If movement remains above this speed for longer than this duration, it is classified as vehicle travel.',
    min: 5,
    max: 120,
    step: 1,
  },
  {
    id: 'vehicleSpeedTriggerThreshold',
    label: 'Vehicle Speed Trigger',
    unit: 'm/s',
    explanation: 'Speeds above this level are considered implausible for locomotion and may indicate vehicle movement.',
    min: 2.5,
    max: 12.0,
    step: 0.1,
  },
  {
    id: 'lowSpeedDropToleranceWindow',
    label: 'Low-Speed Drop Tolerance',
    unit: 's',
    explanation: 'Short speed drops below locomotion range are ignored if surrounded by vehicle-level speeds.',
    min: 5,
    max: 60,
    step: 1,
  },
  {
    id: 'accelerationSpikeSensitivity',
    label: 'Acceleration Spike Sensitivity',
    unit: 'm/s²',
    explanation: 'Rapid acceleration beyond this threshold increases vehicle classification confidence.',
    min: 0.5,
    max: 5.0,
    step: 0.1,
  },
];

export default function ControlCenterPage() {
  const [values, setValues] = useState<ControlSettings>(defaultControls.human);
  const [economicsValues, setEconomicsValues] = useState<EconomicsSettings>(defaultEconomics);
  const [isApplying, setIsApplying] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    setValues(getControls('human'));
    setEconomicsValues(getEconomics());
  }, []);

  const handleSliderChange = (id: ControlId, value: number) => {
    const newValues = { ...values, [id]: value };
    setValues(newValues);
    saveControls('human', newValues);
  };

  const handleToggleChange = (id: keyof ControlSettings, checked: boolean) => {
    const newValues = { ...values, [id]: checked };
    setValues(newValues);
    saveControls('human', newValues);
  };

  const handleSpeedBandChange = (newBand: { min: number, max: number }) => {
    const newValues = { ...values, validWalkingSpeedBand: newBand };
    setValues(newValues);
    saveControls('human', newValues);
  };

  const handleEconomicsChange = <K extends keyof EconomicsSettings>(key: K, value: EconomicsSettings[K]) => {
    const newValues = { ...economicsValues, [key]: value };
    setEconomicsValues(newValues);
    saveEconomics(newValues);
  };

  const handleReset = () => {
    setValues(defaultControls.human);
    saveControls('human', defaultControls.human);
    toast({ title: 'Defaults Restored', description: 'Settings for human validation reset to research standards.' });
  };

  const handleApplyChanges = () => {
    setIsApplying(true);
    setTimeout(async () => {
      try {
        await rebuildLedgerFromLibrary();
        toast({ title: 'Protocols Applied', description: 'Datasets recomputed with new validation logic.' });
      } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message });
      } finally {
        setIsApplying(false);
      }
    }, 50);
  };

  return (
    <div className="space-y-16 py-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Control Center</h1>
        <p className="text-sm text-foreground max-w-[600px]">
          Engine protocols and validation logic for research accuracy.
        </p>
      </div>

      <div className="grid gap-16">
        <Card className="border-none bg-transparent shadow-none">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-lg font-medium text-foreground">Movement Validation</CardTitle>
            <CardDescription className="text-xs text-foreground">
              Constraints defining plausible human locomotion evidence.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-12 px-0">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium uppercase tracking-wider text-foreground">
                  Walking Speed Band
                </Label>
                <span className="text-sm font-medium text-foreground tabular-nums">
                  {values.validWalkingSpeedBand.min.toFixed(2)} - {values.validWalkingSpeedBand.max.toFixed(2)} m/s
                </span>
              </div>
              <Slider
                min={0.0} max={12.0} step={0.05}
                value={[values.validWalkingSpeedBand.min, values.validWalkingSpeedBand.max]}
                onValueChange={([min, max]) => handleSpeedBandChange({ min, max })}
              />
              <p className="text-xs text-foreground leading-relaxed">
                Defines the speed range considered valid human movement.
              </p>
            </div>

            <div className="space-y-10">
              {kineticControls.map((control) => (
                <div key={control.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-foreground">{control.label}</Label>
                    <span className="text-sm font-medium text-foreground tabular-nums">
                      {typeof values[control.id] === 'number' ? (values[control.id] as number).toFixed(control.step < 1 ? 1 : 0) : ''} {control.unit}
                    </span>
                  </div>
                  <Slider
                    min={control.min} max={control.max} step={control.step}
                    value={[values[control.id] as number]}
                    onValueChange={([val]) => handleSliderChange(control.id, val)}
                  />
                  <p className="text-xs text-foreground leading-relaxed">
                    {control.explanation}
                  </p>
                </div>
              ))}
            </div>

            <Separator className="opacity-10" />

            <div className="space-y-10">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground">Movement Classification Controls</h3>
                <p className="text-xs text-foreground leading-relaxed">Secondary filters for distinguishing vehicle travel from human locomotion.</p>
              </div>
              
              {classificationControls.map((control) => (
                <div key={control.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-foreground">{control.label}</Label>
                    <span className="text-sm font-medium text-foreground tabular-nums">
                      {typeof values[control.id] === 'number' ? (values[control.id] as number).toFixed(control.step < 1 ? 1 : 0) : ''} {control.unit}
                    </span>
                  </div>
                  <Slider
                    min={control.min} max={control.max} step={control.step}
                    value={[values[control.id] as number]}
                    onValueChange={([val]) => handleSliderChange(control.id, val)}
                  />
                  <p className="text-xs text-foreground leading-relaxed">{control.explanation}</p>
                </div>
              ))}
              
              <div className="flex items-center justify-between pt-4">
                <div className="space-y-0.5">
                  <Label className="text-xs font-medium text-foreground">Cadence Consistency Check</Label>
                  <p className="text-[10px] text-foreground">Validates walking rhythm consistency.</p>
                </div>
                <Switch 
                  checked={values.cadenceConsistencyCheck}
                  onCheckedChange={(checked) => handleToggleChange('cadenceConsistencyCheck', checked)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="px-0 pt-12 flex items-center justify-end gap-4">
            <Button onClick={handleReset} variant="outline" size="sm" className="text-[10px] uppercase tracking-widest px-6 h-8 text-foreground">
              Reset to Defaults
            </Button>
            <Button onClick={handleApplyChanges} disabled={isApplying} size="sm" className="text-[10px] uppercase tracking-widest px-8 h-8 text-background bg-foreground">
              {isApplying ? 'Applying...' : 'Apply Changes'}
            </Button>
          </CardFooter>
        </Card>

        <Separator className="opacity-10" />

        <Card className="economics-controls border-none bg-transparent shadow-none">
          <CardHeader className="px-0">
            <CardTitle className="text-lg font-medium text-foreground">Economics</CardTitle>
            <CardDescription className="text-xs text-foreground">
              Translation of validated movement into ledger value.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-10 px-0">
            <div className="space-y-6">
              <RadioGroup
                value={economicsValues.pricingMode}
                onValueChange={(value) => handleEconomicsChange('pricingMode', value as PricingMode)}
                className="flex flex-wrap gap-8"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fixed" id="fixed" />
                  <Label htmlFor="fixed" className="text-xs text-foreground">Fixed Rate</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="progressive" id="progressive" />
                  <Label htmlFor="progressive" className="text-xs text-foreground">Progressive</Label>
                </div>
              </RadioGroup>

              {economicsValues.pricingMode === 'fixed' && (
                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-foreground">Price per validated minute</Label>
                    <span className="text-sm font-medium text-foreground tabular-nums">{economicsValues.creditRatePerMinute.toFixed(3)} credits</span>
                  </div>
                  <Slider
                    min={0.01} max={0.50} step={0.01}
                    value={[economicsValues.creditRatePerMinute]}
                    onValueChange={([val]) => handleEconomicsChange('creditRatePerMinute', val)}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
