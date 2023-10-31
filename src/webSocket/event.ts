export enum WebSocketEvent {
  // Websocket events
  connection = 'connection',
  disconnect = 'disconnect',
  connectError = 'connect_error',
  reconnectAttempt = 'reconnect_attempt',

  // Arena events
  applicationError = 'applicationError',
  jobUpdate = 'jobUpdate',
  nodesUpdate = 'nodesUpdate',
  nodesUpdateCompleted = 'nodesUpdateCompleted',
  nodeValidationsUpdate = 'nodeValidationsUpdate',
  recordDelete = 'recordDelete',
  recordSessionExpired = 'recordSessionExpired',
  surveyUpdate = 'surveyUpdate',
  threadError = 'threadError',
}
