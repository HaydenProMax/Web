# OpenClaw Check-in 接口测试文档

这份文档用于测试 `staging` 环境上的 OpenClaw check-in 接口。

当前约定的 `staging` 环境：

- 项目目录：`/opt/hayden-web-staging/current`
- 环境文件：`/opt/hayden-web-staging/shared/.env.staging`
- systemd 服务：`hayden-web-staging`
- 本机监听地址：`http://127.0.0.1:3010`

## 1. 测试目标

确认以下能力全部正常：

- API Key 鉴权正常
- 读取今日状态正常
- 读取事项列表正常
- 创建事项正常
- 更新今日打卡正常
- 补录历史打卡正常
- 重置历史打卡正常
- 审计日志可追踪

## 2. 测试前检查

先检查服务状态：

```bash
systemctl status hayden-web-staging --no-pager
```

检查本机健康页：

```bash
curl -I http://127.0.0.1:3010/sign-in
```

如果服务未启动，查看日志：

```bash
journalctl -u hayden-web-staging -n 120 --no-pager
```

## 3. 读取类接口测试

### 3.1 今日总览

```bash
curl -i "http://127.0.0.1:3010/api/check-in/today" \
  -H "x-api-key: goodgoodstudy-staging"
```

预期：

- HTTP `200`
- `ok: true`
- 返回 `data.summary`
- 如果测试库为空，`habits` / `scheduled` 可能是空数组

### 3.2 事项列表

```bash
curl -i "http://127.0.0.1:3010/api/check-in/habits" \
  -H "x-api-key: goodgoodstudy-staging"
```

预期：

- HTTP `200`
- `ok: true`
- `data.habits` 为数组

### 3.3 审计日志

```bash
curl -i "http://127.0.0.1:3010/api/check-in/audit?limit=5" \
  -H "x-api-key: goodgoodstudy-staging"
```

预期：

- HTTP `200`
- `ok: true`
- `data.logs` 为数组

## 4. 写入类接口测试

建议按下面顺序测，最稳妥。

### 4.1 创建一个测试事项

```bash
curl -i -X POST "http://127.0.0.1:3010/api/check-in/habits" \
  -H "Content-Type: application/json" \
  -H "x-api-key: goodgoodstudy-staging" \
  -d '{
    "title": "Workout",
    "description": "Staging test",
    "scheduleType": "DAILY"
  }'
```

预期：

- HTTP `201`
- `ok: true`
- 返回新建事项数据

然后再读一次事项列表，记住真实 `habitId`：

```bash
curl -i "http://127.0.0.1:3010/api/check-in/habits" \
  -H "x-api-key: goodgoodstudy-staging"
```

### 4.2 更新今天打卡

把 `REAL_HABIT_ID` 换成真实值：

```bash
curl -i -X POST "http://127.0.0.1:3010/api/check-in/today/update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: goodgoodstudy-staging" \
  -d '{
    "updates": [
      {
        "habitId": "REAL_HABIT_ID",
        "status": "DONE",
        "note": "OpenClaw staging test"
      }
    ]
  }'
```

预期：

- HTTP `200`
- `data.updatedCount >= 1`
- `data.failedCount = 0`
- `data.today.done` 包含该事项

### 4.3 测试跳过场景

注意 `SKIPPED` 时必须带 `reasonTag`：

```bash
curl -i -X POST "http://127.0.0.1:3010/api/check-in/today/update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: goodgoodstudy-staging" \
  -d '{
    "updates": [
      {
        "habitId": "REAL_HABIT_ID",
        "status": "SKIPPED",
        "reasonTag": "BUSY",
        "note": "今天加班"
      }
    ]
  }'
```

预期：

- HTTP `200`
- 该项被改成 `SKIPPED`

## 5. 历史补录与重置测试

### 5.1 补录历史日期

```bash
curl -i -X POST "http://127.0.0.1:3010/api/check-in/entries/update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: goodgoodstudy-staging" \
  -d '{
    "date": "2026-04-24",
    "updates": [
      {
        "habitId": "REAL_HABIT_ID",
        "status": "DONE",
        "note": "补录昨天完成"
      }
    ]
  }'
```

预期：

- HTTP `200`
- `data.updatedCount >= 1`

### 5.2 重置历史日期

```bash
curl -i -X POST "http://127.0.0.1:3010/api/check-in/entries/reset" \
  -H "Content-Type: application/json" \
  -H "x-api-key: goodgoodstudy-staging" \
  -d '{
    "date": "2026-04-24",
    "resets": [
      {
        "habitId": "REAL_HABIT_ID"
      }
    ]
  }'
```

预期：

- HTTP `200`
- `data.clearedCount >= 1`

## 6. 事项维护接口测试

### 6.1 更新事项

```bash
curl -i -X PATCH "http://127.0.0.1:3010/api/check-in/habits/REAL_HABIT_ID" \
  -H "Content-Type: application/json" \
  -H "x-api-key: goodgoodstudy-staging" \
  -d '{
    "title": "Workout Updated",
    "description": "Staging test updated",
    "scheduleType": "WEEKDAYS"
  }'
```

预期：

- HTTP `200`
- 返回更新后的事项

### 6.2 归档事项

```bash
curl -i -X POST "http://127.0.0.1:3010/api/check-in/habits/REAL_HABIT_ID/archive" \
  -H "x-api-key: goodgoodstudy-staging"
```

预期：

- HTTP `200`
- `data.isArchived = true`

## 7. 审计验证

完成任意写操作后，都建议检查审计：

```bash
curl -i "http://127.0.0.1:3010/api/check-in/audit?limit=10" \
  -H "x-api-key: goodgoodstudy-staging"
```

重点看这些字段：

- `action`
- `requestId`
- `targetDate`
- `payload`
- `result`
- `createdAt`

常见 action：

- `CREATE_HABIT`
- `UPDATE_HABIT`
- `ARCHIVE_HABIT`
- `UPDATE_TODAY`
- `UPDATE_DATE`
- `RESET_DATE`

## 8. 实测通过样例

`staging` 上已经实测通过过这条链路：

1. `GET /api/check-in/today` 成功返回空数组
2. `POST /api/check-in/habits` 创建了 `Workout`
3. `POST /api/check-in/today/update` 把该事项更新为 `DONE`
4. `GET /api/check-in/audit?limit=10` 能看到：
   - `CREATE_HABIT`
   - `UPDATE_TODAY`

其中一次实测的 `habitId` 为：

```text
cmoe6rkg40001pynnia29ecff
```

这只是历史测试值，后续不要依赖它，重新测试时请以实时查询到的 `habitId` 为准。

## 9. OpenClaw 联调建议

建议按这个脚本联调：

1. OpenClaw 调 `GET /api/check-in/today`
2. 它告诉用户未完成事项
3. 用户回复：
   - 哪些完成了
   - 哪些没做
   - 没做原因
4. OpenClaw 组装 `POST /api/check-in/today/update`
5. OpenClaw 用返回里的 `data.today.summary` 向用户汇总结果
6. 必要时调 `GET /api/check-in/audit?limit=10` 作为后台校验

示例用户回复：

```text
Workout 做完了，English Learning 今天太忙了，先跳过。
```

推荐写回：

```json
{
  "updates": [
    {
      "habitId": "WORKOUT_HABIT_ID",
      "status": "DONE",
      "note": "用户确认已完成"
    },
    {
      "habitId": "ENGLISH_HABIT_ID",
      "status": "SKIPPED",
      "reasonTag": "BUSY",
      "note": "今天太忙了，先跳过"
    }
  ]
}
```

## 10. 常见问题排查

### 401 Unauthorized

优先检查：

- `x-api-key` 是否正确
- 服务是否已重启并加载最新 `.env`
- `OPENCLAW_API_KEY` 是否与请求头一致

### 500 DEFAULT_USER_ID is required for API key requests

说明服务端缺少：

```env
DEFAULT_USER_ID=...
```

补上后重启服务。

### 200 但返回 habits 为空

通常表示：

- 测试数据库是空的
- 当前 `DEFAULT_USER_ID` 下面还没有创建任何打卡事项

### 207 Multi-Status

表示部分成功、部分失败。

应重点查看：

- `data.failedCount`
- `data.results[].error`

## 11. 相关文档

- `docs/OPENCLAW_CHECKIN_API.md`
- `docs/STAGING_DEPLOY_SETUP.md`
