# gateway-design

## Description

Provides a comprehensive WebSocket-based gateway communication protocol with TypeBox schema validation, automatic code generation, and robust connection management. Enables secure, type-safe communication between clients and servers with support for protocol versioning and event broadcasting.

## Triggers

- **Use when:** You need a WebSocket-based communication system with type safety, protocol versioning, and event broadcasting capabilities.
- **Do NOT use when:** You're building a simple HTTP API or when WebSocket communication is not required.

## Input

- `server_config`: object (Gateway server configuration)
- `client_config`: object (Gateway client configuration)
- `protocol_schema`: object (TypeBox schema definitions)
- `authentication`: object (Authentication configuration)

## Output

- `server`: object (Configured gateway server instance)
- `client`: object (Configured gateway client instance)
- `connection_status`: object (Connection status information)
- `protocol_version`: number (Negotiated protocol version)

## Steps

1. **Define Protocol Schema**: Create TypeBox schema definitions for all message types.
2. **Setup Server**: Configure and start the WebSocket server with authentication and rate limiting.
3. **Setup Client**: Configure and connect the WebSocket client with protocol version negotiation.
4. **Establish Connection**: Complete the connection handshake and protocol negotiation.
5. **Message Exchange**: Send and receive messages with schema validation.
6. **Event Handling**: Subscribe to and process server events.
7. **Connection Management**: Handle reconnection, heartbeat, and disconnection scenarios.

## Failure Strategy

- If connection fails, implement automatic reconnection with exponential backoff.
- If protocol negotiation fails, fallback to the highest mutually supported version.
- If message validation fails, reject the message with a clear error code.
- If server errors occur, propagate them to clients with appropriate error codes.

## Key Features

- **Type-Safe Protocol**: TypeBox schema definitions with automatic TypeScript type generation
- **Protocol Versioning**: Client-server version negotiation for backward compatibility
- **Event Broadcasting**: Real-time event distribution to connected clients
- **Authentication**: Secure connection establishment with device pairing
- **Rate Limiting**: Protection against DDoS attacks and abuse
- **Message Validation**: Runtime validation of all incoming and outgoing messages
- **Idempotent Operations**: Support for safe retries of state-changing operations

## Implementation References

- **Protocol Schema**: See references/gateway/schema.md
- **Server Implementation**: See references/gateway/server.md
- **Client Implementation**: See references/gateway/client.md
- **Authentication**: See references/gateway/authentication.md
