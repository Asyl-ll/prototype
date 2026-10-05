# Lecture+ Liquid Glass redesign

## Goal

Refresh the existing Lecture+ interface with a balanced Apple-inspired Liquid Glass treatment while preserving every current workflow, label, data path, and backend behavior. The experiment must be easy to compare with and revert to the baseline at commit `bf9c873`.

## Approved direction

Use the existing dark Lecture+ foundation and introduce expressive glass only where it clarifies hierarchy: navigation, progress, primary panels, upload surface, form controls, and actions. The result should feel dimensional and tactile without sacrificing readability or making every element equally translucent.

The visual language is based on the supplied Liquid Glass references:

- deep midnight background with restrained blue, violet, and cyan light blooms;
- translucent cool-toned surfaces with backdrop blur;
- bright edge highlights, subtle inner shadows, and soft exterior depth;
- pill-shaped controls and noticeably rounder buttons;
- one clear solid/translucent blue treatment for the primary action;
- restrained motion that suggests light moving across glass rather than floating decoration.

## Layout and components

The current information architecture remains unchanged: header, six-step progress, lecture input, analysis, next steps, quiz, tasks, reminders, and history continue to behave as they do now.

### Global shell

- Keep the centered working column and current content order.
- Add fixed, non-interactive ambient color blooms behind the application shell.
- Place header navigation in a compact glass bar with a soft edge highlight.
- Restyle the progress row as connected glass segments, with the current step receiving the strongest contrast.
- Keep the existing theme switch. Dark remains the default showcase direction, while the light theme uses the same glass hierarchy with pale neutral surfaces and darker text.

### Upload screen

- Keep the page heading outside the main form glass to preserve hierarchy.
- Turn the access-code block into a compact glass panel.
- Make the file drop area the largest glass surface on the screen, with a generous rounded rectangle and a distinct inner highlight.
- Keep text entry, date, language, outline, consent, and privacy controls in their current order.
- Use rounded glass input fields with clear focus rings and sufficient opaque fill behind text.
- Render secondary actions as outlined glass pills and the main Analyze action as a prominent blue pill.

### Generated-result screens

- Apply the same surface tokens to summary cards, assignment cards, quiz choices, task rows, reminder cards, history items, and toast messages.
- Preserve current rendering functions and data structures in `src/main.mjs`; the redesign should be primarily implemented in `src/style.css` with only small class additions in `index.html` or generated markup when a styling hook is required.
- Do not introduce new product features, routes, persistence, external assets, or API calls.

## Interaction and motion

- Buttons use pill geometry, a small lift on hover, a pressed-state compression, and a moving highlight limited to pointer-capable devices.
- Glass panels may brighten subtly on focus-within or hover, but must not translate enough to disturb form reading.
- Respect `prefers-reduced-motion` by disabling decorative transitions and moving highlights.
- Keyboard focus remains clearly visible on every interactive element.

## Responsive behavior

- Desktop keeps the current centered column and generous spacing.
- On narrow screens, glass panels become full width, form rows stack, and all important buttons retain at least a comfortable touch target.
- Decorative blooms may be simplified on mobile to protect performance and contrast.
- The page must not gain horizontal scrolling at common mobile widths.

## Accessibility and performance constraints

- Body and control text must maintain readable contrast against the effective composited glass background.
- Blur is decorative; every surface must remain understandable if `backdrop-filter` is unsupported.
- Main text stays at least 16px and regular control labels at least 14px.
- Avoid heavy JavaScript animation. Use CSS gradients, shadows, opacity, and `backdrop-filter` only.
- Keep all existing labels, consent language, validation messages, and semantic form relationships intact.

## Verification

- Run the existing automated test suite and production build.
- Compare desktop and mobile screenshots against the approved direction.
- Exercise upload, pasted text, access-code, theme, progress, quiz, task, reminder, and history states without changing stored data contracts.
- Check keyboard navigation, visible focus, reduced motion, text contrast, and horizontal overflow.
- Publish only after the user approves the experimental preview; the current public version remains unchanged during review.

## Rollback

The untouched baseline is preserved on branch `codex/lecture-plus-baseline-2026-10-05` at commit `bf9c873`. The redesign will be implemented on the working branch and can be discarded without altering the baseline.
