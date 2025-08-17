# Lighthouse CI 性能监控

本项目使用 Lighthouse CI 来监控网站性能，确保 FCP < 1s 和 TBT < 200ms。

## 配置说明

### 1. 设置 Lighthouse CI GitHub App Token

要将 Lighthouse CI 的结果作为 GitHub 状态检查显示，需要配置 GitHub App Token：

1. 访问 [Lighthouse CI GitHub App](https://github.com/apps/lighthouse-ci) 页面
2. 点击"安装"按钮
3. 选择要安装到的仓库（当前仓库）
4. 完成安装流程后，会显示一个 token
5. 复制该 token

### 2. 在 GitHub 仓库中添加 Secret

1. 进入仓库的 Settings 页面
2. 点击左侧菜单中的 "Secrets and variables" > "Actions"
3. 点击 "New repository secret" 按钮
4. 名称填写：`LHCI_GITHUB_APP_TOKEN`
5. 值填写：刚才复制的 token
6. 点击 "Add secret" 保存

### 3. 验证配置

配置完成后，每次推送代码或创建 Pull Request 时，Lighthouse CI 将自动运行并将结果发送到 GitHub，显示为状态检查。

## 性能预算

本项目设置了以下性能指标要求：

- First Contentful Paint (FCP): < 1s
- Total Blocking Time (TBT): < 200ms
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3s 