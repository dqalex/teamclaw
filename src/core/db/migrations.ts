import Database from 'better-sqlite3';
import { isUuidFormat, uuidToBase58 } from '@/shared/lib/id';

/**
 * UUID → Base58 ID 迁移
 * 自动检测并转换数据库中所有 UUID 格式的 ID
 * 
 * 从 db/index.ts 拆分出来以控制文件大小
 */
export function migrateUuidToBase58(sqlite: Database.Database) {
  // 检查是否已有迁移记录
  const metaTable = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='migration_meta'").get();
  if (metaTable) {
    const migrated = sqlite.prepare("SELECT value FROM migration_meta WHERE key = 'uuid_to_base58'").get() as { value: string } | undefined;
    if (migrated?.value === 'done') {
      return; // 已完成迁移
    }
  }
  
  // 检查是否有需要迁移的 UUID
  const hasUuid = sqlite.prepare("SELECT id FROM documents WHERE id LIKE '%-%-%-%-%' LIMIT 1").get();
  if (!hasUuid) {
    return; // 没有需要迁移的数据
  }
  
  console.debug('[TeamClaw] Migrating: UUID → Base58 ID conversion...');
  
  // ID 映射表（UUID → Base58）
  const idMap = new Map<string, string>();
  
  // 辅助函数：转换 ID
  const convertId = (id: string | null): string | null => {
    if (!id) return null;
    if (isUuidFormat(id)) {
      let newId = idMap.get(id);
      if (!newId) {
        newId = uuidToBase58(id);
        idMap.set(id, newId);
      }
      return newId;
    }
    return id;
  };
  
  // 辅助函数：转换 JSON 数组中的 ID
  const convertJsonIds = (jsonStr: string | null): string | null => {
    if (!jsonStr) return null;
    try {
      const arr = JSON.parse(jsonStr);
      if (!Array.isArray(arr)) return jsonStr;
      
      let changed = false;
      const newArr = arr.map(item => {
        if (typeof item === 'string') {
          if (isUuidFormat(item)) {
            changed = true;
            return convertId(item);
          }
          if (item.startsWith('doc:') || item.startsWith('sync:')) {
            const prefix = item.slice(0, 4);
            const id = item.slice(4);
            if (isUuidFormat(id)) {
              changed = true;
              return `${prefix}${convertId(id)}`;
            }
          }
          return item;
        } else if (typeof item === 'object' && item !== null) {
          const newObj = { ...item };
          if (newObj.id && typeof newObj.id === 'string' && isUuidFormat(newObj.id)) {
            newObj.id = convertId(newObj.id);
            changed = true;
          }
          return newObj;
        }
        return item;
      });
      
      return changed ? JSON.stringify(newArr) : jsonStr;
    } catch {
      return jsonStr;
    }
  };
  
  try {
    sqlite.exec('BEGIN TRANSACTION');
    
    // === 迁移顺序：先迁移被引用的表，再迁移引用它的表 ===
    
    // 1. 迁移 members 表（被多个表引用）
    const membersData = sqlite.prepare('SELECT id FROM members').all() as { id: string }[];
    for (const member of membersData) {
      const newId = convertId(member.id);
      if (newId !== member.id) {
        sqlite.prepare('UPDATE tasks SET creator_id = ? WHERE creator_id = ?').run(newId, member.id);
        sqlite.prepare('UPDATE comments SET author_id = ? WHERE author_id = ?').run(newId, member.id);
        sqlite.prepare('UPDATE scheduled_tasks SET member_id = ? WHERE member_id = ?').run(newId, member.id);
        sqlite.prepare('UPDATE deliveries SET member_id = ? WHERE member_id = ?').run(newId, member.id);
        sqlite.prepare('UPDATE deliveries SET reviewer_id = ? WHERE reviewer_id = ?').run(newId, member.id);
        sqlite.prepare('UPDATE openclaw_status SET member_id = ? WHERE member_id = ?').run(newId, member.id);
        sqlite.prepare('UPDATE chat_sessions SET member_id = ? WHERE member_id = ?').run(newId, member.id);
        sqlite.prepare('UPDATE openclaw_workspaces SET member_id = ? WHERE member_id = ?').run(newId, member.id);
        sqlite.prepare('UPDATE members SET id = ? WHERE id = ?').run(newId, member.id);
      }
    }
    
    // 2. 迁移 projects 表（被 tasks, documents 引用）
    const projectsData = sqlite.prepare('SELECT id FROM projects').all() as { id: string }[];
    for (const proj of projectsData) {
      const newId = convertId(proj.id);
      if (newId !== proj.id) {
        sqlite.prepare('UPDATE tasks SET project_id = ? WHERE project_id = ?').run(newId, proj.id);
        sqlite.prepare('UPDATE documents SET project_id = ? WHERE project_id = ?').run(newId, proj.id);
        sqlite.prepare('UPDATE projects SET id = ? WHERE id = ?').run(newId, proj.id);
      }
    }
    
    // 3. 迁移 tasks 表（被多个表引用）
    const allTasks = sqlite.prepare('SELECT id, assignees, check_items, attachments, parent_task_id FROM tasks').all() as { id: string; assignees: string; check_items: string; attachments: string; parent_task_id: string | null }[];
    for (const task of allTasks) {
      const newId = convertId(task.id);
      if (newId !== task.id) {
        sqlite.prepare('UPDATE task_logs SET task_id = ? WHERE task_id = ?').run(newId, task.id);
        sqlite.prepare('UPDATE comments SET task_id = ? WHERE task_id = ?').run(newId, task.id);
        sqlite.prepare('UPDATE deliveries SET task_id = ? WHERE task_id = ?').run(newId, task.id);
        sqlite.prepare('UPDATE openclaw_status SET current_task_id = ? WHERE current_task_id = ?').run(newId, task.id);
        sqlite.prepare('UPDATE openclaw_status SET next_task_id = ? WHERE next_task_id = ?').run(newId, task.id);
        sqlite.prepare('UPDATE tasks SET id = ?, assignees = ?, check_items = ?, attachments = ?, parent_task_id = ? WHERE id = ?')
          .run(newId, convertJsonIds(task.assignees), convertJsonIds(task.check_items), convertJsonIds(task.attachments), convertId(task.parent_task_id), task.id);
      }
    }
    
    // 4. 迁移 documents 表（被 deliveries, openclaw_files 引用）
    const docs = sqlite.prepare('SELECT id FROM documents').all() as { id: string }[];
    for (const doc of docs) {
      const newId = convertId(doc.id);
      if (newId !== doc.id) {
        sqlite.prepare('UPDATE deliveries SET document_id = ? WHERE document_id = ?').run(newId, doc.id);
        sqlite.prepare('UPDATE openclaw_files SET document_id = ? WHERE document_id = ?').run(newId, doc.id);
        sqlite.prepare('UPDATE documents SET id = ? WHERE id = ?').run(newId, doc.id);
      }
    }
    
    // 5. 迁移其他表的主键
    const tablesWithUuid = [
      { table: 'task_logs', fkTables: [] as string[] },
      { table: 'comments', fkTables: [] as string[] },
      { table: 'scheduled_tasks', fkTables: ['scheduled_task_history'] },
      { table: 'scheduled_task_history', fkTables: [] as string[] },
      { table: 'deliveries', fkTables: [] as string[] },
      { table: 'openclaw_status', fkTables: [] as string[] },
      { table: 'chat_sessions', fkTables: ['chat_messages'] },
      { table: 'chat_messages', fkTables: [] as string[] },
    ];
    
    for (const { table, fkTables } of tablesWithUuid) {
      const rows = sqlite.prepare(`SELECT id FROM ${table}`).all() as { id: string }[];
      for (const row of rows) {
        const newId = convertId(row.id);
        if (newId !== row.id) {
          for (const fkTable of fkTables) {
            const fkCol = table === 'scheduled_tasks' ? 'scheduled_task_id' : 
                          table === 'chat_sessions' ? 'session_id' : `${table.slice(0, -1)}_id`;
            sqlite.prepare(`UPDATE ${fkTable} SET ${fkCol} = ? WHERE ${fkCol} = ?`).run(newId, row.id);
          }
          sqlite.prepare(`UPDATE ${table} SET id = ? WHERE id = ?`).run(newId, row.id);
        }
      }
    }
    
    // 6. 更新 chat_sessions 中的 entity_id
    const sessions = sqlite.prepare('SELECT id, entity_id FROM chat_sessions WHERE entity_id IS NOT NULL').all() as { id: string; entity_id: string }[];
    for (const session of sessions) {
      const newEntityId = convertId(session.entity_id);
      if (newEntityId !== session.entity_id) {
        sqlite.prepare('UPDATE chat_sessions SET entity_id = ? WHERE id = ?').run(newEntityId, session.id);
      }
    }
    
    // 标记迁移完成
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS migration_meta (key TEXT PRIMARY KEY, value TEXT)
    `);
    sqlite.prepare("INSERT OR REPLACE INTO migration_meta (key, value) VALUES ('uuid_to_base58', 'done')").run();
    
    sqlite.exec('COMMIT');
    console.debug(`[TeamClaw] Migration complete. Converted ${idMap.size} UUIDs to Base58.`);
  } catch (err) {
    sqlite.exec('ROLLBACK');
    console.error('[TeamClaw] Migration failed, rolled back:', err);
  }
}


/**
 * v1.1 Phase 1B: Skill 进化引擎迁移
 * 创建新表（skill_experiences, skill_evolution_logs）
 */
export function migrateV1Phase1B(sqlite: Database.Database) {
  // 检查迁移是否已完成
  const metaTable = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='migration_meta'").get();
  if (metaTable) {
    const migrated = sqlite.prepare("SELECT value FROM migration_meta WHERE key = 'v1.1_phase1b'").get() as { value: string } | undefined;
    if (migrated?.value === 'done') {
      return; // 已完成迁移
    }
  }

  console.debug('[TeamClaw] Migrating: v1.1 Phase 1B (Skill Evolution Engine)...');

  try {
    sqlite.exec('BEGIN TRANSACTION');

    // 确保 migration_meta 表存在
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS migration_meta (key TEXT PRIMARY KEY, value TEXT)
    `);

    // 1. 创建 skill_experiences 表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS skill_experiences (
        id TEXT PRIMARY KEY NOT NULL,
        skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
        scenario TEXT NOT NULL,
        original_judgment TEXT,
        correction TEXT NOT NULL,
        reasoning TEXT,
        occurrence_count INTEGER NOT NULL DEFAULT 1,
        last_occurred_at INTEGER NOT NULL,
        source TEXT NOT NULL,
        task_id TEXT,
        member_id TEXT,
        promoted_to_l1 INTEGER DEFAULT 0,
        promoted_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_skill_experiences_skill_scenario ON skill_experiences(skill_id, scenario)');
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_skill_experiences_count ON skill_experiences(skill_id, occurrence_count)');

    // 2. 创建 skill_evolution_logs 表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS skill_evolution_logs (
        id TEXT PRIMARY KEY NOT NULL,
        skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        detail TEXT,
        triggered_by TEXT,
        created_at INTEGER NOT NULL
      )
    `);
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_skill_evolution_logs_skill ON skill_evolution_logs(skill_id, created_at)');

    // 标记迁移完成
    sqlite.prepare("INSERT OR REPLACE INTO migration_meta (key, value) VALUES ('v1.1_phase1b', 'done')").run();

    sqlite.exec('COMMIT');
    console.debug('[TeamClaw] v1.1 Phase 1B migration complete.');
  } catch (err) {
    sqlite.exec('ROLLBACK');
    console.error('[TeamClaw] v1.1 Phase 1B migration failed, rolled back:', err);
  }
}

/**
 * v1.1 Phase 2A: Workflow Engine 迁移
 * 创建新表（workflows, workflow_runs）
 * 为 tasks 表添加 workflow_id 和 workflow_run_id 字段
 */
export function migrateV1Phase2A(sqlite: Database.Database) {
  // 检查迁移是否已完成
  const metaTable = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='migration_meta'").get();
  if (metaTable) {
    const migrated = sqlite.prepare("SELECT value FROM migration_meta WHERE key = 'v1.1_phase2a'").get() as { value: string } | undefined;
    if (migrated?.value === 'done') {
      return;
    }
  }

  console.debug('[TeamClaw] Migrating: v1.1 Phase 2A (Workflow Engine)...');

  try {
    sqlite.exec('BEGIN TRANSACTION');

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS migration_meta (key TEXT PRIMARY KEY, value TEXT)
    `);

    // 辅助函数：安全添加列（列已存在则跳过）
    const addColumnSafe = (table: string, column: string, definition: string) => {
      const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
      const exists = cols.some(c => c.name === column);
      if (!exists) {
        sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      }
    };

    // 1. 创建 workflows 表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        nodes TEXT,
        entry_node_id TEXT,
        project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
        created_by TEXT,
        version INTEGER DEFAULT 1,
        status TEXT DEFAULT 'draft',
        sop_template_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_workflows_project ON workflows(project_id)');
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status)');

    // 2. 创建 workflow_runs 表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS workflow_runs (
        id TEXT PRIMARY KEY NOT NULL,
        workflow_id TEXT NOT NULL REFERENCES workflows(id),
        task_id TEXT REFERENCES tasks(id),
        status TEXT NOT NULL DEFAULT 'running',
        current_node_id TEXT,
        node_history TEXT DEFAULT '[]',
        context TEXT DEFAULT '{}',
        started_at INTEGER,
        completed_at INTEGER,
        created_at INTEGER NOT NULL
      )
    `);
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow ON workflow_runs(workflow_id)');
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_workflow_runs_task ON workflow_runs(task_id)');

    // 3. 为 tasks 表添加 workflow 关联字段
    addColumnSafe('tasks', 'workflow_id', 'TEXT REFERENCES workflows(id)');
    addColumnSafe('tasks', 'workflow_run_id', 'TEXT REFERENCES workflow_runs(id)');

    sqlite.prepare("INSERT OR REPLACE INTO migration_meta (key, value) VALUES ('v1.1_phase2a', 'done')").run();

    sqlite.exec('COMMIT');
    console.debug('[TeamClaw] v1.1 Phase 2A migration complete.');
  } catch (err) {
    sqlite.exec('ROLLBACK');
    console.error('[TeamClaw] v1.1 Phase 2A migration failed, rolled back:', err);
  }
}

/**
 * v1.1 Phase 3: Marketplace + Consumer System 迁移
 * 创建新表（service_ratings, activation_keys, subscriptions, service_usages, service_orders）
 */
export function migrateV1Phase3(sqlite: Database.Database) {
  const metaTable = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='migration_meta'").get();
  if (metaTable) {
    const migrated = sqlite.prepare("SELECT value FROM migration_meta WHERE key = 'v1.1_phase3'").get() as { value: string } | undefined;
    if (migrated?.value === 'done') {
      return;
    }
  }

  console.debug('[TeamClaw] Migrating: v1.1 Phase 3 (Marketplace + Consumer System)...');

  try {
    sqlite.exec('BEGIN TRANSACTION');

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS migration_meta (key TEXT PRIMARY KEY, value TEXT)
    `);

    // 1. 创建 consumers 表（依赖 Phase 1A）
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS consumers (
        id TEXT PRIMARY KEY NOT NULL,
        email TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        avatar_url TEXT,
        password_hash TEXT NOT NULL,
        tier TEXT DEFAULT 'free',
        credits INTEGER DEFAULT 0,
        metadata TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    sqlite.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_consumers_email ON consumers(email)');

    // 2. 创建 service_ratings 表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS service_ratings (
        id TEXT PRIMARY KEY NOT NULL,
        service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        consumer_id TEXT NOT NULL REFERENCES consumers(id),
        rating INTEGER NOT NULL,
        feedback TEXT,
        created_at INTEGER NOT NULL
      )
    `);
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_service_ratings_service ON service_ratings(service_id)');
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_service_ratings_consumer ON service_ratings(consumer_id)');

    // 3. 创建 activation_keys 表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS activation_keys (
        id TEXT PRIMARY KEY NOT NULL,
        service_id TEXT NOT NULL REFERENCES services(id),
        key TEXT NOT NULL,
        status TEXT DEFAULT 'unused',
        activated_by TEXT REFERENCES consumers(id),
        activated_at INTEGER,
        expires_at INTEGER,
        created_at INTEGER NOT NULL
      )
    `);
    sqlite.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_activation_keys_key ON activation_keys(key)');
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_activation_keys_service ON activation_keys(service_id)');

    // 4. 创建 subscriptions 表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY NOT NULL,
        consumer_id TEXT NOT NULL REFERENCES consumers(id),
        service_id TEXT NOT NULL REFERENCES services(id),
        plan TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        started_at INTEGER NOT NULL,
        expires_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_subscriptions_consumer_service ON subscriptions(consumer_id, service_id)');
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status)');

    // 5. 创建 service_usages 表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS service_usages (
        id TEXT PRIMARY KEY NOT NULL,
        consumer_id TEXT NOT NULL REFERENCES consumers(id),
        service_id TEXT NOT NULL REFERENCES services(id),
        subscription_id TEXT REFERENCES subscriptions(id),
        token_count INTEGER DEFAULT 0,
        request_count INTEGER DEFAULT 0,
        period_start INTEGER NOT NULL,
        period_end INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_service_usages_consumer ON service_usages(consumer_id)');
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_service_usages_service ON service_usages(service_id)');
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_service_usages_created ON service_usages(created_at)');

    // 6. 创建 service_orders 表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS service_orders (
        id TEXT PRIMARY KEY NOT NULL,
        consumer_id TEXT NOT NULL REFERENCES consumers(id),
        service_id TEXT NOT NULL REFERENCES services(id),
        status TEXT DEFAULT 'pending',
        amount INTEGER NOT NULL,
        payment_method TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_service_orders_consumer ON service_orders(consumer_id)');
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_service_orders_service ON service_orders(service_id)');
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders(status)');

    sqlite.prepare("INSERT OR REPLACE INTO migration_meta (key, value) VALUES ('v1.1_phase3', 'done')").run();

    sqlite.exec('COMMIT');
    console.debug('[TeamClaw] v1.1 Phase 3 migration complete.');
  } catch (err) {
    sqlite.exec('ROLLBACK');
    console.error('[TeamClaw] v1.1 Phase 3 migration failed, rolled back:', err);
  }
}

/**
 * v1.1 Phase 4: Proactive Engine + Observability 迁移
 * 创建新表（proactive_rules, proactive_events, event_logs, dead_letters, circuit_states）
 */
export function migrateV1Phase4(sqlite: Database.Database) {
  const metaTable = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='migration_meta'").get();
  if (metaTable) {
    const migrated = sqlite.prepare("SELECT value FROM migration_meta WHERE key = 'v1.1_phase4'").get() as { value: string } | undefined;
    if (migrated?.value === 'done') {
      return;
    }
  }

  console.debug('[TeamClaw] Migrating: v1.1 Phase 4 (Proactive Engine + Observability)...');

  try {
    sqlite.exec('BEGIN TRANSACTION');

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS migration_meta (key TEXT PRIMARY KEY, value TEXT)
    `);

    // 1. 创建 proactive_rules 表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS proactive_rules (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        trigger_type TEXT NOT NULL,
        config TEXT,
        enabled INTEGER DEFAULT 1,
        cooldown_minutes INTEGER DEFAULT 60,
        project_id TEXT REFERENCES projects(id),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_proactive_rules_project_enabled ON proactive_rules(project_id, enabled)');
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_proactive_rules_trigger ON proactive_rules(trigger_type)');

    // 2. 创建 proactive_events 表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS proactive_events (
        id TEXT PRIMARY KEY NOT NULL,
        rule_id TEXT NOT NULL REFERENCES proactive_rules(id) ON DELETE CASCADE,
        rule_name TEXT NOT NULL,
        trigger_type TEXT NOT NULL,
        severity TEXT DEFAULT 'warning',
        title TEXT NOT NULL,
        description TEXT,
        trigger_data TEXT,
        action_taken TEXT,
        status TEXT DEFAULT 'triggered',
        acted_by TEXT,
        project_id TEXT,
        created_at INTEGER NOT NULL,
        acted_at INTEGER
      )
    `);
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_proactive_events_rule ON proactive_events(rule_id, status)');
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_proactive_events_status ON proactive_events(status)');
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_proactive_events_created ON proactive_events(created_at)');
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_proactive_events_project ON proactive_events(project_id)');

    // 3. 创建 event_logs 表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS event_logs (
        id TEXT PRIMARY KEY NOT NULL,
        event_type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        payload TEXT,
        actor_type TEXT NOT NULL,
        actor_id TEXT,
        token_count INTEGER,
        token_cost REAL,
        project_id TEXT,
        created_at INTEGER NOT NULL
      )
    `);
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_event_logs_entity ON event_logs(entity_type, entity_id)');
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_event_logs_created ON event_logs(created_at)');
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_event_logs_actor ON event_logs(actor_type)');
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_event_logs_project ON event_logs(project_id)');

    // 4. 创建 dead_letters 表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS dead_letters (
        id TEXT PRIMARY KEY NOT NULL,
        original_event_id TEXT,
        error TEXT NOT NULL,
        error_stack TEXT,
        payload TEXT,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        status TEXT DEFAULT 'pending',
        next_retry_at INTEGER,
        created_at INTEGER NOT NULL
      )
    `);
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_dead_letters_status ON dead_letters(status)');

    // 5. 创建 circuit_states 表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS circuit_states (
        id TEXT PRIMARY KEY NOT NULL,
        service_name TEXT NOT NULL UNIQUE,
        state TEXT DEFAULT 'closed',
        failure_count INTEGER DEFAULT 0,
        success_threshold INTEGER DEFAULT 3,
        failure_threshold INTEGER DEFAULT 5,
        timeout_ms INTEGER DEFAULT 60000,
        last_failure_at INTEGER,
        opened_at INTEGER,
        updated_at INTEGER NOT NULL
      )
    `);

    sqlite.prepare("INSERT OR REPLACE INTO migration_meta (key, value) VALUES ('v1.1_phase4', 'done')").run();

    sqlite.exec('COMMIT');
    console.debug('[TeamClaw] v1.1 Phase 4 migration complete.');
  } catch (err) {
    sqlite.exec('ROLLBACK');
    console.error('[TeamClaw] v1.1 Phase 4 migration failed, rolled back:', err);
  }
}

/**
 * v1.1 Phase 5: OKR (Objectives and Key Results) 迁移
 * 创建新表（objectives, key_results）
 */
export function migrateV1Phase5(sqlite: Database.Database) {
  const metaTable = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='migration_meta'").get();
  if (metaTable) {
    const migrated = sqlite.prepare("SELECT value FROM migration_meta WHERE key = 'v1.1_phase5'").get() as { value: string } | undefined;
    if (migrated?.value === 'done') {
      return;
    }
  }

  console.debug('[TeamClaw] Migrating: v1.1 Phase 5 (OKR)...');

  try {
    sqlite.exec('BEGIN TRANSACTION');

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS migration_meta (key TEXT PRIMARY KEY, value TEXT)
    `);

    // 1. 创建 objectives 表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS objectives (
        id TEXT PRIMARY KEY NOT NULL,
        project_id TEXT NOT NULL REFERENCES projects(id),
        title TEXT NOT NULL,
        description TEXT,
        progress REAL DEFAULT 0,
        status TEXT DEFAULT 'active',
        start_date INTEGER,
        due_date INTEGER,
        created_by TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_objectives_project ON objectives(project_id)');
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_objectives_status ON objectives(status)');

    // 2. 创建 key_results 表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS key_results (
        id TEXT PRIMARY KEY NOT NULL,
        objective_id TEXT NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        current_value REAL DEFAULT 0,
        target_value REAL DEFAULT 100,
        progress REAL DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_key_results_objective ON key_results(objective_id)');

    sqlite.prepare("INSERT OR REPLACE INTO migration_meta (key, value) VALUES ('v1.1_phase5', 'done')").run();

    sqlite.exec('COMMIT');
    console.debug('[TeamClaw] v1.1 Phase 5 (OKR) migration complete.');
  } catch (err) {
    sqlite.exec('ROLLBACK');
    console.error('[TeamClaw] v1.1 Phase 5 migration failed, rolled back:', err);
  }
}
