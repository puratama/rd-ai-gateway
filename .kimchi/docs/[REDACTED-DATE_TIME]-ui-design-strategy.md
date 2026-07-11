# UI Design Strategy — AI Gateway

**Date:** [REDACTED-DATE_TIME]
**Stack:** Next.js 16 + Tailwind 4 + shadcn/ui
**Style:** Modern dark dashboard, clean, professional SaaS aesthetic

---

## 1. Design System Foundation

### 1.1 Color Palette (Dark Theme)

```css
/* shadcn semantic tokens — override di globals.css */
:root {
  --background: 0 0% 3.9%;           /* #0a0a0a */
  --foreground: 0 0% 98%;            /* #fafafa */
  --card: 0 0% 5.9%;                 /* #0f0f0f */
  --card-foreground: 0 0% 98%;
  --popover: 0 0% 5.9%;
  --popover-foreground: 0 0% 98%;
  --primary: 142 76% 56%;            /* emerald-500 — action/accent */
  --primary-foreground: 0 0% 3.9%;
  --secondary: 0 0% 10%;             /* zinc-900 */
  --secondary-foreground: 0 0% 98%;
  --muted: 0 0% 10%;
  --muted-foreground: 0 0% 55%;      /* zinc-500 */
  --accent: 0 0% 10%;
  --accent-foreground: 0 0% 98%;
  --destructive: 0 84% 60%;          /* red-500 */
  --destructive-foreground: 0 0% 98%;
  --border: 0 0% 14.9%;              /* zinc-800 */
  --input: 0 0% 14.9%;
  --ring: 142 76% 56%;               /* emerald-500 */
  --radius: 0.75rem;
}
```

**Accent Colors (for specific use cases):**
- Success/Revenue: `emerald-500` (#22c55e)
- Warning/Quota: `amber-500` (#f59e0b)
- Error/Destructive: `red-500` (#ef4444)
- Info: `blue-500` (#3b82f6)
- Subscription: `violet-500` (#8b5cf6)
- Package: `cyan-500` (#06b6d4)

### 1.2 Typography

```css
/* Font: Inter (already in Next.js) */
--font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;

/* Scale */
text-xs   /* 12px — labels, badges */
text-sm   /* 14px — body, table cells */
text-base /* 16px — paragraphs */
text-lg   /* 18px — card titles */
text-xl   /* 20px — section headers */
text-2xl  /* 24px — page titles */
text-3xl  /* 30px — hero/stats */
```

### 1.3 Spacing & Layout

```
Sidebar width:    256px (w-64)
Header height:    56px (h-14)
Card padding:     24px (p-6)
Section gap:      24px (gap-6)
Grid:             12-column responsive
Border radius:    12px (rounded-xl)
```

---

## 2. shadcn/ui Components to Install

```bash
npx shadcn@latest init
npx shadcn@latest add button card input label select tabs table badge separator avatar dialog sheet dropdown-menu toast tooltip skeleton alert progress switch textarea
```

**Component mapping per page:**

| Component | shadcn/ui |
|-----------|-----------|
| Buttons | `Button` (variants: default, outline, ghost, destructive) |
| Cards | `Card` + `CardHeader` + `CardContent` + `CardFooter` |
| Forms | `Label` + `Input` + `Select` + `Textarea` |
| Tables | `Table` + `TableHeader` + `TableRow` + `TableCell` |
| Tabs | `Tabs` + `TabsList` + `TabsTrigger` + `TabsContent` |
| Badges | `Badge` (variants: default, secondary, destructive, outline) |
| Dialogs | `Dialog` + `DialogContent` + `DialogHeader` + `DialogTitle` |
| Dropdown | `DropdownMenu` + `DropdownMenuTrigger` + `DropdownMenuContent` |
| Toasts | `sonner` — `toast()` |
| Loading | `Skeleton` |
| Separators | `Separator` |

---

## 3. Page Layouts

### 3.1 Admin Dashboard (`/admin`)

```
┌─────────────────────────────────────────────────────┐
│ Header: Logo | Admin Panel | [User Menu]            │
├──────────┬──────────────────────────────────────────┤
│ Sidebar  │ Content Area                             │
│          │                                          │
│ 📊 Stats │ ┌─────────────────────────────────────┐  │
│ 📦 Plans │ │ Tabs: Models | Plans | Aggregator   │  │
│ 🤖 Models│ │         | Limits | Users            │  │
│ 🔗 Aggr  │ ├─────────────────────────────────────┤  │
│ ⚙ Limits │ │ Tab Content                         │  │
│ 👥 Users │ │                                     │  │
│ 📈 Anal  │ │  [Table/Card Grid]                  │  │
│          │ │                                     │  │
│          │ └─────────────────────────────────────┘  │
└──────────┴──────────────────────────────────────────┘
```

**Components used:**
- Layout: `Sidebar` (custom with shadcn `Button` for nav items)
- Tabs: `Tabs` for switching between management sections
- Tables: `Table` for models, plans, users lists
- Cards: `Card` for stats overview (revenue, users, usage)
- Dialogs: `Dialog` for create/edit plan, model settings
- Badges: `Badge` for status (active/inactive, plan type)
- Toasts: `sonner` for success/error feedback

### 3.2 User Dashboard (`/`)

```
┌─────────────────────────────────────────────────────┐
│ Header: Logo | Wallet: Rp 50.000 | [User Menu]     │
├──────────┬──────────────────────────────────────────┤
│ Sidebar  │ Content Area                             │
│          │                                          │
│ 💬 Chat  │ ┌─────────────────────────────────────┐  │
│ 📦 Paket │ │ Stats Cards Row                     │  │
│ 💳 Saldo │ │ [Active Plan] [Tokens Left] [Usage] │  │
│ 📊 Usage │ ├─────────────────────────────────────┤  │
│ ⚙ Settin│ │ Active Packages                     │  │
│          │ │ ┌─────────┐ ┌─────────┐ ┌─────────┐│  │
│          │ │ │ DeepSeek│ │ GPT-4o  │ │ Claude  ││  │
│          │ │ │ Daily   │ │ Weekly  │ │ Monthly ││  │
│          │ │ │ 450K    │ │ 2.1M    │ │ 8.5M    ││  │
│          │ │ │ tokens  │ │ tokens  │ │ tokens  ││  │
│          │ │ └─────────┘ └─────────┘ └─────────┘│  │
│          │ ├─────────────────────────────────────┤  │
│          │ │ Quick Actions                       │  │
│          │ │ [Beli Paket] [Topup Saldo]          │  │
│          │ └─────────────────────────────────────┘  │
└──────────┴──────────────────────────────────────────┘
```

**Components used:**
- Cards: `Card` for stats (balance, tokens, active packages)
- Badges: `Badge` for package status (active, expiring soon)
- Progress: `Progress` for quota usage bar
- Buttons: `Button` for actions (buy package, topup)
- Dialogs: `Dialog` for topup amount input
- Skeleton: `Skeleton` for loading states

### 3.3 Packages Page (`/packages`)

```
┌─────────────────────────────────────────────────────┐
│ Header: Logo | [Back] | Beli Paket                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Filter: [Semua] [Harian] [Mingguan] [Bulanan]      │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Daily Packages                                  │ │
│ │ ┌───────────┐ ┌───────────┐ ┌───────────┐      │ │
│ │ │ DeepSeek  │ │ GPT-4o    │ │ Claude    │      │ │
│ │ │ Daily     │ │ Daily     │ │ Daily     │      │ │
│ │ │ Rp 9.900  │ │ Rp 25.000 │ │ Rp 49.000 │      │ │
│ │ │ 500K tok  │ │ 1M tok    │ │ 2M tok    │      │ │
│ │ │ ⚡ Fast   │ │ 🧠 Smart  │ │ 💎 Best   │      │ │
│ │ │ [Beli]    │ │ [Beli]    │ │ [Beli]    │      │ │
│ │ └───────────┘ └───────────┘ └───────────┘      │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Weekly Packages                                 │ │
│ │ ...                                             │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Monthly Packages                                │ │
│ │ ...                                             │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**Components used:**
- Cards: `Card` for each package (name, price, tokens, models)
- Badges: `Badge` for package type (daily/weekly/monthly)
- Buttons: `Button` for purchase action
- Dialog: `Dialog` for payment method selection (wallet or direct)
- Tabs: `Tabs` for filtering by period
- Toasts: `sonner` for purchase confirmation

---

## 4. Component Patterns

### 4.1 Stats Card Pattern

```tsx
<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">Saldo</CardTitle>
    <Wallet className="size-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">Rp 50.000</div>
    <p className="text-xs text-muted-foreground">+12% dari bulan lalu</p>
  </CardContent>
</Card>
```

### 4.2 Data Table Pattern

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Model</TableHead>
      <TableHead>Provider</TableHead>
      <TableHead>Harga</TableHead>
      <TableHead>Status</TableHead>
      <TableHead className="text-right">Aksi</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {models.map((model) => (
      <TableRow key={model.id}>
        <TableCell className="font-medium">{model.name}</TableCell>
        <TableCell>{model.provider}</TableCell>
        <TableCell>Rp {model.price.toLocaleString("id-ID")}</TableCell>
        <TableCell>
          <Badge variant={model.isActive ? "default" : "secondary"}>
            {model.isActive ? "Aktif" : "Nonaktif"}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <Button variant="ghost" size="sm">Edit</Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### 4.3 Package Card Pattern

```tsx<Card className="relative overflow-hidden">
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle className="text-lg">DeepSeek Daily</CardTitle>
      <Badge variant="outline">Harian</Badge>
    </div>
    <CardDescription>Akses ke DeepSeek V3 & R1</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="text-3xl font-bold">Rp 9.900</div>
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2">
        <Zap className="size-4 text-emerald-500" />
        <span>500.000 tokens</span>
      </div>
      <div className="flex items-center gap-2">
        <Clock className="size-4 text-amber-500" />
        <span>Berlaku 24 jam</span>
      </div>
      <div className="flex items-center gap-2">
        <Brain className="size-4 text-violet-500" />
        <span>DeepSeek V3, R1</span>
      </div>
    </div>
  </CardContent>
  <CardFooter>
    <Button className="w-full">Beli Paket</Button>
  </CardFooter>
</Card>
```

### 4.4 Quota Progress Pattern

```tsx
<div className="space-y-2">
  <div className="flex items-center justify-between text-sm">
    <span className="text-muted-foreground">Token Terpakai</span>
    <span className="font-medium">350.000 / 500.000</span>
  </div>
  <Progress value={70} className="h-2" />
  <p className="text-xs text-muted-foreground">150.000 token tersisa</p>
</div>
```

---

## 5. Responsive Breakpoints

```
sm: 640px   — mobile landscape
md: 768px   — tablet
lg: 1024px  — desktop
xl: 1280px  — large desktop
2xl: 1536px — ultra wide
```

**Mobile strategy:**
- Sidebar collapses to hamburger menu on < md
- Cards stack vertically on mobile
- Tables become card-list on mobile
- Package cards: 1 col mobile, 2 col tablet, 3 col desktop

---

## 6. Animation & Transitions

```css
/* Default transition */
transition-all duration-200 ease-in-out

/* Hover effects */
hover:bg-accent hover:text-accent-foreground
hover:shadow-md hover:-translate-y-0.5

/* Focus states */
focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2

/* Loading */
animate-pulse (via Skeleton component)
```

---

## 7. Accessibility Checklist

- [ ] All interactive elements have min 44×44px touch target
- [ ] Color contrast ≥ 4.5:1 for normal text
- [ ] Focus rings visible on all interactive elements
- [ ] Alt text on all meaningful images
- [ ] Aria-labels on icon-only buttons
- [ ] Keyboard navigation works (tab order, enter/space)
- [ ] Form labels properly associated with inputs
- [ ] Error messages near their fields
- [ ] Skip to main content link
- [ ] Reduced motion respected

---

## 8. Implementation Order

### Phase A: Design System Setup
1. Initialize shadcn/ui
2. Install all required components
3. Configure theme (colors, radius, fonts)
4. Create layout components (Sidebar, Header, PageContainer)

### Phase B: Admin Dashboard
1. Stats overview cards
2. Models management table + dialog
3. Plans management (subscription + package tabs)
4. Aggregator config form
5. Puter limits form
6. Users management table

### Phase C: User Dashboard
1. Stats cards (balance, tokens, active packages)
2. Active packages grid
3. Quick actions (buy package, topup)
4. Usage history table

### Phase D: Packages Page
1. Package grid with filtering
2. Package detail cards
3. Purchase dialog (wallet or direct payment)
4. Confirmation toast

### Phase E: Polish
1. Loading skeletons for all pages
2. Empty states
3. Error states
4. Responsive testing
5. Accessibility audit
