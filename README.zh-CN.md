# Cuebook CLI

[English](README.md)

这是 [Cuebook](https://cuebook.xyz) 官方命令行客户端，为用户、脚本以及运行在
终端中的 AI Agent 提供稳定的 Cuebook 远程 MCP 接口。

```text
用户或 AI Agent
       │
       ▼
  cuebook CLI
       │  Streamable HTTP + OAuth 2.1
       ▼
https://cuebook.xyz/mcp
```

CLI 只是轻量客户端。市场数据、Cuebook 已发布研究、授权、限流以及模拟交易规则
仍由 Cuebook 云端服务统一管理。

## 当前状态

`v0.1.0` 为公开预览版。GitHub 源码已经可以安装使用；将 `@cuebook/cli` 发布到
npm 是独立的发布步骤，目前尚未执行。

## 从源码安装

需要 Node.js 20 或更高版本。

```bash
git clone https://github.com/cuebook-public/cuebook-cli.git
cd cuebook-cli
npm ci
npm run build
npm link
```

然后连接您的 Cuebook 账户：

```bash
cuebook auth login
```

CLI 会在浏览器中打开 Cuebook。登录本身不会授权，只有您明确允许后连接才会生效。

## 常用命令

```bash
# 登录与连接管理
cuebook auth login
cuebook auth status
cuebook auth logout
cuebook connections

# 查看服务端实时开放的 Tool
cuebook tools list

# 常用只读命令
cuebook assets search bitcoin
cuebook market state btc
cuebook cues latest
cuebook cues latest --asset btc
cuebook paper portfolio
cuebook paper preview btc --side buy --notional-usd 100

# 调用任意当前开放的 MCP Tool
cuebook call get_candles \
  --input '{"ticker":"btc","interval":"1d"}'
```

Agent 与脚本建议使用 `--json` 获得稳定的结构化输出：

```bash
cuebook --json assets search NVDA
cuebook --json cues latest --asset nvda
```

`cuebook call` 也可以从文件读取参数：

```bash
cuebook call get_reasoning_graph --file request.json
```

## 写操作安全

CLI 以远程 MCP 实时返回的 Tool 清单作为能力来源。已知只读操作可以直接执行；
任何写操作或 CLI 尚未识别的新 Tool 都默认阻断，必须显式添加 `--confirm`：

```bash
cuebook call place_paper_order --file order.json --confirm
```

这一确认只是额外的客户端保护，不是授权边界。Cuebook 远程 MCP 仍会校验 OAuth
权限、账户状态、幂等键、调用限额以及具体 Tool 的规则。

Cuebook Paper Trading 使用虚拟组合和虚拟资金。CLI 不会进行真实交易、转移资金、
访问交易所账户，也不会要求交易所密钥或钱包密钥。

## OAuth 与本地凭证

- 使用 OAuth 2.1、PKCE 和本机回调完成授权。
- 动态客户端注册会将连接标识为 `Cuebook CLI`。
- 凭证保存在仅当前用户可读的本地文件中；Unix 系统权限为 `0600`。
- 可以通过 `CUEBOOK_CONFIG_DIR` 修改存储目录。
- 自动化环境可以通过 `CUEBOOK_ACCESS_TOKEN` 提供短期 Bearer Token，CLI 不会将
  该环境变量写入磁盘。

Cuebook CLI 会占用一个 Agent 连接名额。`cuebook auth logout` 会移除本机 Token；
如需彻底解除 Cuebook 侧连接并释放名额，请运行 `cuebook connections`，然后在
Cuebook 中解绑。

## 环境变量

| 变量 | 用途 |
| --- | --- |
| `CUEBOOK_MCP_URL` | 修改远程 MCP 地址 |
| `CUEBOOK_ACCESS_TOKEN` | 使用外部管理的 Bearer Token |
| `CUEBOOK_CONFIG_DIR` | 修改本地凭证目录 |
| `CUEBOOK_DEBUG=1` | CLI 报错时显示调用栈 |

默认 MCP 地址为 `https://cuebook.xyz/mcp`。

## 连接诊断

```bash
cuebook doctor
```

`doctor` 会检查受保护资源发现、OAuth 元数据、本地凭证和 MCP 握手，不会输出
OAuth Token。

## 开发与维护

```bash
npm ci
npm run check
```

质量门包含格式与 Lint、TypeScript 检查、自动化测试、生产构建以及 npm 打包预检。
CI 覆盖 Node.js 20、22 和 24。

提交代码前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)；报告安全问题前请阅读
[SECURITY.md](SECURITY.md)。

## 许可证与服务条款

CLI 源码采用 [MIT License](LICENSE)。Cuebook 云端服务和数据的使用仍受 Cuebook
产品条款及相关数据权利约束。

Cuebook 提供市场信息和模拟工具，不构成投资建议。CLI 返回的任何内容均不是交易推荐。
