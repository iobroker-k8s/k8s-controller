# Copilot Instructions for ioBroker k8s Controller

## Project Overview

This is a TypeScript-based Kubernetes controller for managing ioBroker instances in Kubernetes environments. The project follows modern Node.js development practices with a focus on type safety, code quality, and containerized development.

## Architecture & Technologies

- **Language**: TypeScript with strict type checking
- **Runtime**: Node.js 24+ 
- **Build Tool**: esbuild (no bundling, external dependencies)
- **Testing**: Jest with TypeScript support
- **Code Quality**: ESLint v9 (flat config) + Prettier (double quotes)
- **CLI**: yargs for argument parsing
- **Containerization**: Multi-stage Docker builds
- **Development**: DevContainer with k3s, Valkey, and ioBroker

## Code Style & Standards

### TypeScript
- Use strict TypeScript configuration
- Prefer explicit return types for functions
- Use interfaces over type aliases for object shapes
- Enable all strict compiler options

### Code Formatting
- Use Prettier with double quotes (`"singleQuote": false`)
- 100 character line width
- 2 spaces for indentation
- Trailing commas in ES5 contexts

### ESLint Rules
- Use ESLint v9 flat configuration
- Enable TypeScript recommended rules
- Prefer `const` over `let`
- No `var` declarations
- Explicit function return types (warning level)

## File Structure

```
src/                 # Source code
  index.ts          # Main CLI entry point
  __tests__/        # Test files
build/              # Build output (git-ignored)
.devcontainer/      # DevContainer configuration
.github/            # GitHub Actions and templates
```

## Development Guidelines

### Building
- Use esbuild without bundling (`--bundle` flag should NOT be used)
- Target Node.js 24
- Keep external dependencies as external (especially yargs)
- Output to `build/index.js`

### Testing
- Use Jest with TypeScript support
- Mock external dependencies (especially ES modules like yargs)
- Place tests in `__tests__` directories or `.test.ts` files
- Maintain good test coverage

### Dependencies
- Keep production dependencies minimal
- Use exact versions for consistency
- Separate dev dependencies clearly
- No unnecessary Node.js built-in polyfills

### CLI Design
- Use yargs for argument parsing
- Support `--verbose` flag for detailed logging
- Provide helpful `--help` output
- Handle errors gracefully

## DevContainer Services

The development environment includes:
- **app**: Main development container with Node.js 24
- **valkey**: Redis-compatible database with authentication
- **iobroker**: ioBroker instance configured to use Valkey
- **k3s**: Local Kubernetes cluster for testing

### Kubernetes Integration
- kubeconfig available at `/tmp/kubeconfig` via shared volume
- kubectl pre-installed in development container
- k3s cluster accessible on standard ports

## Docker & Deployment

### Dockerfile
- Multi-stage build (builder + production)
- Node.js 24 Alpine base images
- Non-root user (nextjs:nodejs)
- No exposed ports unless specifically needed
- Executable permissions on built files

### GitHub Actions
- Automated testing (lint, format, test, build)
- Docker image building for AMD64 and ARM64
- Publishing to `iobroker-k8s/k8s-controller` on Docker Hub
- Required secrets: `DOCKER_USERNAME`, `DOCKER_PASSWORD`

## Common Patterns

### Error Handling
- Use proper TypeScript error types
- Log errors appropriately with context
- Fail fast for configuration errors
- Graceful degradation where possible

### Logging
- Use console.log for standard output
- Implement verbose logging behind `--verbose` flag
- Include relevant context in log messages
- No debug logging in production builds

### Configuration
- Avoid configuration files initially (keep simple)
- Use environment variables for runtime config
- Validate configuration at startup
- Provide sensible defaults

## What to Avoid

- Don't bundle with esbuild (keep dependencies external)
- Don't expose unnecessary Docker ports
- Don't include unnecessary ESLint globals
- Don't use single quotes (Prettier configured for double quotes)
- Don't add bin entries to package.json unless needed
- Don't add complex configuration options initially

## Testing Strategy

- Unit tests for core functionality
- Mock external dependencies properly
- Test CLI argument parsing
- Integration tests for Kubernetes operations (when implemented)
- Maintain coverage above 70%

## Performance Considerations

- esbuild for fast compilation
- Minimal Docker image layers
- External dependencies to reduce bundle size
- Efficient Kubernetes API usage (when implemented)

## Security

- Non-root Docker user
- Minimal container permissions
- Secure handling of Kubernetes credentials
- No secrets in code or logs