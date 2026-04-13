# 🏗️ Quvolt Modular Architecture Guide

## Philosophy
✅ **Single Responsibility** - Each component handles ONE thing  
✅ **Composition Over Inheritance** - Build complex UIs from simple pieces  
✅ **Token-Driven Styling** - Centralized design tokens in `src/styles/components.js`  
✅ **Animation Consistency** - Use Framer Motion with `motion as Motion` pattern  
✅ **Reusability First** - Extract common patterns into `ui/` folder  

---

## 📁 Folder Structure Pattern

```
src/
├── components/
│   ├── ui/                          # Pure UI building blocks (reusable everywhere)
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── Modal.jsx
│   │   ├── FormField.jsx             # ✨ NEW
│   │   ├── DataTable.jsx             # ✨ NEW
│   │   ├── StatusBadge.jsx           # ✨ NEW
│   │   ├── EmptyState.jsx            # ✨ NEW
│   │   ├── SkeletonCard.jsx          # ✨ NEW
│   │   └── Pagination.jsx            # ✨ NEW
│   │
│   ├── layout/                      # Layout composition (wrappers)
│   │   ├── Container.jsx
│   │   ├── Section.jsx
│   │   ├── SubHeader.jsx
│   │   └── ResponsiveGrid.jsx
│   │
│   ├── [feature]/                   # Feature-specific components
│   │   ├── Feature.jsx              # Main page/screen
│   │   ├── FeatureHeader.jsx        # Sub-section (isolated responsibility)
│   │   ├── FeatureCard.jsx          # Reusable item component
│   │   ├── FeatureForm.jsx          # Form logic (separate from display)
│   │   └── FeatureEmpty.jsx         # Empty state variant
│   │
│   ├── organizerDashboard/          # Feature: Quiz management
│   │   ├── StudioDashboard.jsx      # Main page (< 200L coordinator)
│   │   ├── QuizGrid.jsx             # List display only
│   │   ├── QuizCard.jsx             # Single quiz item
│   │   ├── NewQuizModal.jsx         # Creation modal
│   │   ├── QuizActionsMenu.jsx      # Edit/delete/clone actions
│   │   └── BulkActionsBar.jsx       # Multi-select toolbar
│   │
│   └── pages/                       # Feature pages (import from components)
│
└── pages/                           # Thin routing layer
    ├── Dashboard.jsx                # Just wrapped StudioDashboard component
    └── ...
```

---

## 🎯 Component Size Guidelines

| Type | Max Lines | Purpose |
|------|-----------|---------|
| **Page** | 150-200 | Orchestrator (layout + data fetching) |
| **Container** | 200-300 | Complex state management + composition |
| **Feature Component** | 150-200 | One functional section |
| **Presentational** | 80-120 | Pure display logic |
| **UI Primitive** | 50 | Button, Input, Badge, etc. |

---

## ✨ Refactoring Pattern (Step-by-Step)

### Example: Refactor StudioDashboard (643L → 170L + components)

**BEFORE** (643 lines, all mixed):
```jsx
// QuizCard, modal, filtering, sorting, CRUD logic ALL IN ONE FILE
const StudioDashboard = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  // ... 100+ lines of state
  
  const handleDelete = (id) => { /* 50 lines */ };
  const handleClone = async (id) => { /* 40 lines */ };
  const handleBulkDelete = async (ids) => { /* 30 lines */ };
  
  return (
    <div>
      {/* Filter UI */}
      {/* Sort UI */}
      {/* Bulk delete UI */}
      {/* Every quiz as big card rendering */}
    </div>
  );
};
```

**AFTER** (170 lines coordinator + separate focused components):

**1️⃣ Extract Card Component** → `QuizCard.jsx` (80L)
```jsx
const QuizCard = ({ quiz, onEdit, onDelete, onClone }) => {
  return (
    <Motion.article className="..." whileHover={{ y: -4 }}>
      {/* Card display only, NO state */}
      <QuizActionsMenu 
        quizId={quiz.id} 
        onEdit={onEdit}
        onDelete={onDelete}
        onClone={onClone}
      />
    </Motion.article>
  );
};
```

**2️⃣ Extract Actions Menu** → `QuizActionsMenu.jsx` (50L)
```jsx
const QuizActionsMenu = ({ quizId, onEdit, onDelete, onClone }) => {
  return (
    <DropdownMenu>
      <Item onClick={() => onEdit(quizId)}>Edit</Item>
      <Item onClick={() => onClone(quizId)}>Clone</Item>
      <Item onClick={() => onDelete(quizId)} className="text-red-600">Delete</Item>
    </DropdownMenu>
  );
};
```

**3️⃣ Extract Grid/List** → `QuizGrid.jsx` (60L)
```jsx
const QuizGrid = ({ quizzes, loading, onEdit, onDelete, onClone, emptyState }) => {
  if (loading) return <SkeletonCard count={6} />;
  if (!quizzes.length) return emptyState;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {quizzes.map(quiz => (
        <QuizCard 
          key={quiz.id} 
          quiz={quiz}
          onEdit={onEdit}
          onDelete={onDelete}
          onClone={onClone}
        />
      ))}
    </div>
  );
};
```

**4️⃣ Extract Modal** → `NewQuizModal.jsx` (90L)
```jsx
const NewQuizModal = ({ open, onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  
  const handleCreate = async () => {
    await onCreate({ title });
    onClose();
  };
  
  return (
    <Modal open={open} onClose={onClose}>
      <FormField label="Quiz Title" value={title} onChange={setTitle} />
      <Button onClick={handleCreate}>Create Quiz</Button>
    </Modal>
  );
};
```

**5️⃣ Page Coordinator** → `StudioDashboard.jsx` (170L)
```jsx
const StudioDashboard = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  
  // Handlers (data logic only)
  const handleDelete = async (id) => { /* 15 lines */ };
  const handleClone = async (id) => { /* 12 lines */ };
  const handleCreate = async (data) => { /* 10 lines */ };
  const handleBulkDelete = async () => { /* 8 lines */ };
  
  // Compute filtered/sorted quizzes
  const displayQuizzes = useMemo(() => {
    return quizzes
      .filter(filterFn)
      .sort(sortFn);
  }, [quizzes, filter, sortBy]);
  
  return (
    <div className="page">
      <SubHeader title="My Quizzes" actions={<Button onClick={() => setModalOpen(true)}>New Quiz</Button>} />
      
      <BulkActionsBar 
        selectedCount={selectedIds.size}
        onDelete={handleBulkDelete}
      />
      
      <FilterBar 
        filter={filter}
        sortBy={sortBy}
        onFilterChange={setFilter}
        onSortChange={setSortBy}
      />
      
      <QuizGrid 
        quizzes={displayQuizzes}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onClone={handleClone}
        emptyState={
          <EmptyState 
            icon={BookOpen}
            title="No quizzes yet"
            subtitle="Create your first quiz to get started"
            action={<Button onClick={() => setModalOpen(true)}>Create</Button>}
          />
        }
      />
      
      <NewQuizModal 
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
};
```

---

## 🔄 Refactoring Checklist

### Before extracting component:
- [ ] Identify ONE responsibility
- [ ] Check if it's used in multiple places
- [ ] Does component have too many state properties?
- [ ] Are there 50+ lines of conditional rendering?

### After extracting component:
- [ ] Component takes data + callbacks as props (no direct API calls)
- [ ] Component size < 150 lines
- [ ] Component has clear, self-explanatory prop types
- [ ] Add JSDoc comments explaining purpose
- [ ] Test component in isolation (storybook or demo page)

---

## 🎨 Styling Best Practices

### ❌ DON'T: Inline classes
```jsx
// BAD
<div className="text-lg font-semibold text-gray-900 dark:text-gray-100 space-y-4">
```

### ✅ DO: Use tokens
```jsx
// GOOD (add to components.js)
export const components = {
  myFeature: {
    title: 'text-lg font-semibold text-gray-900 dark:text-gray-100',
    container: 'space-y-4',
  }
};

// Then in component
<div className={`${components.myFeature.container}`}>
  <h2 className={components.myFeature.title}>Title</h2>
</div>
```

---

## 🎬 Animation Pattern

### All animations follow this pattern:
```jsx
import { motion as Motion } from 'framer-motion';

<Motion.div
  initial={{ opacity: 0, y: 20 }}           // Starting state
  animate={{ opacity: 1, y: 0 }}            // Ending state
  exit={{ opacity: 0, y: -20 }}             // Leaving state
  transition={{ duration: 0.3 }}            // Timing
  whileHover={{ y: -4, scale: 1.02 }}      // Interactive
  viewport={{ once: true }}                 // Only animate once when visible
>
  Content
</Motion.div>
```

---

## 📊 State Management by Location

| State | Where | Why |
|-------|-------|-----|
| Form values | Component state | Local UI sync |
| API data (quizzes) | Zustand store | Shared across pages |
| Modal open/close | Page component | Page-level UI state |
| Filters/sorts | Page component OR URL params | Can survive page reload if in URL |
| User auth | Zustand (useAuthStore) | Persistent, app-wide |

---

## 📦 Export Best Practices

### Page barrel export: `pages/index.js`
```jsx
export { default as Home } from './Home.jsx';
export { default as StudioDashboard } from './StudioDashboard.jsx';
// etc.
```

### Component barrel export: `components/organizerDashboard/index.js`
```jsx
export { default as StudioDashboard } from './StudioDashboard.jsx';
export { default as QuizCard } from './QuizCard.jsx';
export { default as QuizGrid } from './QuizGrid.jsx';
export { default as QuizActionsMenu } from './QuizActionsMenu.jsx';
export { default as NewQuizModal } from './NewQuizModal.jsx';
```

---

## ✅ Production Readiness Checklist

- [ ] Component under 150 lines
- [ ] Single responsibility principle
- [ ] Props are documented with JSDoc
- [ ] Loading states handled
- [ ] Error states handled
- [ ] Empty states handled
- [ ] Dark mode supported (via tokens)
- [ ] Animations use Motion with consistent patterns
- [ ] Responsive design tested
- [ ] Accessibility: ARIA labels on interactive elements
- [ ] No console warnings/errors
- [ ] Re-renders optimized (useMemo, useCallback where needed)

---

## 🚀 Next Steps to Apply This

1. **Define which pages/components to refactor** (use priority list below)
2. **Extract one component at a time** (don't refactor everything at once)
3. **Update tests/storybook** for new components
4. **Update imports** in parent components
5. **Add to components barrel export** (index.js)

### Refactoring Priority
1. **CRITICAL** (Start here): StudioDashboard, Billing, OrganizerEdit
2. **HIGH**: Profile, HistoryDetail, History
3. **MEDIUM**: Login, Register, QuizResults
4. **LOW**: Already decent: OrganizerLive, Analytics

---

## 📖 Example Implementation

Use this guide as the canonical reference and implement per feature folder with small, reviewable PRs.
