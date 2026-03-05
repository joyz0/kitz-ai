# logger-design

## Description

Provides a comprehensive logging and observability system with structured logging, subsystem isolation, sensitive information redaction, and diagnostic context. Enables effective monitoring, debugging, and performance tracking across the entire application.

## Triggers

- **Use when:** You need a robust logging system with structured output, sensitive data protection, and observability capabilities.
- **Do NOT use when:** You're building a simple script with minimal logging needs or when you prefer to use console.log directly.

## Input

- `log_config`: object (Logging configuration settings)
- `subsystem`: string (Subsystem name for log isolation)
- `message`: string (Log message content)
- `context`: object (Additional context for the log entry)
- `level`: string (Log level: debug, info, warn, error, verbose)

## Output

- `log_entry`: object (Formatted log entry)
- `status`: boolean (Success status)
- `metrics`: object (Optional observability metrics)

## Steps

1. **Initialize Logger**: Create a subsystem-specific logger with configured settings.
2. **Process Log Entry**: Format the log message with timestamp, level, and subsystem.
3. **Redact Sensitive Data**: Apply redaction rules to protect sensitive information.
4. **Add Context**: Include diagnostic context such as request IDs and performance metrics.
5. **Output Logs**: Write logs to configured targets (console, file, remote).
6. **Collect Metrics**: Gather observability metrics if enabled.
7. **Handle Errors**: Ensure logging system itself doesn't fail.

## Failure Strategy

- If log output fails, fall back to alternative output targets.
- If redaction fails, continue logging but flag the issue.
- If metrics collection fails, continue logging without metrics.
- If configuration is invalid, use safe defaults to ensure logging continues.

## Key Features

- **Structured Logging**: JSON-formatted logs for easy parsing and analysis
- **Subsystem Isolation**: Per-module logging with clear subsystem identification
- **Sensitive Data Protection**: Automatic redaction of API keys, tokens, and personal information
- **Diagnostic Context**: Rich context including request IDs, session information, and performance metrics
- **Multiple Outputs**: Support for console, file, and remote logging targets
- **Observability Integration**: Metrics collection and distributed tracing support
- **Performance Optimizations**: Asynchronous logging and batch processing

## Implementation References

- **Logger Implementation**: See references/logger/implementation.md
- **Redaction Rules**: See references/logger/redaction.md
- **Observability Setup**: See references/logger/observability.md
- **Configuration Examples**: See references/logger/configuration.md
