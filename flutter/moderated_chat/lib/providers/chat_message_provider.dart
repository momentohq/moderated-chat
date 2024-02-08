import 'package:flutter/material.dart';
import 'package:moderated_chat/models/chat_message.dart';
import 'package:moderated_chat/services/chat_message_service.dart';

class ChatMessageProvider with ChangeNotifier {
  late final ChatMessageService _chatMessageService;
  final List<ChatMessage> _messages = [];
  String currentLanguage = "en";

  List<ChatMessage> get messages => _messages;

  ChatMessageProvider(ChatMessageService chatMessageService) {
    _chatMessageService = chatMessageService;
    _chatMessageService.messages.listen((message) {
      _messages.add(message);
      notifyListeners();
    });
  }

  Future<void> subscribe() async {
    _chatMessageService.loadMessages(currentLanguage);
    _chatMessageService.subscribe(currentLanguage);
  }

  Future<void> publishMessage(String message) async {
    await _chatMessageService.publishMessage(message, currentLanguage);
  }

  void changeLanguage(String language) {
    _chatMessageService.unsubscribe();
    currentLanguage = language;
    _messages.clear();
    notifyListeners();
    subscribe();
  }

  @override
  void dispose() {
    _chatMessageService.dispose();
    super.dispose();
  }
}
