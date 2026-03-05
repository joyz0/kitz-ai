---
name: error-handling
description: Provides a comprehensive error handling system with unified error types, intelligent error categorization, and automated recovery mechanisms. Enables consistent error management, monitoring, and recovery across the entire application.
---

# error-handling

## Description

Provides a comprehensive error handling system with unified error types, intelligent error categorization, and automated recovery mechanisms. Enables consistent error management, monitoring, and recovery across the entire application.

## Triggers

- **Use when:** You need a robust error handling system that provides consistent error management, monitoring, and recovery capabilities.
- **Do NOT use when:** You're building a simple script with minimal error handling requirements or when you prefer to use native error handling without additional abstraction.

## Input

- `error`: object (Error object to handle)
- `options`: object (Error handling options)
- `recovery_strategies`: array (Recovery strategies to apply)
- `monitoring_config`: object (Error monitoring configuration)

## Output

- `handled`: boolean (Whether the error was successfully handled)
- `recovery_attempted`: boolean (Whether recovery was attempted)
- `recovery_successful`: boolean (Whether recovery was successful)
- `metrics`: object (Error handling metrics)
- `errors`: array (Additional errors encountered during handling)

## Steps

1. **Error Classification**: Categorize the error based on type and error code.
2. **Error Handling**: Apply the appropriate error handler based on the error category.
3. **Error Monitoring**: Track the error and update error metrics.
4. **Recovery Attempt**: Apply recovery strategies for retryable errors.
5. **Error Reporting**: Generate error reports and alerts if necessary.
6. **Error Propagation**: Propagate the error if it cannot be handled or recovered.
7. **Cleanup**: Perform any necessary cleanup after error handling.

## Failure Strategy

- If an error handler fails, fall back to the default error handler.
- If recovery strategies fail, log the failure and continue with error propagation.
- If monitoring fails, continue error handling without monitoring.
- If multiple errors occur during handling, handle them sequentially and report all errors.

## Key Features

- **Unified Error Types**: Consistent error structure with error codes and metadata
- **Intelligent Categorization**: Automatic error classification based on type and code
- **Modular Handlers**: Pluggable error handlers for different error categories
- **Automated Recovery**: Retry, fallback, and circuit breaker recovery strategies
- **Comprehensive Monitoring**: Error tracking, metrics collection, and alerting
- **Global Error Handling**: Catch and process uncaught exceptions and unhandled rejections
- **Performance Optimizations**: Buffering, caching, and asynchronous processing

## Implementation References

- **Error Definitions**: See references/error-handling/error-definitions.md
- **Error Handlers**: See references/error-handling/handlers.md
- **Monitoring System**: See references/error-handling/monitoring.md
- **Recovery Strategies**: See references/error-handling/recovery.md
