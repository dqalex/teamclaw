'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Check } from 'lucide-react';
import { useSetupWizard } from './useSetupWizard';
import { WelcomeStep } from './WelcomeStep';
import { TeamStep } from './TeamStep';
import { GatewayStep } from './GatewayStep';
import { CompletionStep } from './CompletionStep';
import clsx from 'clsx';

// ============================================================
// 步骤指示器组件
// ============================================================
function StepIndicator({
  steps,
  currentIndex,
}: {
  steps: { key: string; label: string }[];
  currentIndex: number;
}) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={step.key} className="flex items-center">
            {/* 步骤节点 */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all',
                  isCurrent && 'ring-2 ring-blue-500 ring-offset-1',
                )}
                style={{
                  backgroundColor: isCompleted || isCurrent
                    ? 'var(--accent-primary, #3b82f6)'
                    : 'var(--bg-tertiary, var(--border))',
                  color: isCompleted || isCurrent ? '#fff' : 'var(--text-tertiary)',
                }}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <span
                className={clsx(
                  'text-xs transition-colors',
                  isCurrent ? 'font-medium' : 'font-normal',
                )}
                style={{
                  color: isCurrent ? 'var(--text-primary)' : 'var(--text-tertiary)',
                }}
              >
                {step.label}
              </span>
            </div>

            {/* 步骤之间的连线 */}
            {index < steps.length - 1 && (
              <div
                className="w-12 h-0.5 mx-2 mb-5"
                style={{
                  backgroundColor: index < currentIndex
                    ? 'var(--accent-primary, #3b82f6)'
                    : 'var(--border)',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// 主组件：SetupWizard
// ============================================================
export function SetupWizard() {
  const { t } = useTranslation();
  const {
    currentStep,
    currentIndex,
    formData,
    submitting,
    error,
    totalSteps,
    updateField,
    goNext,
    goBack,
    skipTo,
    submitSetup,
    skipAll,
    setError,
  } = useSetupWizard();

  // 验证状态（用于控制 Next 按钮可用性）
  const [isValid, setIsValid] = useState(false);

  const handleValidate = useCallback((valid: boolean) => {
    setIsValid(valid);
  }, []);

  // 步骤配置
  const steps = [
    { key: 'welcome', label: t('setupWizard.stepWelcome') },
    { key: 'team', label: t('setupWizard.stepTeam') },
    { key: 'gateway', label: t('setupWizard.stepGateway') },
    { key: 'complete', label: t('setupWizard.stepComplete') },
  ];

  // 渲染当前步骤内容
  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <WelcomeStep
            formData={formData}
            updateField={updateField}
            error={error}
            onValidate={handleValidate}
          />
        );
      case 'team':
        return (
          <TeamStep
            formData={formData}
            updateField={updateField}
            onSkip={() => skipTo('gateway')}
          />
        );
      case 'gateway':
        return (
          <GatewayStep
            formData={formData}
            updateField={updateField}
            onSkip={() => skipTo('complete')}
          />
        );
      case 'complete':
        return (
          <CompletionStep
            formData={formData}
            submitting={submitting}
            onSubmit={submitSetup}
            onSkipAll={skipAll}
          />
        );
      default:
        return null;
    }
  };

  // 是否显示导航按钮
  const showNavigation = currentStep !== 'complete';

  // 返回按钮是否可用
  const canGoBack = currentIndex > 0 && currentStep !== 'complete';

  // 下一步按钮是否可用
  const canGoNext = currentStep === 'welcome'
    ? isValid
    : true;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--background)' }}
    >
      <div className="w-full max-w-2xl">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h1
            className="text-2xl font-bold mb-1"
            style={{ color: 'var(--text-primary)' }}
          >
            {t('setupWizard.title')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            {t('setupWizard.subtitle')}
          </p>
        </div>

        {/* 步骤指示器 */}
        <StepIndicator steps={steps} currentIndex={currentIndex} />

        {/* 步骤内容卡片 */}
        <Card>
          <CardContent className="pt-6">
            {/* 步骤标题 */}
            <div className="mb-6">
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {t('setupWizard.stepOf', { current: currentIndex + 1, total: totalSteps })}
              </p>
              <h2
                className="text-lg font-bold mt-1"
                style={{ color: 'var(--text-primary)' }}
              >
                {steps[currentIndex]?.label}
              </h2>
            </div>

            {/* 步骤内容 */}
            {renderStep()}

            {/* 导航按钮 */}
            {showNavigation && (
              <div className="flex items-center justify-between mt-8 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
                <div>
                  {canGoBack && (
                    <Button variant="ghost" size="sm" onClick={goBack}>
                      {t('common.back')}
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* 团队和网关步骤提供跳过选项 */}
                  {currentStep !== 'welcome' && (
                    <Button variant="ghost" size="sm" onClick={goNext}>
                      {t('common.skip')}
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setError(null);
                      goNext();
                    }}
                    disabled={!canGoNext}
                  >
                    {t('common.next')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
