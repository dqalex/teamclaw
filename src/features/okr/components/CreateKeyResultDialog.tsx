'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog';

interface CreateKeyResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { title: string; targetValue: number; unit?: string; description?: string }) => void;
  loading?: boolean;
}

export function CreateKeyResultDialog({ open, onOpenChange, onSubmit, loading }: CreateKeyResultDialogProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [unit, setUnit] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!title.trim() || !targetValue) return;
    onSubmit({
      title: title.trim(),
      targetValue: parseFloat(targetValue),
      unit: unit.trim() || undefined,
      description: description.trim() || undefined,
    });
    setTitle('');
    setTargetValue('');
    setUnit('');
    setDescription('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark:bg-gray-900 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-green-500" />
            {t('okr.createKeyResult')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>{t('okr.keyResultTitle')}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('okr.keyResultTitle')}
              className="mt-1 dark:bg-gray-800 dark:border-gray-600"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label>{t('okr.targetValue')}</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="100"
                className="mt-1 dark:bg-gray-800 dark:border-gray-600"
              />
            </div>
            <div className="w-24">
              <Label>{t('okr.unit')}</Label>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="%"
                className="mt-1 dark:bg-gray-800 dark:border-gray-600"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t('okr.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || !targetValue || loading}>
            {t('okr.createKeyResult')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
