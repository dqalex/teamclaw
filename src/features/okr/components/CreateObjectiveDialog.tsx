'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Target } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog';

interface CreateObjectiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { title: string; description?: string; dueDate?: string }) => void;
  loading?: boolean;
}

export function CreateObjectiveDialog({ open, onOpenChange, onSubmit, loading }: CreateObjectiveDialogProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate: dueDate || undefined,
    });
    setTitle('');
    setDescription('');
    setDueDate('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark:bg-gray-900 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            {t('okr.createObjective')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>{t('okr.objectiveTitle')}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('okr.objectiveTitle')}
              className="mt-1 dark:bg-gray-800 dark:border-gray-600"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <div>
            <Label>{t('okr.objectiveDescription')}</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('okr.objectiveDescription')}
              className="mt-1 dark:bg-gray-800 dark:border-gray-600"
            />
          </div>
          <div>
            <Label>{t('okr.dueDate')}</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 dark:bg-gray-800 dark:border-gray-600"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t('okr.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || loading}>
            {t('okr.createObjective')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
