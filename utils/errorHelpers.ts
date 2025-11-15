/**
 * Error handling utilities
 */

export interface ParsedError {
  message: string
  statusCode: number | null
  data: Record<string, unknown> | null
}

/**
 * Safely extracts error information from unknown error types
 * Handles common error patterns from fetch, axios, and custom errors
 */
export function parseError(error: unknown): ParsedError {
  const errorObj = error && typeof error === 'object' ? error as Record<string, unknown> : {}
  
  // Extract status code from various possible locations
  const response = 'response' in errorObj && typeof errorObj.response === 'object' && errorObj.response 
    ? errorObj.response as Record<string, unknown> 
    : {}
  const responseStatus = 'status' in response && typeof response.status === 'number' ? response.status : null
  const statusCode = 'statusCode' in errorObj && typeof errorObj.statusCode === 'number' ? errorObj.statusCode : null
  
  // Extract message
  const errorMessage = 'message' in errorObj && typeof errorObj.message === 'string' ? errorObj.message : ''
  const dataObj = 'data' in errorObj && typeof errorObj.data === 'object' && errorObj.data 
    ? errorObj.data as Record<string, unknown> 
    : {}
  const dataMessage = 'message' in dataObj && typeof dataObj.message === 'string' ? dataObj.message : ''
  
  return {
    message: dataMessage || errorMessage || 'Erro desconhecido',
    statusCode: responseStatus || statusCode,
    data: Object.keys(dataObj).length > 0 ? dataObj : null,
  }
}

/**
 * Check if error is a rate limit error (HTTP 429)
 */
export function isRateLimitError(error: unknown): boolean {
  const { statusCode } = parseError(error)
  return statusCode === 429
}

/**
 * Get user-friendly error message
 * Optionally provide custom messages for specific status codes
 */
export function getErrorMessage(
  error: unknown,
  defaultMessage = 'Ocorreu um erro. Por favor, tente novamente.',
  customMessages?: Record<number, string>
): string {
  const parsed = parseError(error)
  
  if (parsed.statusCode && customMessages?.[parsed.statusCode]) {
    return customMessages[parsed.statusCode]
  }
  
  if (parsed.statusCode === 429) {
    return 'Você enviou muitas solicitações. Por favor, aguarde alguns minutos antes de tentar novamente.'
  }
  
  return parsed.message || defaultMessage
}
