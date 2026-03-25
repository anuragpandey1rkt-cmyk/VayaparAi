import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function useWebSockets() {
    const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')
    const ws = useRef<WebSocket | null>(null)
    const queryClient = useQueryClient()

    useEffect(() => {
        const token = localStorage.getItem('access_token')
        if (!token) return

        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const wsUrl = `${API_BASE.replace('http', 'ws')}/ws/?token=${token}`

        const connect = () => {
            setStatus('connecting')
            const socket = new WebSocket(wsUrl)
            ws.current = socket

            socket.onopen = () => {
                setStatus('connected')
                console.log('✅ WebSocket connected')
            }

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)
                    console.log('📩 WebSocket message:', data)

                    if (data.type === 'DOCUMENT_STATUS_UPDATE') {
                        // Invalidate queries to refresh UI
                        queryClient.invalidateQueries({ queryKey: ['documents'] })
                        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })

                        if (data.status === 'completed') {
                            toast.success('Document processed!', {
                                description: 'Refresh the page to see the latest analysis.'
                            })
                        } else if (data.status === 'failed') {
                            toast.error('Processing failed', {
                                description: data.detail || 'An error occurred during AI analysis.'
                            })
                        }
                    }
                } catch (e) {
                    console.error('Failed to parse WS message:', e)
                }
            }

            socket.onclose = () => {
                setStatus('disconnected')
                console.log('❌ WebSocket disconnected. Retrying in 5s...')
                setTimeout(connect, 5000)
            }

            socket.onerror = (error) => {
                console.error('WebSocket error:', error)
                socket.close()
            }
        }

        connect()

        return () => {
            if (ws.current) {
                ws.current.close()
            }
        }
    }, [queryClient])

    return { status }
}
