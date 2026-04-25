# OpenClaw Check-in API 文档

这份文档面向两类使用者：

- OpenClaw 集成方
- 本项目的接口联调与排障人员

当前 `check-in` API 已支持 OpenClaw 读取今日状态、批量写回打卡结果、维护打卡事项，以及读取审计日志。

## 1. 集成概览

当前可用接口：

- `GET /api/check-in/today`
- `POST /api/check-in/today/update`
- `GET /api/check-in/habits`
- `POST /api/check-in/habits`
- `PATCH /api/check-in/habits/:habitId`
- `POST /api/check-in/habits/:habitId/archive`
- `POST /api/check-in/entries/update`
- `POST /api/check-in/entries/reset`
- `GET /api/check-in/audit`

推荐给 OpenClaw 的调用顺序：

1. 先调用 `GET /api/check-in/today`
2. 根据 `data.pending` / `data.unfinished` 告诉用户今天还有哪些事项没完成
3. 用户用自然语言回复“哪些已完成、哪些跳过、原因是什么”
4. OpenClaw 把自然语言解析成结构化 `updates`
5. 调用 `POST /api/check-in/today/update`
6. 如需核验，再调用 `GET /api/check-in/audit?limit=10`

## 2. 鉴权方式

接口支持两种鉴权：

- 浏览器会话登录
- API Key

OpenClaw 推荐使用 API Key。

可接受的请求头：

```http
x-api-key: YOUR_OPENCLAW_API_KEY
```

或：

```http
Authorization: ApiKey YOUR_OPENCLAW_API_KEY
```

服务端必须配置：

```env
OPENCLAW_API_KEY="your-api-key"
DEFAULT_USER_ID="your-user-id"
```

说明：

- API Key 请求不需要传 `userId`
- 当前实现会固定作用到服务端环境变量 `DEFAULT_USER_ID`
- 这个 `DEFAULT_USER_ID` 必须在数据库里真实存在
- 修改 `.env` 后必须重启服务

## 3. 响应格式

所有接口都使用统一外层包裹：

成功时：

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "authMethod": "apiKey",
    "requestId": "REQUEST_UUID"
  }
}
```

失败时：

```json
{
  "ok": false,
  "error": "Unauthorized"
}
```

字段说明：

- `meta.authMethod`: `session` 或 `apiKey`
- `meta.requestId`: 写操作接口会返回本次请求的审计关联 ID

## 4. OpenClaw 状态映射建议

建议把用户自然语言映射为以下状态：

- “完成了 / 做完了 / 已经做了” -> `DONE`
- “没做 / 今天不做了 / 跳过” -> `SKIPPED`

当前写入接口 `today/update` 和 `entries/update` 只接受：

- `DONE`
- `SKIPPED`

如果是 `SKIPPED`，必须同时带上 `reasonTag`。

可用 `reasonTag`：

- `SICK`
- `BUSY`
- `OUT`
- `REST`
- `FORGOT`
- `OTHER`

推荐自然语言映射：

- “忙 / 加班 / 今天太忙” -> `BUSY`
- “忘了” -> `FORGOT`
- “生病 / 不舒服” -> `SICK`
- “出门 / 旅行 / 不在家” -> `OUT`
- “休息日” -> `REST`
- 其他原因 -> `OTHER`

原始解释建议保留在 `note` 里。

## 5. GET /api/check-in/today

读取今天的打卡总览。

### 示例

```bash
curl -i "https://your-domain.com/api/check-in/today" \
  -H "x-api-key: YOUR_OPENCLAW_API_KEY"
```

### 成功响应示例

```json
{
  "ok": true,
  "data": {
    "date": "2026-04-25",
    "timeZone": "Asia/Shanghai",
    "summary": "2/4 check-ins done today, 2 unfinished.",
    "habits": [],
    "scheduled": [],
    "done": [],
    "pending": [],
    "skipped": [],
    "unfinished": [],
    "counts": {
      "scheduledCount": 4,
      "doneCount": 2,
      "pendingCount": 1,
      "skippedCount": 1,
      "unfinishedCount": 2
    }
  },
  "meta": {
    "authMethod": "apiKey"
  }
}
```

### 关键字段

- `data.summary`: 适合直接给用户展示的总结句
- `data.pending`: 今天计划内但未写入结果的事项
- `data.skipped`: 今天被标记为跳过的事项
- `data.unfinished`: `pending + skipped`
- `data.counts`: 适合给 agent 做判断逻辑

### 状态码

- `200`: 成功
- `401`: 鉴权失败
- `500`: 服务端读取失败

## 6. POST /api/check-in/today/update

批量更新“今天”的打卡结果。

这是最核心的 OpenClaw 写回接口。

### 请求体

```json
{
  "updates": [
    {
      "habitId": "habit-a",
      "status": "DONE",
      "note": "用户确认已完成"
    },
    {
      "habitId": "habit-b",
      "status": "SKIPPED",
      "reasonTag": "BUSY",
      "note": "今天加班，先跳过"
    }
  ]
}
```

### 字段规则

每个 `updates[]` 项支持：

- `habitId`: 必填
- `status`: 必填，取值只能是 `DONE` 或 `SKIPPED`
- `reasonTag`: 当 `status=SKIPPED` 时必填
- `note`: 可选，最大 280 字符

请求限制：

- `updates` 至少 1 项
- `updates` 最多 50 项

### 示例

```bash
curl -i -X POST "https://your-domain.com/api/check-in/today/update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_OPENCLAW_API_KEY" \
  -d '{
    "updates": [
      {
        "habitId": "habit-a",
        "status": "DONE",
        "note": "用户确认已完成"
      },
      {
        "habitId": "habit-b",
        "status": "SKIPPED",
        "reasonTag": "BUSY",
        "note": "今天加班，先跳过"
      }
    ]
  }'
```

### 全部成功

HTTP 状态：

```http
200 OK
```

响应示例：

```json
{
  "ok": true,
  "data": {
    "ok": true,
    "updatedCount": 2,
    "failedCount": 0,
    "results": [
      {
        "index": 0,
        "habitId": "habit-a",
        "status": "DONE",
        "applied": true
      },
      {
        "index": 1,
        "habitId": "habit-b",
        "status": "SKIPPED",
        "applied": true,
        "reasonTag": "BUSY",
        "note": "今天加班，先跳过"
      }
    ],
    "today": {}
  },
  "meta": {
    "authMethod": "apiKey",
    "requestId": "REQUEST_UUID"
  }
}
```

### 部分成功

HTTP 状态：

```http
207 Multi-Status
```

响应示例：

```json
{
  "ok": true,
  "data": {
    "ok": false,
    "updatedCount": 1,
    "failedCount": 1,
    "results": [
      {
        "index": 0,
        "habitId": "habit-a",
        "status": "DONE",
        "applied": true
      },
      {
        "index": 1,
        "habitId": "bad-habit-id",
        "status": "SKIPPED",
        "applied": false,
        "reasonTag": "BUSY",
        "note": "今天加班，先跳过",
        "error": "Check-in habit not found"
      }
    ],
    "today": {}
  },
  "meta": {
    "authMethod": "apiKey",
    "requestId": "REQUEST_UUID"
  }
}
```

### 错误场景

- `400`: 请求体不合法
- `401`: 鉴权失败

### 结果字段

- `data.ok`: 本次批量是否全部成功
- `data.updatedCount`: 成功写入数量
- `data.failedCount`: 失败数量
- `data.results[]`: 单条结果
- `data.results[].index`: 对应原始请求位置
- `data.results[].applied`: 该项是否已真正写入
- `data.results[].error`: 单项失败原因
- `data.today`: 更新后的今日快照

## 7. GET /api/check-in/habits

读取当前用户的有效打卡事项。

### 示例

```bash
curl -i "https://your-domain.com/api/check-in/habits" \
  -H "x-api-key: YOUR_OPENCLAW_API_KEY"
```

### 成功响应示例

```json
{
  "ok": true,
  "data": {
    "habits": [
      {
        "id": "habit-id",
        "title": "Workout",
        "description": "",
        "scheduleType": "DAILY",
        "scheduleDays": [],
        "isArchived": false,
        "monthlyDoneCount": 3,
        "yearlyDoneCount": 3,
        "totalDoneCount": 3,
        "currentStreak": 3,
        "longestStreak": 3,
        "todayStatus": "DONE",
        "updatedAt": "2026-04-25T12:00:00.000Z"
      }
    ],
    "count": 1
  },
  "meta": {
    "authMethod": "apiKey"
  }
}
```

### 状态码

- `200`: 成功
- `401`: 鉴权失败
- `500`: 服务端读取失败

## 8. POST /api/check-in/habits

创建新的打卡事项。

### 请求体

```json
{
  "title": "Workout",
  "description": "30 minutes minimum",
  "scheduleType": "CUSTOM",
  "scheduleDays": [1, 3, 5]
}
```

### 字段规则

- `title`: 必填，1-80 字符
- `description`: 可选，最多 240 字符
- `scheduleType`: `DAILY`、`WEEKDAYS`、`CUSTOM`
- `scheduleDays`: `CUSTOM` 时至少 1 个，范围 `0-6`

星期映射：

- `0`: 周日
- `1`: 周一
- `2`: 周二
- `3`: 周三
- `4`: 周四
- `5`: 周五
- `6`: 周六

### 示例

```bash
curl -i -X POST "https://your-domain.com/api/check-in/habits" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_OPENCLAW_API_KEY" \
  -d '{
    "title": "Workout",
    "description": "30 minutes minimum",
    "scheduleType": "CUSTOM",
    "scheduleDays": [1, 3, 5]
  }'
```

### 状态码

- `201`: 创建成功
- `400`: 请求体不合法
- `401`: 鉴权失败

## 9. PATCH /api/check-in/habits/:habitId

更新现有事项字段。

### 当前支持字段

- `title`
- `description`
- `scheduleType`
- `scheduleDays`

### 注意

- 当前实现里 `title` 仍然是必填
- 如果 `scheduleType=CUSTOM`，则 `scheduleDays` 必须传且不能为空

### 请求体示例

```json
{
  "title": "Workout",
  "description": "Gym or home session",
  "scheduleType": "WEEKDAYS"
}
```

### 示例

```bash
curl -i -X PATCH "https://your-domain.com/api/check-in/habits/habit-id" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_OPENCLAW_API_KEY" \
  -d '{
    "title": "Workout",
    "description": "Gym or home session",
    "scheduleType": "WEEKDAYS"
  }'
```

### 状态码

- `200`: 更新成功
- `400`: 请求非法或事项不存在
- `401`: 鉴权失败

## 10. POST /api/check-in/habits/:habitId/archive

归档一个事项。

归档后，历史记录仍保留在数据库。

### 示例

```bash
curl -i -X POST "https://your-domain.com/api/check-in/habits/habit-id/archive" \
  -H "x-api-key: YOUR_OPENCLAW_API_KEY"
```

### 成功响应示例

```json
{
  "ok": true,
  "data": {
    "id": "habit-id",
    "isArchived": true
  },
  "meta": {
    "authMethod": "apiKey",
    "requestId": "REQUEST_UUID"
  }
}
```

### 状态码

- `200`: 归档成功
- `400`: 事项不存在或已归档
- `401`: 鉴权失败

## 11. POST /api/check-in/entries/update

按指定日期批量写入打卡结果。

适合补录历史日期。

### 请求体

```json
{
  "date": "2026-04-24",
  "updates": [
    {
      "habitId": "habit-a",
      "status": "DONE"
    },
    {
      "habitId": "habit-b",
      "status": "SKIPPED",
      "reasonTag": "FORGOT",
      "note": "第二天补录"
    }
  ]
}
```

### 状态码

- `200`: 全部成功
- `207`: 部分成功
- `400`: 请求不合法
- `401`: 鉴权失败

### 示例

```bash
curl -i -X POST "https://your-domain.com/api/check-in/entries/update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_OPENCLAW_API_KEY" \
  -d '{
    "date": "2026-04-24",
    "updates": [
      {
        "habitId": "habit-a",
        "status": "DONE"
      },
      {
        "habitId": "habit-b",
        "status": "SKIPPED",
        "reasonTag": "FORGOT",
        "note": "第二天补录"
      }
    ]
  }'
```

## 12. POST /api/check-in/entries/reset

清空指定日期的打卡结果。

适合撤销错误写入或重置历史数据。

### 请求体

```json
{
  "date": "2026-04-24",
  "resets": [
    { "habitId": "habit-a" },
    { "habitId": "habit-b" }
  ]
}
```

### 状态码

- `200`: 全部成功
- `207`: 部分成功
- `400`: 请求不合法
- `401`: 鉴权失败

### 示例

```bash
curl -i -X POST "https://your-domain.com/api/check-in/entries/reset" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_OPENCLAW_API_KEY" \
  -d '{
    "date": "2026-04-24",
    "resets": [
      { "habitId": "habit-a" },
      { "habitId": "habit-b" }
    ]
  }'
```

## 13. GET /api/check-in/audit

读取最近的 API 写入审计记录。

### 查询参数

- `limit`: 可选，默认 `20`，最大 `100`
- `habitId`: 可选，只看某一个事项

### 示例

```bash
curl -i "https://your-domain.com/api/check-in/audit?limit=20" \
  -H "x-api-key: YOUR_OPENCLAW_API_KEY"
```

### 成功响应示例

```json
{
  "ok": true,
  "data": {
    "logs": [
      {
        "id": "audit-log-id",
        "ownerId": "seed-user-id",
        "habitId": "habit-id",
        "habitTitle": "Workout",
        "action": "CREATE_HABIT",
        "source": "apiKey",
        "requestId": "REQUEST_UUID",
        "targetDate": "2026-04-25",
        "payload": {},
        "result": {},
        "createdAt": "2026-04-25T10:30:00.000Z"
      }
    ],
    "count": 1
  },
  "meta": {
    "authMethod": "apiKey"
  }
}
```

### action 取值

- `CREATE_HABIT`
- `UPDATE_HABIT`
- `ARCHIVE_HABIT`
- `UPDATE_TODAY`
- `UPDATE_DATE`
- `RESET_DATE`

### 状态码

- `200`: 成功
- `400`: 查询参数不合法
- `401`: 鉴权失败

## 14. 给 OpenClaw 的最小可用说明

如果你要把这套接口“喂给” OpenClaw，最少告诉它下面这些规则：

```text
1. 使用 x-api-key 调用 check-in API。
2. 不需要 userId，服务端会用 DEFAULT_USER_ID 识别目标用户。
3. 先调用 GET /api/check-in/today 获取今天状态。
4. 从 data.pending 或 data.unfinished 中找未完成事项。
5. 用户回复后，把“完成了”映射成 DONE，把“跳过/没做”映射成 SKIPPED。
6. 当状态是 SKIPPED 时，必须提供 reasonTag。
7. 把用户原话中的原因尽量保留到 note。
8. 调用 POST /api/check-in/today/update 批量写回。
9. 如果返回 HTTP 207，说明部分成功，需要根据 data.results[].error 向用户解释失败项。
10. 如需追踪写入结果，调用 GET /api/check-in/audit?limit=10。
```

## 15. 当前限制

当前实现仍有这些约束：

- API Key 请求始终绑定到 `DEFAULT_USER_ID`
- 还没有做到“一个 key 对应一个用户”
- `PATCH /api/check-in/habits/:habitId` 当前仍要求 `title` 必填
- `today/update` 与 `entries/update` 目前不接受 `PENDING`

## 16. 相关文档

- `docs/STAGING_DEPLOY_SETUP.md`
- `docs/OPENCLAW_CHECKIN_TESTING.md`
