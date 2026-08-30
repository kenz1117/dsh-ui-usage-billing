# 使用统计（Usage Billing）

DeepSeek Harness 本机会话真实用量的聚合与查询语境：把 token、费用、预算从会话日志聚合为仪表盘。

## Language

### Token 口径

**输入**:
一次调用的 prompt 侧 token 总量 = 缓存命中 + 缓存未命中（未命中含显式缓存写入）。
_Avoid_: prompt tokens

**缓存命中**:
从提供商缓存读取、按折扣计价的输入 token。
_Avoid_: cacheRead

**缓存未命中**:
全价计价的输入 token，含显式缓存写入。
_Avoid_: miss input

**输出**:
模型生成的 token，含思考。
_Avoid_: completion

**思考**:
输出中可单独报告的推理子集；只能归因到总量与模型总量，无法归因到具体某日。
_Avoid_: reasoning、thinking

**模型总 Token**:
某范围内某模型的 输入 + 输出 合计；「模型 Token」表的排序与占比口径。
_Avoid_: total tokens

### 每日 Token 视图

**每日 Token**:
按日堆叠的 token 趋势图，有「按结构」与「按模型」两个视角。
_Avoid_: daily chart

**按结构**:
每日 Token 的视角之一：每天按 未命中 / 命中 / 输出 三段堆叠，回答“token 花在哪类用途”。
_Avoid_: structure view

**按模型**:
每日 Token 的视角之二：每天按模型堆叠，每段为该模型当日的模型总 Token，回答“token 花在哪个模型”。
_Avoid_: model view

**模型 Token**:
全窗口内按模型汇总的排行表（输入 / 输出 / 思考 / 命中率 / 总量 / 占比 / 调用）。
_Avoid_: model ranking

**聚焦**:
按模型视角下点选单个模型、弱化其余段的交互态；一次至多聚焦一个模型。
_Avoid_: filter、筛选
