# TeamClaw 脚本工具集

本目录包含 TeamClaw 项目的各种自动化脚本工具，按用途分类如下。

---

## 📋 脚本概览

| # | 脚本 | 分类 | 说明 |
|---|------|------|------|
| 1 | `deploy.sh` | 🚀 部署 | 生产环境 6 步部署 |
| 2 | `restart-dev.sh` | 🔄 开发 | 开发服务器重启（kill+清缓存+启动） |
| 3 | `init-db.ts` | 🗄️ 数据库 | 创建初始化数据库（含内置文档+模板） |
| 4 | `add-indexes.ts` | 🗄️ 数据库 | 高频查询字段添加索引 |
| 5 | `seed-templates.ts` | 🗄️ 数据库 | 向已有 DB 插入内置 SOP/渲染模板 |
| 6 | `update-init-db.ts` | 🗄️ 数据库 | 更新初始化 DB 中的内置模板 |
| 7 | `reset-admin-password.ts` | 🗄️ 数据库 | 重置用户密码 |
| 8 | `import-wiki-docs.ts` | 📥 导入 | 将项目文档导入为 Wiki |
| 9 | `sync-landing.ts` | 📥 同步 | 从 MD 文件同步 Landing Page 到 DB |
| 10 | `update-landing-screenshots.ts` | 📥 同步 | 更新 Landing Page 截图内容 |
| 11 | `generate-architecture-docs-v2.ts` | 📝 生成 | 扫描项目结构生成架构文档 HTML |
| 12 | `generate-demo-data.ts` | 📝 生成 | 生成演示数据（用户/项目/任务等） |
| 13 | `generate-screenshots.ts` | 📝 生成 | 截图生成入口（环境检查） |
| 14 | `run-screenshots.ts` | 📝 生成 | Playwright 执行截图 |
| 15 | `diagnose.ts` | 🔍 诊断 | 项目健康诊断（P0-P3 级检查） |
| 16 | `check-i18n.ts` | 🔍 诊断 | i18n 翻译完整性检查（支持 `--fix`） |
| 17 | `audit-test-coverage.ts` | 🔍 诊断 | 测试覆盖率审计矩阵报告 |
| 18 | `fix-imports.js` | 🔧 工具 | 修复 API route 的 schema 导入路径 |
| 19 | `test-skillhub-api.ts` | 🧪 测试 | SkillHub API 集成测试（遗留，迁移中） |

---

## 🚀 部署脚本

### `deploy.sh`
**生产部署脚本** — 完整的 6 步部署流程

```bash
# 设置环境变量
export DEPLOY_SERVER="root@43.167.204.230"
export DEPLOY_PATH="/root/comind"

# 完整部署
./scripts/deploy.sh

# 跳过本地构建
./scripts/deploy.sh --skip-build
```

**6 步流程**：本地构建 → rsync 同步 → 服务器构建 → 复制静态文件 → 复制外部依赖 → 重启 PM2

| 环境变量 | 必需 | 说明 | 默认值 |
|----------|------|------|--------|
| `DEPLOY_SERVER` | ✅ | SSH 地址 | - |
| `DEPLOY_PATH` | ❌ | 远程路径 | `/root/teamclaw` |
| `DEPLOY_NVM_DIR` | ❌ | nvm 目录 | `/root/.nvm` |

---

## 🔄 开发脚本

### `restart-dev.sh`
**开发服务器重启** — 一键执行标准 4 步重启

```bash
./scripts/restart-dev.sh
```

适用场景：安装新依赖、修改 schema、添加/删除 API 路由、构建缓存问题

---

## 🗄️ 数据库脚本

### `init-db.ts`
创建包含内置文档和模板的初始化数据库（首次部署用）

```bash
npx tsx scripts/init-db.ts
```

**输出**: `data/init/teamclaw-init.db`

### `add-indexes.ts`
为高频查询字段添加索引，自动跳过已存在索引

```bash
npx tsx scripts/add-indexes.ts
```

### `seed-templates.ts`
向运行中的数据库插入内置 SOP / 渲染模板

```bash
npx tsx scripts/seed-templates.ts
```

### `update-init-db.ts`
更新 `data/init/teamclaw-init.db` 中的内置模板（不影响运行中 DB）

```bash
npx tsx scripts/update-init-db.ts
```

### `reset-admin-password.ts`
重置指定用户的密码

```bash
npx tsx scripts/reset-admin-password.ts
```

---

## 📥 数据导入/同步脚本

### `import-wiki-docs.ts`
将项目文档（用户手册、开发手册、API 文档）导入为 Wiki 文档

```bash
npx tsx scripts/import-wiki-docs.ts
```

### `sync-landing.ts`
从 `docs/landing/*.md` 同步 Landing Page 内容到数据库

```bash
npx tsx scripts/sync-landing.ts
```

### `update-landing-screenshots.ts`
更新 Landing Page 的截图引用内容

```bash
npx tsx scripts/update-landing-screenshots.ts
```

---

## 📝 生成脚本

### `generate-architecture-docs-v2.ts`
扫描项目结构，生成架构文档 HTML

```bash
npx tsx scripts/generate-architecture-docs-v2.ts
```

### `generate-demo-data.ts`
生成完整的演示数据（用户、项目、任务、文档、成员等）

```bash
npx tsx scripts/generate-demo-data.ts
```

### `generate-screenshots.ts` + `run-screenshots.ts`
截图生成工具对：
- `generate-screenshots.ts` — 入口脚本，检查环境
- `run-screenshots.ts` — Playwright 执行器，实际截图

```bash
npx tsx scripts/generate-screenshots.ts
```

---

## 🔍 诊断/审计脚本

### `diagnose.ts`
项目健康诊断，按 P0-P3 优先级检查

```bash
npx tsx scripts/diagnose.ts
```

| 优先级 | 检查内容 |
|--------|----------|
| P0 | TypeScript 类型错误、ESLint 错误、安全漏洞 |
| P1 | 测试失败率、P1 级技术债 |
| P2 | 文件行数超标（>800行）、useMemo 缺失 |
| P3 | i18n 命名空间未指定 |

**输出**: `logs/diagnostic-report.md`

### `check-i18n.ts`
i18n 翻译完整性检查

```bash
npx tsx scripts/check-i18n.ts           # 检查
npx tsx scripts/check-i18n.ts --fix     # 生成修复代码
npx tsx scripts/check-i18n.ts --verbose # 详细输出
```

### `audit-test-coverage.ts`
测试覆盖率审计，扫描 256 个模块对比 54 个测试文件

```bash
npx tsx scripts/audit-test-coverage.ts             # 终端输出
npx tsx scripts/audit-test-coverage.ts --markdown   # 生成 MD 报告
npx tsx scripts/audit-test-coverage.ts --json       # JSON 格式
```

**输出**: `docs/test-coverage-audit.md`

---

## 🔧 工具脚本

### `fix-imports.js`
自动修复 API route 文件中的 schema 导入路径

```bash
node scripts/fix-imports.js
```

---

## 🧪 测试脚本（遗留）

### `test-skillhub-api.ts`
SkillHub API 集成测试（使用自定义测试框架）。已有 Vitest 版本：`tests/integration/skillhub-api.test.ts`

```bash
npx tsx scripts/test-skillhub-api.ts
```

> ⚠️ 此脚本计划废弃，建议使用 `npx vitest run tests/integration/skillhub-api.test.ts`

---

## 常用工作流

### 首次部署
```bash
npx tsx scripts/init-db.ts       # 创建初始化数据库
export DEPLOY_SERVER="root@your-server"
./scripts/deploy.sh              # 部署到服务器
```

### 日常开发
```bash
./scripts/restart-dev.sh         # 重启开发服务器
npx tsx scripts/sync-landing.ts  # 同步 Landing Page
npx tsx scripts/diagnose.ts      # 项目诊断
npx tsx scripts/check-i18n.ts    # i18n 检查
```

### 质量保证
```bash
npx tsx scripts/audit-test-coverage.ts --markdown  # 测试覆盖审计
npx tsx scripts/diagnose.ts                         # 项目诊断
npx tsx scripts/check-i18n.ts --fix                 # 修复缺失翻译
```

---

## 环境要求

- **TypeScript 脚本**: Node.js 18+, `tsx` (`npm install -g tsx`)
- **Shell 脚本**: Bash, `rsync`, SSH 免密登录
- **截图脚本**: Playwright 已安装 (`npx playwright install`)

---

## 注意事项

1. **生产部署**必须使用 `deploy.sh`，**禁止手动执行构建命令**
2. **数据库脚本**执行前请备份重要数据
3. 所有脚本应在项目根目录下执行

---

*更新日期: 2026-03-13*
