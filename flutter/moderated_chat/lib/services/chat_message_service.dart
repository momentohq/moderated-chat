import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:moderated_chat/services/auth_service.dart';
import 'package:momento/momento.dart';

import '../config.dart';
import '../models/chat_message.dart';

class ChatMessageService {
  final UserService _userService;
  late TopicClient _topicClient;
  late CacheClient _cacheClient;
  final StreamController<ChatMessage> _messageController =
      StreamController<ChatMessage>.broadcast();
  TopicSubscription? _currentSubscription;
  late int _expiresAt;

  ChatMessageService._(userService) : _userService = userService;

  static Future<ChatMessageService> create(UserService authService) async {
    final service = ChatMessageService._(authService);
    await service._initializeClients();
    return service;
  }

  Future<void> _initializeClients() async {
    final (apiToken, expiresAt) = await _userService.getApiToken();
    _expiresAt = expiresAt;
    _topicClient = TopicClient(CredentialProvider.fromString(apiToken),
        TopicClientConfigurations.latest());
    _cacheClient = CacheClient(CredentialProvider.fromString(apiToken),
        CacheClientConfigurations.latest(), const Duration(days: 1));
  }

  Stream<ChatMessage> get messages => _messageController.stream;

  Future<bool> publishMessage(String message, String language) async {
    final chatUser = _userService.getUser();
    final chatMessage = ChatMessage(DateTime.now().millisecondsSinceEpoch,
        "text", message, language, chatUser.name, chatUser.id);

    final jsonMessage = jsonEncode(chatMessage.toJson());
    print("sending json message: $jsonMessage");
    final result =
        await _topicClient.publish("moderator", "chat-publish", jsonMessage);
    switch (result) {
      case TopicPublishSuccess():
        print("Successful publish");
        return true;
      case TopicPublishError():
        print("Error on publish: ${result.message}");
        return false;
    }
  }

  Future<void> subscribe(String language) async {
    print("Subscribing to chat-$language");

    unsubscribe();

    final subscribeResult =
        await _topicClient.subscribe("moderator", "chat-$language");
    switch (subscribeResult) {
      case TopicSubscription():
        print("Successful subscription");
        _currentSubscription = subscribeResult;
        subscribeResult.stream.listen((item) {
          switch (item) {
            case TopicSubscriptionItemText():
              try {
                final jsonMessage = jsonDecode(item.value);
                final chatMessage = ChatMessage.fromJson(jsonMessage);
                if (chatMessage.messageType == "text") {
                  print("Received message from stream chat-$language: ${chatMessage.message}");
                } else {
                  print("Received non-text message from stream chat-$language");
                }
                _messageController.sink.add(chatMessage);
              } catch (e) {
                print("Error parsing message: $e");
              }
              break;
            case TopicSubscriptionItemBinary():
              // ignore binary data
              break;
          }
        });
        break;
      case TopicSubscribeError():
        print("Error: ${subscribeResult.message}");
        break;
    }
  }

  void unsubscribe() {
    if (_currentSubscription != null) {
      _currentSubscription!.unsubscribe();
      _currentSubscription = null;
    }
  }

  Future<void> loadMessages(String language) async {
    final apiUrl =
        "${Config.baseUrl}/v1/translate/latestMessages/$language";
    final messages = await http.get(Uri.parse(apiUrl));
    final jsonObject = jsonDecode(messages.body);
    final messagesFromJson = jsonObject['messages'];
    for (var i = 0; i < messagesFromJson.length; i++) {
      final message = messagesFromJson[i];
      final chatMessage = ChatMessage.fromJson(message);
      if (chatMessage.messageType == "text") {
        print("Received message from load: ${chatMessage.message}");
      } else {
        print("Received non-text message from load");
      }
      _messageController.sink.add(chatMessage);
    }
  }

  void dispose() {
    _messageController.close();
    _topicClient.close();
    _cacheClient.close();
  }
}
