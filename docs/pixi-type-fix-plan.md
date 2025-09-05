# 最终修正版 - PixiJS 类型修复计划

## 1. 目标

彻底解决项目中因 `pixi.js` 类型定义引起的编译错误，确保类型系统与项目基于 CDN 的全局库架构保持一致。

## 2. 根本原因分析

项目通过 CDN 加载 `pixi.js`，形成全局变量 `PIXI`。`s/context/global.d.ts` 文件正确地为 `PIXI` 及其他库（如 `fabric`）和全局对象（如 `Window`）提供了类型声明。

问题的**唯一根源**在于 `tsconfig.json` 文件中的 `"compilerOptions": { "types": [...] }` 配置。当此配置存在时，TypeScript 编译器会放弃其自动扫描 `.d.ts` 文件的默认行为，转而只加载 `types` 数组中明确指定的类型包。这导致 `s/context/global.d.ts` 文件被完全忽略，从而引发了 `Cannot find namespace 'PIXI'` 的错误。

## 3. 解决方案步骤

### 步骤 1: 修正 `tsconfig.json` (核心)

- **操作**: 从 `tsconfig.json` 的 `compilerOptions` 中**完全移除 `types` 数组**。
- **修改前**:
  ```json
  "types": ["@types/wicg-file-system-access", "@types/dom-webcodecs"]
  ```
- **修改后**:
  ```json
  // "types" 数组被完全删除
  ```
- **理由**: 移除此字段将恢复 TypeScript 的默认行为，即自动包含在 `node_modules/@types` 下的所有类型包，并扫描项目 `include` 路径下的所有 `.d.ts` 文件。这将使 `s/context/global.d.ts` 中的所有声明（包括 `PIXI`）都能被正确加载并应用到全局。

### 步骤 2: 清理并修复 `s/context/controllers/compositor/controller.ts`

- **操作**:
    1.  移除文件顶部的 `import * as PIXI from 'pixi.js';` 语句。
    2.  在 `pointerup` 事件处理器中，为 `e.target` 添加 `instanceof PIXI.DisplayObject` 类型保护，以解决属性访问的类型错误。
- **修改示例**:
  ```typescript
  // import * as PIXI from 'pixi.js'; // 移除此行

  // ...

  this.app.stage.on("pointerup", (e) => {
      if (e.target instanceof PIXI.DisplayObject) { // 添加类型保护
          const selected_effect = e.target.effect as Exclude<AnyEffect, AudioEffect>;
          if(selected_effect) {
              this.actions.set_pivot(selected_effect, e.target.pivot.x, e.target.pivot.y);
              // ... 对 e.target 的其他安全访问
          }
      }
  });
  ```
- **理由**: 在全局类型正确生效后，`import` 语句变得多余且不正确。类型保护是解决 `FederatedEventTarget` 类型不确定性的标准做法，确保代码的类型安全。

## 4. 执行流程

1.  **请求切换到“代码”模式** 以获得文件编辑权限。
2.  **获得批准后**，严格按照上述步骤 1-2 顺序执行文件修改。