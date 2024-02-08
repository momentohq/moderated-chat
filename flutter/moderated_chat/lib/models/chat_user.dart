import 'package:flutter/material.dart';

@immutable
class ChatUser {
  final String name;
  final String id;

  const ChatUser(this.name, this.id);
}
