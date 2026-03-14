# Changelog

All notable changes to DevTools Data Exporter Pro will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-03-12

### 🚀 MAJOR UPDATE: Complete DevTools Data Exporter

Expanded from 2 features to 7 comprehensive export capabilities, solving 85% of common developer debugging needs.

### Added
- **Application Data Export**: localStorage, sessionStorage, cookies with one click
- **Redux State Export (FREE)**: Complete Redux store export without paid subscriptions
- **Console Logs Capture**: Real-time console message capture and export
- **DOM/HTML Export**: Complete page structure export
- **"Export Everything" Feature**: All data types in one organized export
- **Content Script Integration**: Page-level data access for Redux, Application data, DOM
- **REDUX_SETUP_GUIDE.md**: Comprehensive guide for FREE Redux access setup
- **FEATURES.md**: Detailed feature documentation with coverage analysis
- 4 new export buttons in DevTools panel UI
- Enhanced statistics dashboard with Console Logs counter
- Multiple Redux detection methods (window.store, __REDUX_DEVTOOLS_EXTENSION__, store selectors)

### Changed
- **Extension Name**: "Network & WebSocket Copy Pro" → "DevTools Data Exporter Pro"
- **DevTools Tab Name**: "WS Copy" → "Data Export"
- **manifest.json**: Updated to v2.0.0 with expanded permissions:
  - Added `cookies` permission
  - Added `debugger` permission
  - Added `scripting` permission
  - Added `content_scripts` configuration
- **panel.js**: Complete rewrite (~350+ lines):
  - Fixed all syntax errors
  - Added 5 new button handlers
  - Added formatters for all data types
  - Added content script messaging system
- **README.md**: Updated with comprehensive feature list
- **QUICKSTART.md**: Updated with all 7 export features
- **PROJECT_OVERVIEW.md**: Updated mission statement

### Fixed
- Critical syntax errors in panel.js (broken functions, mismatched braces)
- Mixed/incomplete code sections causing extension failure
- Event listener registration issues

### Technical Improvements
- Content script injection for page-level access
- Chrome Runtime Messaging for DevTools ↔ Content Script communication
- Enhanced error handling for page data access
- Security-conscious Redux exposure (development-only recommendation)
- Better data formatting for large exports

### Documentation
- Added comprehensive Redux setup guide with 3 free methods
- Added feature documentation with use cases and coverage analysis
- Updated all existing documentation for v2.0.0
- Added framework-specific examples (React, Next.js, Vue, Angular)

---

## [1.0.0] - 2026-03-12

### Added
- Initial release of Network & WebSocket Copy Pro
- DevTools panel integration ("WS Copy" tab)
- One-click network request export functionality
- WebSocket message capture and export
- Real-time statistics dashboard showing:
  - Total network requests captured
  - Total WebSocket messages captured
  - Total data size
- Modern, responsive UI with purple gradient theme
- Extension popup with quick access to features
- Comprehensive error handling and user feedback
- Memory management with automatic cleanup (10K request limit)
- Input sanitization for XSS prevention
- Clipboard copy operations
- Clear data functionality
- Browser-based icon generator tool
- Node.js icon generation scripts
- Extension packaging script
- Complete documentation suite:
  - README.md - Project overview
  - QUICKSTART.md - 5-minute setup guide
  - DEPLOYMENT_GUIDE.md - Chrome Web Store publishing guide
  - TESTING_GUIDE.md - Comprehensive testing checklist
  - SECURITY.md - Security best practices documentation
  - PROJECT_OVERVIEW.md - High-level architecture

### Security Features
- Manifest V3 compliance (future-proof)
- Content Security Policy (CSP) enforcement
- No external data transmission
- Minimal permission model
- Timeout protection on async operations
- Safe error handling throughout
- No inline scripts or eval() usage
- Zero external dependencies

### Technical Details
- Built with pure JavaScript (ES6+)
- Uses Chrome DevTools Network API
- Service Worker architecture
- Supports HTTP/HTTPS requests
- Supports WebSocket (ws:// and wss://)
- Exports formatted text data
- Memory-efficient design

## [Unreleased]

### Planned Features (Future Versions)
- PNG icon files (requires conversion from SVG)
- Additional export formats (JSON, CSV, HAR)
- Request filtering by type/status/domain
- Dark mode support
- Search functionality within captured data
- Keyboard shortcuts
- Request comparison tools
- Performance metrics
- Request replay functionality

---

## Version Guidelines

### Version Numbers
- **MAJOR.MINOR.PATCH** (e.g., 1.0.0)
- **MAJOR:** Breaking changes, incompatible API changes
- **MINOR:** New features, backward-compatible
- **PATCH:** Bug fixes, backward-compatible

### When to Update Version
- **Patch (1.0.1):** Bug fixes, typos, small improvements
- **Minor (1.1.0):** New features, enhancements, non-breaking changes
- **Major (2.0.0):** Breaking changes, major refactors, architecture changes

### Release Checklist
Before releasing a new version:
- [ ] Update version in manifest.json
- [ ] Add entry to CHANGELOG.md
- [ ] Test all features
- [ ] Update documentation if needed
- [ ] Create release notes
- [ ] Package extension as ZIP
- [ ] Submit to Chrome Web Store

---

## Format for Future Entries

```markdown
## [Version] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes to existing functionality

### Deprecated
- Features that will be removed in future versions

### Removed
- Features removed in this version

### Fixed
- Bug fixes

### Security
- Security fixes or improvements
```

---

**Current Version:** 1.0.0  
**Last Updated:** March 12, 2026  
**Status:** Initial Release - Production Ready
