# `light_view` Initialization Problem Fix

This document details the final solution for the `light_view` initialization timing issue in the `omniclip-pro` project. The solution is based on the core idea of "Lazy Initialization" and follows the official best practices of the `@benev/slate` framework.

## Core Objective

To ensure that all views dependent on the `context` are initialized only after the `context` itself has been fully initialized. This fundamentally resolves the `ReferenceError: Cannot access 'light_view' before initialization` issue.

## Detailed Fix Steps

### Step 1: Convert Eagerly Executed Views to Factory Functions

This is the core of the refactoring. We will find all view definitions that execute immediately upon module loading and convert them into a "factory function" pattern to delay their execution.

- **Actions**:
  1.  Perform a global search in the `s/` directory for all files using `light_view(...)` and `shadow_view(...)`.
  2.  Change each affected view definition from a constant assignment to a function that returns the view.

- **Code Example**:
  ```typescript
  // Before fix (e.g., s/views/tooltip/view.ts)
  export const Tooltip = light_view(use => (/*...props...*/));

  // After fix
  export const Tooltip = () => light_view(use => (/*...props...*/));
  ```

### Step 2: Create a "View Registry" (`views.ts`)

To centralize the management of all view initializations, we will create a new `s/views.ts` file.

- **Actions**:
  1.  Create a new file `views.ts` in the `s/` directory.
  2.  In this file, import all the view factory functions modified in Step 1.
  3.  Define and export a `register_views` function. This function will be responsible for calling all imported factory functions and returning an object that aggregates the initialized view components.

- **`s/views.ts` Example Code**:
  ```typescript
  import { Tooltip } from './tooltip/view.js';
  import { AddTrackIndicator } from '../components/omni-timeline/views/indicators/add-track-indicator.js';
  // ... import all other view factories

  export const register_views = () => ({
    Tooltip: Tooltip(),
    AddTrackIndicator: AddTrackIndicator(),
    // ... initialize all other views
  });
  ```

### Step 3: Execute Initialization in the Correct Order in the Main Flow

We will modify the application's main entry logic to ensure that the `context` is strictly initialized before any views.

- **Actions**:
  1.  Open the `s/main.ts` file.
  2.  In the `setupContext` function, locate the line `omnislate.context = new OmniContext(...)`.
  3.  Immediately after this line, import and call the `register_views` function, assigning the returned view object to a new property on `omnislate`, such as `omnislate.views`.

- **`s/main.ts` Modification Example**:
  ```typescript
  import { register_views } from '../views.js'; // Import the registry

  export function setupContext(projectId: string) {
    omnislate.context = new OmniContext({ projectId, ... });
    
    // Immediately initialize all views after the context is assigned
    (omnislate as any).views = register_views(); 
  }
  ```
  *(Note: It might be necessary to use `(omnislate as any)` to dynamically add the `views` property, or to update the type definition of `Nexus`)*

### Step 4: Update How Views Are Consumed

Finally, we need to update all places in the code where these views are used, so they are retrieved from the new `omnislate.views` object instead of being imported directly from their modules.

- **Actions**:
  1.  Globally search for all places that directly `import` view components (e.g., route configuration files, other components, etc.).
  2.  Change the import statements to import `omnislate` instead.
  3.  Modify the code to retrieve the views from `omnislate.views`.

- **Code Example**:
  ```typescript
  // Before fix
  import { Tooltip } from '../views/tooltip/view.js';
  // some_router.add({ path: "/tooltip", view: Tooltip });

  // After fix
  import { omnislate } from '../context/context.js';
  // some_router.add({ path: "/tooltip", view: omnislate.views.Tooltip });
  ```

## Impact on Usage as an npm Package

This solution establishes a clear API contract by exporting an explicit `setupContext` function. Consumers of the package must call this function first to complete all necessary initializations. This guarantees that the initialization order is correct and reliable, whether used internally within the project or consumed externally, making the entire library more robust.