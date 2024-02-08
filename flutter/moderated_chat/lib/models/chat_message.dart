import 'package:flutter/material.dart';

import 'chat_user.dart';

@immutable
class ChatMessage {
  final int timestamp;
  final String messageType;
  final String message;
  final String sourceLanguage;
  final String username;
  final String id;

  const ChatMessage(this.timestamp, this.messageType, this.message,
      this.sourceLanguage, this.username, this.id);

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      json['timestamp'] as int,
      json['messageType'] as String,
      json['message'] as String,
      json['sourceLanguage'] as String,
      json['user']['username'] as String,
      json['user']['id'] as String,
    );
  }

  Map<String, dynamic> toJson() => {
    'timestamp': timestamp,
    'messageType': messageType,
    'message': message,
    'sourceLanguage': sourceLanguage,
    'username': username,
    'id': id,
  };
}
