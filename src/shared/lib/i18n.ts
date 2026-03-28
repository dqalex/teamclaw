/**
 * 国际化配置 - 动态语言包加载
 *
 * 支持能力：
 * 1. 内置语言包按需异步加载（en / zh）
 * 2. 用户自定义语言包导入（JSON 格式，通过 registerCustomLanguage）
 * 3. 语言变更事件广播（供非 React 组件监听）
 * 4. 运行时动态注册新语言，无需改代码
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

/** 语言变更事件名（用于 SecurityCodeSettings 等非 React 组件） */
export const LANGUAGE_CHANGE_EVENT = 'language-change';

/**
 * 语言包加载器
 * 内置语言：en / zh 通过动态 import 加载
 * 自定义语言：通过 registerCustomLanguage 注册后缓存
 */
const customLanguages = new Map<string, Record<string, unknown>>();

const loadLanguageResources = async (lng: string): Promise<Record<string, unknown>> => {
  // 优先检查用户自定义语言包
  const custom = customLanguages.get(lng);
  if (custom) return custom;

  // 内置语言包通过动态 import 按需加载
  switch (lng) {
    case 'zh':
      return (await import('./locales/zh')).default;
    case 'en':
    default:
      return (await import('./locales/en')).default;
  }
};

// 检测语言
const detectLanguage = (): string => {
  if (typeof window === 'undefined') return 'en';

  // 兼容旧版 localStorage key
  const legacy = localStorage.getItem('teamclaw-language');
  if (legacy) return legacy;

  const saved = localStorage.getItem('i18nextLng');
  if (saved) return saved;

  const browserLang = navigator.language || (navigator as { userLanguage?: string }).userLanguage;
  if (browserLang?.startsWith('zh')) return 'zh';

  return 'en';
};

/** 广播语言变更事件 */
function broadcastLanguageChange(lng: string): void {
  if (typeof window === 'undefined') return;
  // 写入两个 key 以兼容旧版组件
  localStorage.setItem('i18nextLng', lng);
  localStorage.setItem('teamclaw-language', lng);
  window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGE_EVENT, { detail: { lng } }));
}

// 初始化 i18n（异步）
export const initI18n = async (): Promise<typeof i18n> => {
  const lng = detectLanguage();

  try {
    const resources = await loadLanguageResources(lng);

    await i18n.use(initReactI18next).init({
      lng,
      fallbackLng: 'en',
      resources: {
        [lng]: { translation: resources }
      },
      interpolation: {
        escapeValue: false,
      },
    });

    return i18n;
  } catch (error) {
    console.error('[i18n] Failed to load resources:', error);
    // 回退初始化
    await i18n.use(initReactI18next).init({
      lng: 'en',
      fallbackLng: 'en',
      resources: {},
    });
    return i18n;
  }
};

// 切换语言
export const changeLanguage = async (lng: string): Promise<void> => {
  try {
    // 检查资源是否已加载
    if (!i18n.hasResourceBundle(lng, 'translation')) {
      const resources = await loadLanguageResources(lng);
      i18n.addResourceBundle(lng, 'translation', resources);
    }
    await i18n.changeLanguage(lng);
    broadcastLanguageChange(lng);
  } catch (error) {
    console.error(`[i18n] Failed to change language to ${lng}:`, error);
  }
};

/**
 * 注册自定义语言包
 * 用户可通过此接口导入第三方或自定义的翻译 JSON
 *
 * @param lng - 语言代码（如 'ja', 'ko', 'fr' 等）
 * @param resources - 翻译资源对象（与内置格式一致，按模块嵌套）
 * @returns 当前已注册的所有自定义语言代码
 *
 * @example
 * ```ts
 * import { registerCustomLanguage } from '@/lib/i18n';
 *
 * // 加载日语语言包
 * const jaResources = await import('./locales/ja.json');
 * registerCustomLanguage('ja', jaResources.default);
 *
 * // 切换到日语
 * await changeLanguage('ja');
 * ```
 */
export const registerCustomLanguage = (
  lng: string,
  resources: Record<string, unknown>,
): string[] => {
  customLanguages.set(lng, resources);

  // 如果 i18n 已初始化，预加载资源以便随时切换
  if (i18n.isInitialized) {
    i18n.addResourceBundle(lng, 'translation', resources);
  }

  return Array.from(customLanguages.keys());
};

/**
 * 获取已注册的所有语言代码（内置 + 自定义）
 */
export const getAvailableLanguages = (): string[] => {
  const builtIn = ['en', 'zh'];
  const custom = Array.from(customLanguages.keys());
  return [...builtIn, ...custom];
};

// 导出 i18n 实例（注意：此时可能还未初始化，需要调用 initI18n）
export default i18n;
