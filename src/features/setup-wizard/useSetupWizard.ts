'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/domains/project/store';

// ============================================================
// 类型定义
// ============================================================
export type WizardStep = 'welcome' | 'team' | 'gateway' | 'complete';

export interface SetupFormData {
  projectName: string;
  description: string;
  adminName: string;
  adminEmail: string;
  teamName: string;
  gatewayUrl: string;
  gatewayToken: string;
}

// 设置完成标志键名
const SETUP_COMPLETED_KEY = 'setup_completed';

// 步骤顺序
const STEP_ORDER: WizardStep[] = ['welcome', 'team', 'gateway', 'complete'];

// ============================================================
// Hook：设置向导状态管理
// ============================================================
export function useSetupWizard() {
  const router = useRouter();
  const createProject = useProjectStore((s) => s.createProject);
  const submittedByEnterRef = useRef(false);

  // 当前步骤
  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');

  // 表单数据
  const [formData, setFormData] = useState<SetupFormData>({
    projectName: '',
    description: '',
    adminName: '',
    adminEmail: '',
    teamName: '',
    gatewayUrl: '',
    gatewayToken: '',
  });

  // 提交状态
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 当前步骤索引
  const currentIndex = STEP_ORDER.indexOf(currentStep);

  // 更新表单字段
  const updateField = useCallback(<K extends keyof SetupFormData>(field: K, value: SetupFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }, []);

  // 进入下一步
  const goNext = useCallback(() => {
    if (submittedByEnterRef.current) return;
    submittedByEnterRef.current = true;
    setTimeout(() => { submittedByEnterRef.current = false; }, 300);

    if (currentIndex < STEP_ORDER.length - 1) {
      setCurrentStep(STEP_ORDER[currentIndex + 1]);
    }
  }, [currentIndex]);

  // 返回上一步
  const goBack = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentStep(STEP_ORDER[currentIndex - 1]);
    }
  }, [currentIndex]);

  // 跳转到指定步骤
  const skipTo = useCallback((step: WizardStep) => {
    setCurrentStep(step);
  }, []);

  // 提交设置（创建项目）
  const submitSetup = useCallback(async () => {
    if (!formData.projectName.trim()) {
      setError('Project name is required');
      return false;
    }

    setSubmitting(true);
    setError(null);

    try {
      const project = await createProject({
        name: formData.projectName.trim(),
        description: formData.description.trim() || undefined,
      });

      if (project) {
        // 设置完成标志
        localStorage.setItem(SETUP_COMPLETED_KEY, 'true');
        // 跳转到仪表盘
        router.push('/');
        return true;
      } else {
        setError('Failed to create project');
        return false;
      }
    } catch {
      setError('Failed to create project');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [formData.projectName, formData.description, createProject, router]);

  // 检查是否需要显示向导
  const shouldShowWizard = useCallback((): boolean => {
    // 已完成设置则不显示
    if (localStorage.getItem(SETUP_COMPLETED_KEY) === 'true') {
      return false;
    }
    // 已有项目则不显示
    if (useProjectStore.getState().projects.length > 0) {
      return false;
    }
    return true;
  }, []);

  // 跳过所有步骤直接开始
  const skipAll = useCallback(async () => {
    // 使用默认名称创建项目
    setSubmitting(true);
    try {
      const project = await createProject({
        name: formData.projectName.trim() || 'My First Project',
        description: formData.description.trim() || undefined,
      });

      if (project) {
        localStorage.setItem(SETUP_COMPLETED_KEY, 'true');
        router.push('/');
      }
    } catch {
      // 静默失败，跳转到完成页
    } finally {
      setSubmitting(false);
    }
  }, [formData.projectName, formData.description, createProject, router]);

  return {
    // 状态
    currentStep,
    currentIndex,
    formData,
    submitting,
    error,
    totalSteps: STEP_ORDER.length,

    // 操作
    updateField,
    goNext,
    goBack,
    skipTo,
    submitSetup,
    skipAll,
    shouldShowWizard,
    setError,
  };
}
