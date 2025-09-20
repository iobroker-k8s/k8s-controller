# ioBroker Kubernetes Controller

A TypeScript-based controller for managing ioBroker instances in Kubernetes environments.

## Development

### Prerequisites

- Node.js 24 or higher
- Docker and Docker Compose
- VS Code with DevContainer support (recommended)

### DevContainer Setup

This project includes a complete DevContainer setup with:

- NodeJS 24 development environment
- Valkey (Redis-compatible) for data storage
- ioBroker instance configured with Valkey
- k3s Kubernetes cluster for local development

To get started:

1. Open the project in VS Code
2. Select "Reopen in Container" when prompted
3. Wait for the DevContainer to build and start all services

The kubectl configuration will be automatically available in the container at `/tmp/kubeconfig`.

### Local Development

```bash
# Install dependencies
npm install

# Build the application
npm run build

# Run the application
node build/index.js

# Run with verbose logging
node build/index.js --verbose

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## Deployment

### GitHub Actions Secrets

The following secrets must be configured in the GitHub repository for the CI/CD pipeline:

| Secret Name | Description | Required |
|-------------|-------------|----------|
| `DOCKER_USERNAME` | Docker Hub username for pushing images | Yes |
| `DOCKER_PASSWORD` | Docker Hub password or access token | Yes |

To configure these secrets:

1. Go to your repository on GitHub
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret with the appropriate value

### Docker Image

The application is automatically built and published to Docker Hub as `iobroker-k8s/k8s-controller` when changes are pushed to the main branch or when tags are created.

### Manual Docker Build

```bash
# Build the Docker image
docker build -t iobroker-k8s/k8s-controller .

# Run the container
docker run iobroker-k8s/k8s-controller --verbose
```

## Architecture

The controller is built using:

- **TypeScript** for type safety and modern JavaScript features
- **esbuild** for fast compilation
- **Jest** for testing
- **ESLint** and **Prettier** for code quality
- **yargs** for CLI argument parsing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure tests pass and code is properly formatted
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.