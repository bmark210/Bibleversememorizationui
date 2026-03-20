# AnchorSession Refactoring Plan

## 📋 Current State Analysis
- **File Size**: 2300+ lines
- **Issues**:
  - Mixed business logic, UI, API calls, validation
  - Hardcoded question building strategies
  - Large component with multiple responsibilities
  - Complex state management

## 🎯 Refactoring Strategy

### Phase 1: Service Extraction ✅
- [x] `AnchorValidationService.ts` - Text normalization & validation
- [x] `AnchorQuestionBuilderService.ts` - Question building strategies
- [ ] `AnchorSessionStateManager.ts` - State management
- [ ] `AnchorSessionAPI.ts` - API calls isolation

### Phase 2: Component Decomposition
- Split into smaller, focused components:
  - `AnchorQuestionRenderer.tsx` - Display logic
  - `AnchorSessionControls.tsx` - Control buttons
  - `AnchorProgressDisplay.tsx` - Progress indicators
  - Main component - orchestration only

### Phase 3: Type Unification
- Frontend types → align with backend models
- Remove duplication (ReferenceVerse ↔ domain_UserVerse)
- Create shared type definitions

### Phase 4: API Layer Cleanup
- Services use proper typed responses
- Error handling standardization
- Request/response logging

### Phase 5: Testing
- Unit tests for validation
- Integration tests for question building
- E2E tests for session flow

## 📦 New File Structure
```
anchor/
├── services/
│   ├── AnchorValidationService.ts ✅
│   ├── AnchorQuestionBuilderService.ts ✅
│   ├── AnchorSessionAPI.ts
│   ├── AnchorSessionStateManager.ts
│   └── index.ts ✅
├── components/
│   ├── AnchorQuestionRenderer.tsx
│   ├── AnchorSessionControls.tsx
│   ├── AnchorProgressDisplay.tsx
│   └── AnchorTrainingCards.tsx (existing)
├── types/
│   ├── AnchorSession.types.ts
│   └── AnchorQuestion.types.ts
├── hooks/
│   ├── useAnchorSession.ts
│   └── useQuestionState.ts
├── AnchorTrainingSession.tsx (refactored)
└── AnchorSession.tsx (wrapper)
```

## 🔧 Key Changes

### Before:
```typescript
// Mixed concerns in component
function AnchorTrainingSession() {
  // API calls
  // Validation logic
  // State management
  // UI rendering
  // All in one file
}
```

### After:
```typescript
// Clean separation
- Services handle business logic
- Hooks handle state
- Components handle UI only
- Types exported from dedicated files
```

## ✨ Benefits
- ✅ Easier testing
- ✅ Better maintainability
- ✅ Code reusability
- ✅ Clearer responsibilities
- ✅ Easier onboarding for new devs
