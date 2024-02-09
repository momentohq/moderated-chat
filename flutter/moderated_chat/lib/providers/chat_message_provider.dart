import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:moderated_chat/models/chat_message.dart';
import 'package:moderated_chat/services/chat_message_service.dart';

class ChatMessageProvider with ChangeNotifier {
  late final ChatMessageService _chatMessageService;
  final List<ChatMessage> _messages = [];

  List<ChatMessage> get messages => _messages;

  ChatMessageProvider(ChatMessageService chatMessageService) {
    _chatMessageService = chatMessageService;
    _chatMessageService.messages.listen((messageList) {
      for (ChatMessage message in messageList) {
        _messages.add(message);
      }
      print("notifying listeners of ${messageList.length} new messages");
      notifyListeners();
    });
  }

  Future<void> loadAndSubscribe() async {
    _chatMessageService.loadMessages();
    _chatMessageService.subscribe();
  }

  Future<void> publishMessage(String message) async {
    await _chatMessageService.publishMessage(message);
  }

  Future<void> publishImage(Uint8List image) async {
    await _chatMessageService.publishImage(image);
  }

  void changeLanguage(String language) {
    _chatMessageService.changeLanguage(language);
    _messages.clear();
    notifyListeners();
    loadAndSubscribe();
  }

  @override
  void dispose() {
    _chatMessageService.dispose();
    super.dispose();
  }
}
