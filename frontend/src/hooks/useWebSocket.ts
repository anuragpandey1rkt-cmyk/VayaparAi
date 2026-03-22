'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws'

export function useWebSocket(onMessage?: (data: any) => void) {
    const { accessToken, isAuthenticated } = useAuthStore()
    const wsRef = useRef<WebSocket | null>(null)
    const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>()

    const connect = useCallback(() => {
        if (!isAuthenticated || !accessToken) return

        try {
            const ws = new WebSocket(`${WS_URL}/?token=${accessToken}`)
            wsRef.current = ws

            ws.onopen = () => {
                console.log('WebSocket connected')
            }

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)
                    onMessage?.(data)

                    // Handle document status updates
                    if (data.type === 'document_status') {
                        if (data.status === 'completed') {
                            toast.success(`Document processing complete!`, {
                                description: 'Your document has been analyzed by AI.',
                            })
                        } else if (data.status === 'failed') {
                            toast.error('Document processing failed', {
                                description: data.error || 'Please try uploading again.',
                            })
                        }
                    }
                } catch { }
            }

            ws.onclose = () => {
                console.log('WebSocket disconnected, reconnecting in 5s...')
                reconnectTimeout.current = setTimeout(connect, 5000)
            }

            ws.onerror = (err) => {
                console.error('WebSocket error:', err)
                ws.close()
            }
        } catch (err) {
            console.error('WebSocket connection failed:', err)
        }
    }, [accessToken, isAuthenticated, onMessage])

    useEffect(() => {
        connect()
        // Ping keepalive every 30s
        const pingInterval = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send('ping')
            }
        }, 30000)

        return () => {
            clearInterval(pingInterval)
            clearTimeout(reconnectTimeout.current)
            wsRef.current?.close()
        }
    }, [connect])

    return wsRef.current
}
