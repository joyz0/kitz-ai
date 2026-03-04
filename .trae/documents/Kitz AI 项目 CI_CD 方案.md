# Kitz AI 项目 Release 版本文档生成方案

## 1. 方案概述

为 Kitz AI 项目建立一套标准化的 release 版本文档生成流程，参考 OpenClaw 项目的实践，确保版本更新信息清晰、结构化且易于维护。

## 2. 核心文件

### 2.1 CHANGELOG.md

创建并维护 `CHANGELOG.md` 文件，作为版本更新的主要文档。参考 OpenClaw 的格式，包含以下结构：

```markdown
# Changelog

Docs: [项目文档链接]

## 版本号 (发布日期)

### Changes
- 新功能和改进

### Breaking
- 破坏性变更

### Fixes
- Bug 修复
```

## 3. 生成方法

### 3.1 手动维护

- **优点**：灵活性高，可自由组织内容
- **缺点**：需要手动更新，容易遗漏

### 3.2 自动化工具

推荐使用以下工具之一：

1. **conventional-changelog**：
   - 基于 Conventional Commits 规范自动生成 CHANGELOG
   - 支持多种预设格式

2. **changelogen**：
   - 现代化的 CHANGELOG 生成工具
   - 支持 Git 提交信息分析

3. **semantic-release**：
   - 完整的版本管理和发布工具
   - 自动处理版本号、CHANGELOG 和发布流程

## 4. 实施步骤

### 4.1 安装工具

```bash
pnpm add -D conventional-changelog-cli
# 或
pnpm add -D changelogen
# 或
pnpm add -D semantic-release
```

### 4.2 配置 package.json

添加以下脚本：

```json
"scripts": {
  "changelog": "conventional-changelog -p angular -i CHANGELOG.md -s",
  "release": "semantic-release"
}
```

### 4.3 配置 Conventional Commits

使用 husky 和 commitlint 确保提交信息符合规范：

```bash
pnpm add -D husky @commitlint/cli @commitlint/config-conventional
```

创建 `.commitlintrc.json`：

```json
{
  "extends": ["@commitlint/config-conventional"]
}
```

### 4.4 生成 CHANGELOG

```bash
# 使用 conventional-changelog
pnpm changelog

# 或使用 changelogen
npx changelogen
```

## 5. 发布流程集成

### 5.1 手动发布流程

1. 更新版本号（package.json）
2. 生成 CHANGELOG
3. 提交更改
4. 创建 Git 标签
5. 推送标签和更改
6. 发布到 npm（如果需要）

### 5.2 自动化发布流程

使用 GitHub Actions 实现自动化发布：

1. 创建 `.github/workflows/release.yml`
2. 配置触发条件（推送标签或手动触发）
3. 执行测试和构建
4. 生成 CHANGELOG
5. 发布版本

## 6. 最佳实践

### 6.1 提交信息规范

遵循 Conventional Commits 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

常用类型：
- `feat`：新功能
- `fix`：Bug 修复
- `docs`：文档更新
- `chore`：构建/工具变更
- `refactor`：代码重构
- `test`：测试相关

### 6.2 版本号管理

遵循 Semantic Versioning (SemVer)：

- `MAJOR.MINOR.PATCH`
- `MAJOR`：破坏性变更
- `MINOR`：新功能
- `PATCH`：Bug 修复

### 6.3 CHANGELOG 内容组织

- 按功能模块分组
- 包含 PR 编号和贡献者信息
- 突出显示破坏性变更
- 保持语言简洁明了

## 7. 工具配置示例

### 7.1 conventional-changelog 配置

```json
// package.json
{
  "scripts": {
    "changelog": "conventional-changelog -p angular -i CHANGELOG.md -s",
    "changelog:all": "conventional-changelog -p angular -i CHANGELOG.md -s -r 0"
  }
}
```

### 7.2 changelogen 配置

创建 `changelogen.config.json`：

```json
{
  "types": {
    "feat": "Features",
    "fix": "Bug Fixes",
    "chore": "Chores",
    "docs": "Documentation",
    "refactor": "Refactoring",
    "test": "Tests"
  }
}
```

### 7.3 GitHub Actions 配置

创建 `.github/workflows/release.yml`：

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build
        run: pnpm build
      
      - name: Generate CHANGELOG
        run: pnpm changelog
      
      - name: Create GitHub Release
        uses: actions/create-release@v1
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          body_path: CHANGELOG.md
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Publish to npm
        run: pnpm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## 8. 实施建议

1. **从简单开始**：先手动维护 CHANGELOG，熟悉格式和内容组织
2. **逐步自动化**：引入工具减少手动工作
3. **与 CI/CD 集成**：将发布流程纳入自动化工作流
4. **保持一致性**：确保所有版本的文档格式统一
5. **定期更新**：在每次发布前更新 CHANGELOG

此方案参考了 OpenClaw 项目的实践，同时考虑了 Kitz AI 项目的规模和需求，确保生成的 release 版本文档清晰、准确且易于维护。