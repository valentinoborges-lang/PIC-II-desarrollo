export class WebSocketManager {
  constructor({ onMeasurement, onStateChange, reconnectDelay = 3000 }) {
    this.onMeasurement = onMeasurement;
    this.onStateChange = onStateChange;
    this.reconnectDelay = reconnectDelay;
    this.connections = new Map();
  }

  connect({ name, url }, existingId = null) {
    const id = existingId || `ws-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const previous = this.connections.get(id);
    if (previous?.reconnectTimer) clearTimeout(previous.reconnectTimer);
    if (previous?.socket) { previous.manuallyClosed = true; previous.socket.close(); }
    const connection = { id, name, url, status: 'connecting', socket: null, reconnectTimer: null, manuallyClosed: false };
    this.connections.set(id, connection);
    this.notify();
    try {
      const socket = new WebSocket(url);
      connection.socket = socket;
      socket.addEventListener('open', () => { connection.status = 'connected'; connection.manuallyClosed = false; this.notify(); });
      socket.addEventListener('message', (event) => {
        try {
          const payload = JSON.parse(event.data);
          (Array.isArray(payload) ? payload : [payload]).forEach((measurement) => this.onMeasurement?.(measurement));
        } catch (error) { console.warn('Mensaje WebSocket descartado: JSON no válido.', error); }
      });
      socket.addEventListener('close', () => {
        connection.status = 'disconnected'; connection.socket = null; this.notify();
        if (!connection.manuallyClosed) this.scheduleReconnect(id);
      });
      socket.addEventListener('error', () => { connection.status = 'disconnected'; this.notify(); });
    } catch {
      connection.status = 'disconnected'; this.notify(); this.scheduleReconnect(id);
    }
    return id;
  }

  scheduleReconnect(id) {
    const connection = this.connections.get(id);
    if (!connection || connection.manuallyClosed || connection.reconnectTimer) return;
    connection.reconnectTimer = setTimeout(() => {
      connection.reconnectTimer = null;
      this.connect({ name: connection.name, url: connection.url }, id);
    }, this.reconnectDelay);
  }

  disconnect(id) {
    const connection = this.connections.get(id);
    if (!connection) return;
    connection.manuallyClosed = true;
    clearTimeout(connection.reconnectTimer);
    connection.reconnectTimer = null;
    connection.socket?.close();
    connection.socket = null;
    connection.status = 'disconnected';
    this.notify();
  }

  reconnect(id) {
    const connection = this.connections.get(id);
    if (connection) this.connect({ name: connection.name, url: connection.url }, id);
  }

  getConnections() {
    return [...this.connections.values()].map(({ socket, reconnectTimer, manuallyClosed, ...publicConnection }) => publicConnection);
  }

  notify() { this.onStateChange?.(this.getConnections()); }
}
