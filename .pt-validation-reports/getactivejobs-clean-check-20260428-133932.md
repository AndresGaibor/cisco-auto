# getActiveJobs clean check

Fecha: Tue Apr 28 13:39:32 -05 2026

## source getActiveJobs block
```ts

      reapStaleJobs();
      return jobs[id] || null;
    },
    getJobState: function (id: string) {
      const job = jobs[id] || null;

      if (job) {
        tickNativeFallback(job, "getJobState");
      }

      reapStaleJobs();
      return jobs[id] ? jobs[id].context : null;
    },
    getActiveJobs: function () {
      reapStaleJobs();

      const active: ActiveJob[] = [];

      for (const key in jobs) {
        if (!isJobFinished(key)) {
          active.push(jobs[key]);
        }
      }

      return active;
    },
    isJobFinished: isJobFinished,
  };
}

// ============================================================================
// SERIALIZACIÓN
// ============================================================================

export function toKernelJobState(ctx: JobContext): KernelJobState {
```

## grep source forbidden marker
```
```

## tests
```
[0m[1mbun test [0m[2mv1.3.10 (30e609e0)[0m
[0m[1mbun test [0m[2mv1.3.10 (30e609e0)[0m
[0m[1mbun test [0m[2mv1.3.10 (30e609e0)[0m
```

## generate deploy
```
Generated: dist-qtscript/
Deployed to: /Users/andresgaibor/pt-dev
```

## deployed getActiveJobs block
```js
2615-                tickNativeFallback(job, "getJobState");
2616-}
2617-            reapStaleJobs();
2618-            return jobs[id] ? jobs[id].context : null;
2619-        },
2620:        getActiveJobs: function () {
2621-            reapStaleJobs();
2622-            var active = [];
2623-            for (var key in jobs) {
2624-                if (!isJobFinished(key)) {
2625-                    active.push(jobs[key]);
2626-}
2627-}
2628-            return active;
2629-        },
2630-        isJobFinished: isJobFinished,
2631-};
2632-}
2633-// ============================================================================
2634-// SERIALIZACIÓN
2635-// ============================================================================
2636-function toKernelJobState(ctx) {
2637-    var base = {
2638-        id: ctx.plan.id,
2639-        device: ctx.plan.device,
2640-        plan: ctx.plan,
2641-        currentStep: ctx.currentStep,
2642-        state: ctx.phase,
2643-        outputBuffer: ctx.outputBuffer,
2644-        debug: ctx.debug || [],
2645-        startedAt: ctx.startedAt,
--
3051-                return toKernelJobState(ctx);
3052-}
3053-            var job = executionEngine.getJob(id);
3054-            return job ? toKernelJobState(job.context) : null;
3055-        },
3056:        getActiveJobs: function () {
3057-            return executionEngine.getActiveJobs().map(function (j) {
3058-                return {
3059-                    id: j.id,
3060-                    device: j.device,
3061-                    finished: executionEngine.isJobFinished(j.id),
3062-                    state: j.context.phase,
3063-};
3064-            });
3065-        },
3066-        jobPayload: function (id) {
3067-            var job = executionEngine.getJob(id);
3068-            if (!job)
3069-                return null;
3070-            return job.context.plan.payload || null;
3071-        },
3072-};
3073-}
3074-function getDependencies(subsystems) {
3075-    return {
3076-        executionEngine: subsystems.executionEngine,
3077-        terminal: subsystems.terminal,
3078-        subsystems: subsystems,
3079-};
3080-}
3081-// --- pt/kernel/command-result-envelope.ts ---
```

## grep deployed forbidden marker
```
```
