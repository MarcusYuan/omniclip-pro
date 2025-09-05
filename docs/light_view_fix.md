# `light_view` 初始化问题修复方案

本文档详细阐述了针对 `omniclip-pro` 项目中 `light_view` 初始化时序问题的最终修复方案。该方案基于“延迟初始化 (Lazy Initialization)”的核心思想，并遵循 `@benev/slate` 框架的官方最佳实践。

## 方案核心目标

确保所有依赖 `context` 的视图（Views）都在 `context` 被完全初始化之后才进行自身的初始化，从而从根本上解决 `ReferenceError: Cannot access 'light_view' before initialization` 的问题。

## 详细修复步骤

### 第一步：将“立即执行”的视图转换为“工厂函数”

这是本次重构的核心。我们将找到所有在模块加载时就立即执行的视图定义，并将它们转换为“工厂函数”模式，以延迟其执行时机。

- **操作**:
  1.  对整个 `s/` 目录进行全局搜索，找出所有使用了 `light_view(...)` 和 `shadow_view(...)` 的文件。
  2.  将每个受影响的视图定义从常量赋值修改为函数返回的形式。

- **代码示例**:
  ```typescript
  // 修复前 (e.g., s/views/tooltip/view.ts)
  export const Tooltip = light_view(use => (/*...props...*/));

  // 修复后
  export const Tooltip = () => light_view(use => (/*...props...*/));
  ```

### 第二步：创建“视图注册中心” (`views.ts`)

为了集中管理所有视图的初始化过程，我们将创建一个新的 `s/views.ts` 文件。

- **操作**:
  1.  在 `s/` 目录下创建新文件 `views.ts`。
  2.  在该文件中，导入所有在第一步中被修改过的视图工厂函数。
  3.  定义并导出一个 `register_views` 函数。该函数负责调用所有导入的工厂函数，并将返回的已初始化视图组件聚合到一个对象中返回。

- **`s/views.ts` 示例代码**:
  ```typescript
  import { Tooltip } from './tooltip/view.js';
  import { AddTrackIndicator } from '../components/omni-timeline/views/indicators/add-track-indicator.js';
  // ... 导入所有其他视图工厂

  export const register_views = () => ({
    Tooltip: Tooltip(),
    AddTrackIndicator: AddTrackIndicator(),
    // ... 初始化所有其他视图
  });
  ```

### 第三步：在主流程中按正确顺序执行初始化

我们将修改应用的主入口逻辑，以确保 `context` 的初始化严格先于所有视图的初始化。

- **操作**:
  1.  打开 `s/main.ts` 文件。
  2.  在 `setupContext` 函数中，找到 `omnislate.context = new OmniContext(...)` 这一行。
  3.  紧接着这一行之后，导入并调用 `register_views` 函数，将其返回的视图对象赋值给 `omnislate` 的一个新属性，例如 `omnislate.views`。

- **`s/main.ts` 修改示例**:
  ```typescript
  import { register_views } from '../views.js'; // 导入注册中心

  export function setupContext(projectId: string) {
    omnislate.context = new OmniContext({ projectId, ... });
    
    // 在context被赋值后，立即初始化所有视图
    (omnislate as any).views = register_views(); 
  }
  ```
  *(注: 可能需要使用 `(omnislate as any)` 来动态添加 `views` 属性，或者更新 `Nexus` 的类型定义)*

### 第四步：更新视图的消费方式

最后，我们需要更新代码中所有使用这些视图的地方，让它们从新的 `omnislate.views` 对象中获取视图，而不是直接从模块导入。

- **操作**:
  1.  全局搜索所有直接 `import` 视图组件的地方（例如，路由配置文件、其他组件等）。
  2.  将导入语句改为导入 `omnislate`。
  3.  将使用视图的地方改为从 `omnislate.views` 中获取。

- **代码示例**:
  ```typescript
  // 修复前
  import { Tooltip } from '../views/tooltip/view.js';
  // some_router.add({ path: "/tooltip", view: Tooltip });

  // 修复后
  import { omnislate } from '../context/context.js';
  // some_router.add({ path: "/tooltip", view: omnislate.views.Tooltip });
  ```

## 对作为 npm 包使用的影响

该方案通过导出一个显式的 `setupContext` 函数，建立了一个清晰的 API 契约。包的消费者必须先调用此函数来完成所有必要的初始化。这保证了无论是在本项目内部还是在外部消费时，初始化的顺序都是正确且可靠的，从而使整个库更加健壮。
