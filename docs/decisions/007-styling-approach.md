# ADR 007: Styling Approach

**Status:** Accepted
**Date:** 2026-02
**Supersedes:** Original ADR 007 (Tailwind CSS + shadcn/ui)

## Context

Choosing a styling strategy for the Telltale UI. The project is a Next.js 15 App Router application. The original decision chose Tailwind CSS + shadcn/ui, but was reconsidered based on developer preference.

## Decision

Use CSS Modules for styling with Radix UI for accessible unstyled component primitives. CSS Modules are built into Next.js, have zero runtime cost, and keep JSX clean by separating styles into co-located `.module.css` files.

---

## Option A: Tailwind CSS + shadcn/ui

**How it works:** Utility classes applied directly in JSX. shadcn/ui provides copy-paste accessible components built on Tailwind + Radix UI.

### Pros
- Extremely fast prototyping — no switching between files
- shadcn/ui gives polished, accessible component primitives out of the box
- First-class Next.js ecosystem support (create-next-app flag, official examples)
- Large community, abundant tutorials and resources
- No runtime cost — compiled to plain CSS at build time
- Co-locates styling with markup (no separate files)
- Built-in design system via `tailwind.config` (spacing, colors, breakpoints)

### Cons
- JSX becomes cluttered with long class strings — hurts readability
- Requires learning Tailwind's naming conventions (a second abstraction over CSS)
- Harder to express complex/dynamic styles (pseudo-elements, animations, conditional logic)
- Opinionated — fights against custom design if you want to deviate from defaults
- If you already know CSS well, Tailwind can feel like a constraint rather than a help

---

## Option B: CSS Modules

**How it works:** Standard CSS in `.module.css` files, scoped automatically per component. Import as an object and apply via `className={styles.foo}`.

### Pros
- Built into Next.js — zero configuration, zero dependencies
- Write real CSS — full power of the language, no abstraction layer
- Automatic local scoping prevents style collisions
- Clean JSX — styles live in a separate file, markup stays readable
- No runtime cost — compiled at build time
- Easy to adopt for anyone who knows CSS
- Works naturally with CSS variables for theming
- Smallest bundle impact of all three options

### Cons
- No pre-built component library equivalent to shadcn/ui (would need to build or adopt a separate one like Radix UI + custom styles)
- Switching between `.tsx` and `.module.css` files during development
- Class composition requires `composes` keyword or manual concatenation
- Dynamic/conditional styling is more verbose (ternaries over class names)
- No built-in design-token system — you manage your own CSS custom properties

---

## Option C: Styled Components (CSS-in-JS)

**How it works:** Tagged template literals define styled React components. Styles are co-located in the same file as components.

### Pros
- Full CSS power with JavaScript expressions for dynamic styling
- Styles are co-located with components — single file, no context switching
- Automatic scoping and unique class names
- Props-driven dynamic styling is natural (`color: ${p => p.variant === 'primary' ? 'blue' : 'gray'}`)
- Strong TypeScript support for styled props

### Cons
- Runtime CSS-in-JS adds bundle size and has a performance cost
- Requires extra configuration for Next.js App Router SSR (`styled-components` registry setup)
- React Server Components do NOT support styled-components — client boundary required for every styled component
- Declining ecosystem momentum — React core team has moved away from runtime CSS-in-JS
- Additional dependency to install and maintain
- The RSC incompatibility is the biggest concern for a Next.js App Router project

---

## Recommendation Matrix

| Criteria                  | Tailwind + shadcn | CSS Modules    | Styled Components |
|---------------------------|-------------------|----------------|--------------------|
| Next.js compatibility     | Excellent         | Excellent      | Poor (RSC issue)   |
| Runtime performance       | None              | None           | Runtime cost       |
| Developer experience      | Preference-dependent | Preference-dependent | Good, but RSC friction |
| Component library access  | shadcn/ui         | Radix UI (unstyled) | Radix UI (unstyled) |
| Bundle size impact        | Minimal           | Minimal        | Adds ~12KB+        |
| Learning curve            | Tailwind syntax   | Just CSS       | Template literal API |
| JSX readability           | Cluttered         | Clean          | Clean              |
| Dynamic styling           | Conditional classes | Ternaries     | Native props       |
| Ecosystem trajectory      | Growing           | Stable         | Declining          |
