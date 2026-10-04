# React

Applies to any React code in the project. Until a React stack ships its lint rules, reviewers check these.

## Effects

Avoid `useEffect`. Almost every effect is one of these, and each has a better tool:

| You want to                          | Use instead                                                |
| ------------------------------------ | ---------------------------------------------------------- |
| Compute a value from props or state  | Compute it during render (`useMemo` only if measured slow) |
| Reset state when a prop changes      | A `key` on the component                                   |
| Respond to a click, submit, or input | The event handler                                          |
| Load server data                     | The resource's data-fetching hook                          |
| Read an external store               | `useSyncExternalStore`                                     |
| Tell a parent something changed      | Call its callback from the event handler                   |

`useEffect` is only for synchronizing with a system outside React (a browser API, a third-party widget, a connection). It then has a cleanup function and complete dependencies. Never disable the exhaustive-deps rule.

## Structure and naming

- Files are kebab-case. A feature folder holds `<name>.container.tsx` (wires hooks to the component, no logic), `<name>.component.tsx` (renders props), `<name>.hook.ts` (state and handlers), and when needed `<name>.context.tsx`, `<name>.type.ts`, `<name>.style.ts`, `<name>.stories.tsx`.
- Components are PascalCase nouns (`OrderList`); their props type is `<Component>Props`.
- Hooks are `use<Noun>` or `use<Verb><Noun>` (`useOrderList`, `useCancelOrder`), in `use-<name>.ts` files.
- A context is `<Name>Context`, read with `use<Name>Context`, provided by `<Name>ContextProvider`.
- API types are `<Name>Request` and `<Name>Response`.
- Styles for a component sit in one object (`styles = { root, header: { title } }`), not loose constants. Plain CSS classes follow BEM: `.block`, `.block__element`, `.block--modifier`.
- Shared UI components have a Storybook story.

## Data fetching

- One hook per endpoint under `src/domain/hooks/<resource>/`, wrapping the query library. Endpoints and cache keys come from that resource's `queries.ts` (`all`, `list`, `detail(id)`), so invalidation can target a whole resource.
- These hooks hold no business logic; that belongs in the feature's hook.
- Query option types come from the project's own wrapper types, not the library, so the library can be swapped in one place.

## Errors

- Every failure a user can hit shows a message (toast or snackbar), never only a console log.
- Expected errors (404, 409) are handled in place: show the message, then refetch or reset. Don't throw them to the error boundary.
- User-facing error wording is agreed with product and design.

## Tests

- Required: components with logic, feature hooks, validation, and mapping between API and view models. Not tested: containers, props passed straight through, type and style files, a context that only exposes `useState`, a data hook that only forwards to the query library.
- Before writing a component test, list every prop (both values of a boolean, every union member, optional given and omitted), every validation rule, every conditional render and list (0, 1, many items), and every handler per UI element that triggers it. Each gets a test.
- Query by role first (`getByRole(role, { name })`), then label, then text; `getByTestId` is the last resort. If an element can't be found by role, fix the component's accessibility.
- Never query by DOM structure or generated class names.
- Assert what the user experiences: `toBeVisible()`, `toBeDisabled()`, `toHaveAttribute('aria-invalid', 'true')`. Check absence with `queryBy…` and `not.toBeInTheDocument()`.
- Style variants: one `toHaveStyle({ ... })` with every property, on both the applied and the non-applied side.
- Hooks: `renderHook` and `act`; read `result.current` again after every update. When a hook memoizes or has an effect, test that it recomputes only when its inputs change and that cleanup runs.
- Providers a component needs (theme, router, query client) come from one shared `renderWithProviders` helper.
- No snapshot tests. Mock only the network and heavy children unrelated to the test.

## UI bugs

- Fix the cause, not the symptom. Walk up from the broken element through its parents (table column widths, flex containers, modal widths) before adding defensive CSS.
- Check the design spec first; ask for the intended size instead of guessing values.
- Verify at the design width, a middle width, and the minimum width. The PR explains the root cause, not only before and after screenshots.
