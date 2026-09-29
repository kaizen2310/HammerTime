import { io } from 'socket.io-client'

let socket = null

export const connectSocket = () => {
  // Reuse the existing socket instead of creating
  // a new connection every time.
  if (socket) {
    return socket
  }

  const token = localStorage.getItem('token')

  socket = io(import.meta.env.VITE_SOCKET_URL, {
    auth: { token },
  })

  return socket
}

export const getSocket = () => socket

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}