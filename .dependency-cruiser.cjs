/**
 * Dependency Cruiser 配置
 * 用于检查项目依赖关系和架构规则
 */

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // 禁止循环依赖（排除已通过动态导入修复的已知循环）
    {
      name: 'no-circular',
      severity: 'error',
      comment: '禁止模块间循环依赖',
      from: {
        // 排除已知的、通过动态导入修复的循环依赖
        // delivery.handler <-> server-gateway-client <-> chat-channel/executor 循环已通过动态导入解除
        pathNot: '^(app/api/mcp/handlers/delivery\.handler|lib/server-gateway-client|lib/chat-channel/executor)'
      },
      to: { circular: true }
    },
    // 禁止直接访问 node_modules
    {
      name: 'no-orphans',
      severity: 'warn',
      comment: '孤立文件 - 未被任何模块引用',
      from: { orphan: true },
      to: {}
    },
    // 禁止跨层访问 (架构规则)
    {
      name: 'no-app-to-scripts',
      severity: 'error',
      comment: 'app 不应该直接引用 scripts',
      from: { path: '^app' },
      to: { path: '^scripts' }
    },
    {
      name: 'no-store-to-db-direct',
      severity: 'warn',
      comment: 'store 应该通过 lib/data-service 访问数据，而不是直接访问 db',
      from: { path: '^store' },
      to: { path: '^db', pathNot: '^db/schema' }
    },
    // 禁止组件直接访问 lib 内部
    {
      name: 'components-access-pattern',
      severity: 'info',
      comment: 'components 应该通过 lib/index 访问工具函数',
      from: { path: '^components' },
      to: { path: '^lib/.*', pathNot: '^lib/(auth|i18n|data-service|gateway-proxy|id|sanitize|event-bus)' }
    }
  ],
  options: {
    doNotFollow: {
      path: 'node_modules'
    },
    exclude: {
      path: ['\.d\.ts$', 'tests/', '__mocks__/', 'scripts/']
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json'
    }
  }
};
