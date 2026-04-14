# 🔵 Frontend Rules (Next.js)

---

## 🧱 Architecture
- Use **App Router** (`src/app`)
- Separate **UI, logic, and data layers**
- Follow folder structure:
  - `components/` → reusable UI (Atomic design approach)
  - `features/` → module-based logic (e.g. `features/auth`, `features/inventory`)
  - `lib/` → utilities (API instances, shared helpers)
  - `hooks/` → custom React hooks

---

## 🧩 Component System (STRICT)

### ⚠️ Layout & Color Policy
- **NO LAYOUT CHANGES**: Do NOT modify the established layout structure (Sidebar, Header, Card Nesting) without explicit user permission.
- **COLOR PALETTE**: Strictly use only:
  - **Teal**: #2d8d9b / #6fa1ac
  - **Peach**: #fce4d4
  - **Orange**: #f2994a
  - **Slate/Zinc**: Base colors for text/borders.
- **NO ADDITIONAL COLORS**: Do not introduce new colors for buttons, backgrounds, or badges.

### 1. Use Custom UI Components Only
- **Do NOT** use raw HTML elements directly in pages/forms.
- All core inputs, buttons, and layouts should be abstracted.

❌ **Avoid:**
- `<input />`
- `<button />`
- `<select />`

✅ **Use:**
- `<Input />`
- `<Button />`
- `<Select />` (From `components/ui/`)
