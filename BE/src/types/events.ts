export enum ChatEvent {
  REGISTER = "register",
  MESSAGE_NEW = "chat:message:new",
  MESSAGE_ACK = "chat:message:ack",
  MESSAGE_FORWARD = "chat:message:forward",
  MESSAGE_DELIVERED = "chat:message:delivered",
  MESSAGE_READ = "chat:message:read",
  MESSAGE_STATUS = "chat:message:status",
}
