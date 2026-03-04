# media-processing

## Description

Provides a comprehensive media processing system with unified fetching, type detection, image processing, and media serving capabilities. Enables secure, efficient handling of media from multiple sources with automatic format optimization and delivery.

## Triggers

- **Use when:** You need to handle media files from various sources, process images, and serve media files securely.
- **Do NOT use when:** You're building a text-only application or when media processing is not required.

## Input

- `media_source`: string | Buffer (Media source: URL, file path, base64 data, or buffer)
- `processing_options`: object (Media processing configuration)
- `server_config`: object (Media server configuration)
- `security_options`: object (Security and validation settings)

## Output

- `media_info`: object (Processed media information)
- `processed_path`: string (Path to processed media)
- `serve_url`: string (URL for media access)
- `status`: boolean (Success status)

## Steps

1. **Fetch Media**: Retrieve media from the specified source (URL, file, base64, or buffer).
2. **Detect Type**: Identify media type using magic numbers and file signatures.
3. **Validate Media**: Check against size limits and allowed types.
4. **Process Media**: Resize, convert, and optimize media based on options.
5. **Store Media**: Save processed media to temporary or permanent storage.
6. **Serve Media**: Make media accessible via built-in server or CDN.
7. **Cleanup**: Remove temporary files and manage storage.

## Failure Strategy

- If media fetch fails, return clear error with retry guidance.
- If type detection fails, reject the media with appropriate error code.
- If processing fails, fallback to original media if possible.
- If storage fails, use alternative storage location.
- If server startup fails, continue with storage-only functionality.

## Key Features

- **Unified Media Fetching**: Single interface for URL, file, base64, and buffer sources
- **Smart Type Detection**: Magic number-based media type identification
- **Image Processing**: Resize, format conversion, and quality optimization
- **Media Server**: Built-in HTTP server for media delivery
- **Security Features**: Path traversal protection and type validation
- **Performance Optimizations**: Streaming, parallel processing, and caching
- **Storage Management**: Temporary file cleanup and disk space monitoring

## Implementation References

- **Media Fetching**: See references/media-processing/fetching.md
- **Image Processing**: See references/media-processing/image-processing.md
- **Media Server**: See references/media-processing/server.md
- **Security Measures**: See references/media-processing/security.md
