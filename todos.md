# TODOs

## Web Platform
- [ ] Fix web map implementation - Create platform-specific files (map.native.tsx and map.web.tsx) to properly support web platform without react-native-maps dependency
  - Current issue: Web bundler fails when trying to import react-native-maps
  - Solution: Use .native.tsx and .web.tsx file extensions for platform-specific code
  - Priority: Low (mobile is primary use case)
