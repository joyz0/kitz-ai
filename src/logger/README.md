# Logger System

A comprehensive logging and observability system for the Kitz AI project, providing structured logging, subsystem isolation, sensitive information redaction, and diagnostic context.

## Directory Structure

```
src/logger/
├── index.ts         # Module entry point
├── logger.ts        # Core logging functionality
├── redact.ts        # Sensitive data redaction
├── levels.ts        # Log level definitions
├── config.ts        # Configuration management
└── README.md        # This documentation
```

## Features

- **Structured Logging**: JSON-formatted logs for easy parsing and analysis
- **Subsystem Isolation**: Per-module logging with clear subsystem identification
- **Sensitive Data Protection**: Automatic redaction of API keys, tokens, and personal information
- **Diagnostic Context**: Rich context including request IDs, session information, and performance metrics
- **Multiple Outputs**: Support for console, file, and remote logging targets
- **Observability Integration**: Metrics collection and distributed tracing support via OpenTelemetry
- **Log File Management**: Automatic log file rotation and cleanup based on date and size limits
- **Performance Optimizations**: Asynchronous logging and batch processing

## Installation

```bash
pnpm add tslog
```

## Usage

### Basic Logging

```typescript
import { getLogger } from './logger/index.js';

const logger = getLogger();

logger.trace('This is a trace level log');
logger.debug('This is a debug level log');
logger.info('This is an info level log');
logger.warn('This is a warn level log');
logger.error('This is an error level log');
logger.fatal('This is a fatal level log');
```

### Subsystem Logging

```typescript
import { getChildLogger } from './logger/index.js';

// Create a logger for the authentication subsystem
const authLogger = getChildLogger('auth', { service: 'authentication' });

// Create a logger for the database subsystem
const dbLogger = getChildLogger('database', { service: 'postgresql' });

authLogger.info('User login', { userId: '12345', ip: '192.168.1.1' });
dbLogger.debug('Executing query', {
  query: 'SELECT * FROM users WHERE id = ?',
  params: ['12345'],
});
authLogger.error('Login failed', {
  userId: '12345',
  error: 'Invalid password',
});
```

### Sensitive Data Redaction

```typescript
import { getLogger, redactSensitiveText } from './logger/index.js';

const logger = getLogger();

// Sensitive information will be automatically redacted
logger.info('API Request', {
  url: 'https://api.example.com',
  headers: {
    Authorization: 'Bearer sk-1234567890abcdefghijklmnopqrstuvwxyz',
    'X-API-Key': 'api_key_1234567890',
  },
  body: {
    username: 'user123',
    password: 'secret_password',
  },
});

// Directly use the redaction function
const sensitiveText = 'My API Key is sk-1234567890abcdefghijklmnopqrstuvwxyz';
const redactedText = redactSensitiveText(sensitiveText);
console.log('Redacted text:', redactedText);
```

### Custom Log Transports

```typescript
import { getLogger, registerLogTransport } from './logger/index.js';

const logger = getLogger();

// Register a custom transport
const unregister = registerLogTransport((logObj) => {
  // Send logs to a remote service, database, etc.
  console.log('Custom transport:', JSON.stringify(logObj, null, 2));
});

logger.info('Testing custom transport', { test: 'data' });

// Unregister the transport
unregister();
logger.info('This log will not be sent through the custom transport');
```

## Configuration

The logger system can be configured through the main config system. Here's an example configuration:

```json5
{
  logging: {
    level: 'info',
    file: './logs/app.log',
    maxFileBytes: 500000000, // 500 MB
    consoleLevel: 'info',
    consoleStyle: 'pretty',
    redactSensitive: 'tools',
    redactPatterns: [
      '\\b[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD)\\b\\s*[=:]\\s*("\'?)([^\\s"\'\\]+)\\1',
    ],
  },
}
```

### Configuration Options

- **level**: Log level for file output (silent, fatal, error, warn, info, debug, trace)
- **file**: Path to the log file
- **maxFileBytes**: Maximum size of a log file before writes are suppressed
- **consoleLevel**: Log level for console output
- **consoleStyle**: Console output style (pretty, compact, json)
- **redactSensitive**: Sensitive data redaction mode (off, tools)
- **redactPatterns**: Custom regex patterns for sensitive data redaction

## Log File Management

The logger system automatically manages log files:

- **Log Rotation**: Creates new log files based on date
- **Log Cleanup**: Removes log files older than 24 hours
- **Size Limit**: Suppresses writes when log file reaches the configured size limit

## API Reference

### `getLogger(): TsLogger<LogObj>`

Returns the main logger instance.

### `getChildLogger(subsystem: string, bindings?: Record<string, unknown>, opts?: { level?: LogLevel }): TsLogger<LogObj>`

Creates a subsystem-specific logger.

- **subsystem**: Name of the subsystem
- **bindings**: Additional context bindings
- **opts**: Optional settings, including log level

### `redactSensitiveText(text: string, options?: RedactOptions): string`

Redacts sensitive information from text.

- **text**: Text to redact
- **options**: Redaction options

### `registerLogTransport(transport: LogTransport): () => void`

Registers a custom log transport.

- **transport**: Function to handle log objects
- **Returns**: Function to unregister the transport

### `resetLogger(): void`

Resets the logger cache and forces reinitialization.

## Examples

See the `example/logger` directory for more usage examples.

## Integration with Config System

The logger system integrates with the main config system, reading configuration from the `logging` section of the config file.

## Dependencies

- **tslog**: For structured logging
- **Node.js fs/path**: For file system operations
- **Config System**: For configuration management

## License

MIT
